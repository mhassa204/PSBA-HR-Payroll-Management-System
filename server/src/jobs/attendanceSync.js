/**
 * Two-way sync between the HR system (this on-prem app, system of record for
 * EMPLOYEES) and the face-recognition Attendance System (DigitalOcean droplet,
 * system of record for ATTENDANCE).
 *
 *   1. pushEmployees() — HR -> droplet. Keeps the droplet's employee mirror fresh
 *      so tablets always read current roster data even while HR is offline.
 *   2. pullAttendance() — droplet -> HR. Mirrors punches into FaceAttendance using
 *      a monotonic id cursor, so a long HR outage self-heals on the next run.
 *   3. pruneBackup() — keeps FaceAttendance to a rolling N-month window (default 3).
 *
 * HR is the CLIENT in both directions; the always-on droplet is a pure server and
 * never needs to reach into the on-prem network.
 *
 * Enable by setting ATTENDANCE_SYNC_ENABLED=true plus ATTENDANCE_API_URL and
 * ATTENDANCE_API_TOKEN in the HR server .env.
 */
const cron = require("node-cron");
const prisma = require("../utils/prisma");

const CONFIG = {
  enabled: String(process.env.ATTENDANCE_SYNC_ENABLED || "").toLowerCase() === "true",
  // e.g. http://139.59.122.254/api  (the droplet's nginx proxies /api -> server)
  apiUrl: (process.env.ATTENDANCE_API_URL || "").replace(/\/+$/, ""),
  token: process.env.ATTENDANCE_API_TOKEN || "",
  backupMonths: Number(process.env.ATTENDANCE_BACKUP_MONTHS) || 3,
  pushCron: process.env.ATTENDANCE_PUSH_CRON || "*/10 * * * *", // every 10 min (incremental)
  pullCron: process.env.ATTENDANCE_PULL_CRON || "*/10 * * * *", // every 10 min (incremental)
  reconcileCron: process.env.ATTENDANCE_RECONCILE_CRON || "30 1 * * *", // 01:30 daily (full push)
  pruneCron: process.env.ATTENDANCE_PRUNE_CRON || "0 2 * * *", // 02:00 daily (retention)
  pushTimeoutMs: 60000,
  pullPageLimit: 1000,
};

const SETTING = {
  cursor: "attendance_sync.cursor", // last Attendance.id pulled from droplet
  employeePushAt: "attendance_sync.employee_push_at", // last successful incremental push (ISO)
  rosterPush: "attendance_sync.roster_push", // { watermark } of last pushed approved-roster state
  updatedSince: "attendance_sync.updated_since", // last droplet correction (edit/delete) mirrored
};

let running = { push: false, pull: false, rosters: false }; // simple in-process locks

// Normalized attendance day: UTC midnight of the punch's PK calendar date.
// Droplet timestamps are ALREADY PK-wall-clock-labelled-UTC (a 20:42 PK punch
// is stored as 20:42Z), so the calendar day is simply the UTC date of the
// timestamp — adding a +5h offset here double-counts the timezone and files
// every punch after 19:00 PK under the NEXT day (evening checkouts vanished
// from their real day in all HR attendance views).
function pkAttendanceDate(ts) {
  return new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate()));
}

// ---------- SystemSetting helpers (watermark storage) ----------
async function getSetting(key) {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}

async function setSetting(key, value) {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, category: "integration", value },
    update: { value },
  });
}

// ---------- HTTP helper ----------
async function apiFetch(path, options = {}) {
  if (!CONFIG.apiUrl) throw new Error("ATTENDANCE_API_URL not configured");
  const url = `${CONFIG.apiUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.pushTimeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": CONFIG.token,
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Map an HR employee (+ current employment) to droplet payload ----------
function mapEmployee(emp) {
  // Soft-deleted employees have their cnic masked as "<cnic>__DEL__<suffix>"
  // (see utils/softDeleteUtil). Unmask before normalizing so a deleted employee
  // deactivates the REAL droplet record instead of creating a junk long-cnic row.
  const cnic = String(emp.cnic || "").split("__DEL__")[0].replace(/\D/g, "");
  const job = emp.employmentRecords && emp.employmentRecords[0]; // current employment
  const departmentName = job?.department?.name || job?.department_text || null;
  const designationName = job?.designation?.title || job?.designation_text || null;
  const inactive = emp.is_deleted || (emp.status && emp.status !== "Active");
  // Org hierarchy (District -> City -> Location). Prefer the workplace location's city/district;
  // fall back to the employee's own linked refs, then the legacy string columns.
  const loc = job?.location;
  const cityName = loc?.city?.name || emp.cityRef?.name || emp.city || null;
  const districtName = loc?.district?.name || emp.districtRef?.name || emp.district || null;
  const cityIdRaw = loc?.city_id ?? emp.city_id;
  const districtIdRaw = loc?.district_id ?? emp.district_id;
  return {
    cnic,
    employeeId: `emp_${cnic}`,
    fullName: emp.full_name || "Unknown",
    status: inactive ? "Inactive" : "Active",
    departmentId: job?.department_id != null ? String(job.department_id) : null,
    departmentName,
    designationId: job?.designation_id != null ? String(job.designation_id) : null,
    designationName,
    gradeScale: job?.scale_grade?.name || null,
    locationType: job?.location?.type ? String(job.location.type).toLowerCase() : null,
    workplaceName: job?.location?.name || job?.office_location || null,
    locationId: job?.location_id != null ? String(job.location_id) : null,
    cityId: cityIdRaw != null ? String(cityIdRaw) : null,
    cityName,
    districtId: districtIdRaw != null ? String(districtIdRaw) : null,
    districtName,
  };
}

const EMPLOYEE_INCLUDE = {
  cityRef: true,
  districtRef: true,
  employmentRecords: {
    where: { is_current: true, is_deleted: false },
    take: 1,
    include: {
      department: true,
      designation: true,
      scale_grade: true,
      location: { include: { city: true, district: true } },
    },
  },
};

// ---------- 1. Push employees HR -> droplet ----------
async function pushEmployees({ full = false } = {}) {
  if (running.push) {
    console.log("[attendanceSync] push already running, skipping");
    return { skipped: true };
  }
  running.push = true;
  try {
    let where;
    if (full) {
      where = {}; // entire roster, incl. soft-deleted (sent as Inactive)
    } else {
      const last = await getSetting(SETTING.employeePushAt);
      const since = last?.at ? new Date(last.at) : new Date(0);
      where = {
        OR: [
          { updatedAt: { gt: since } },
          { employmentRecords: { some: { updatedAt: { gt: since } } } },
        ],
      };
    }

    const startedAt = new Date();
    const employees = await prisma.employee.findMany({ where, include: EMPLOYEE_INCLUDE });
    // Dedupe by cnic — if a cnic appears both Active and Inactive (e.g. a rehire
    // after a soft-deleted record), the Active one wins so we never wrongly
    // deactivate a current employee.
    const byCnic = new Map();
    for (const e of employees.map(mapEmployee)) {
      if (!e.cnic) continue;
      const prev = byCnic.get(e.cnic);
      if (!prev || (prev.status === "Inactive" && e.status === "Active")) {
        byCnic.set(e.cnic, e);
      }
    }
    const payload = Array.from(byCnic.values());

    if (!payload.length) {
      if (full) console.log("[attendanceSync] full reconcile: no employees to push");
      await setSetting(SETTING.employeePushAt, { at: startedAt.toISOString() });
      return { pushed: 0, full };
    }

    // Chunk small enough to stay under the droplet's default 100KB JSON body limit.
    const CHUNK = 150;
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const batch = payload.slice(i, i + CHUNK);
      const resp = await apiFetch("/admin/employees/sync", {
        method: "POST",
        body: JSON.stringify({ employees: batch }),
      });
      created += resp?.created || 0;
      updated += resp?.updated || 0;
      failed += resp?.failed || 0;
    }

    // Advance the incremental watermark only after a clean push, so anything that
    // failed gets retried next tick (and the nightly full reconcile is the backstop).
    if (failed === 0) {
      await setSetting(SETTING.employeePushAt, { at: startedAt.toISOString() });
    }
    console.log(
      `[attendanceSync] pushed employees: ${payload.length} (created ${created}, updated ${updated}, failed ${failed}, full=${full})`
    );
    return { pushed: payload.length, created, updated, failed, full };
  } catch (e) {
    console.error("[attendanceSync] pushEmployees failed:", e.message);
    return { error: e.message };
  } finally {
    running.push = false;
  }
}

// ---------- 2. Pull attendance droplet -> HR ----------
// Mirror one exported punch into the local Attendance backup (idempotent on
// the droplet's row id — source_id @unique — so re-pulls and edits both land
// as clean overwrites with no history or "modified" markers).
async function upsertPulledRecord(r) {
  const cnic = String(r.cnic || "").replace(/\D/g, "");
  if (!cnic || r.sourceId == null) return false;
  const ts = r.timestamp ? new Date(r.timestamp) : new Date();
  const data = {
    source_id: r.sourceId,
    cnic,
    name: r.name ?? null,
    timestamp: ts,
    attendanceDate: pkAttendanceDate(ts),
    type: r.punchType === "CHECK_OUT" ? "OUT" : "IN",
    verify_mode: r.verifyMode ?? null,
    auth_method: r.authMethod ?? null,
    score: r.score ?? null,
    punch_source: r.source ?? null,
    source_device_id: r.deviceId ?? null,
  };
  await prisma.attendance.upsert({
    where: { source_id: r.sourceId },
    create: data,
    update: data,
  });
  return true;
}

async function pullAttendance() {
  if (running.pull) {
    console.log("[attendanceSync] pull already running, skipping");
    return { skipped: true };
  }
  running.pull = true;
  try {
    const stored = await getSetting(SETTING.cursor);
    let cursor = Number(stored?.cursor) || 0;
    let totalUpserted = 0;
    let pages = 0;

    // Drain all available pages so a long outage backfills in one run.
    // Cap pages per run as a safety valve; remaining data is picked up next tick.
    while (pages < 500) {
      const resp = await apiFetch(
        `/admin/attendance/export?cursor=${cursor}&limit=${CONFIG.pullPageLimit}`
      );
      const records = Array.isArray(resp?.records) ? resp.records : [];
      if (!records.length) break;

      for (const r of records) {
        if (await upsertPulledRecord(r)) totalUpserted++;
      }

      cursor = Number(resp.nextCursor) || cursor;
      await setSetting(SETTING.cursor, { cursor }); // persist after each page
      pages++;
      if (!resp.hasMore) break;
    }

    // Corrections pass: punches edited or deleted on the droplet (the
    // attendance-control workbench) after our last look. Edits overwrite the
    // mirror row in place; deletions remove it — reports simply reflect the
    // corrected data.
    let corrected = 0;
    let removed = 0;
    const uw = await getSetting(SETTING.updatedSince);
    let updatedSince = uw?.at || null;
    if (!updatedSince) {
      // First run after this feature ships: start from now — everything up to
      // this moment is already covered by the full insert pull above.
      updatedSince = new Date().toISOString();
      await setSetting(SETTING.updatedSince, { at: updatedSince });
    }
    let cPages = 0;
    while (cPages < 50) {
      const resp = await apiFetch(
        `/admin/attendance/export?updatedSince=${encodeURIComponent(updatedSince)}&limit=${CONFIG.pullPageLimit}`
      );
      const updated = Array.isArray(resp?.updated) ? resp.updated : [];
      const deletedIds = (Array.isArray(resp?.deletedIds) ? resp.deletedIds : []).filter(
        (n) => Number.isFinite(Number(n))
      );
      if (!updated.length && !deletedIds.length) break;

      for (const r of updated) {
        if (await upsertPulledRecord(r)) corrected++;
      }
      if (deletedIds.length) {
        const { count } = await prisma.attendance.deleteMany({
          where: { source_id: { in: deletedIds.map(Number) } },
        });
        removed += count;
      }

      updatedSince = resp.nextUpdatedSince || updatedSince;
      await setSetting(SETTING.updatedSince, { at: updatedSince });
      cPages++;
      if (!resp.hasMore) break;
    }

    if (totalUpserted || corrected || removed) {
      console.log(
        `[attendanceSync] pulled attendance: ${totalUpserted} new, ${corrected} corrected, ${removed} removed, cursor=${cursor}`
      );
    }
    return { upserted: totalUpserted, corrected, removed, cursor };
  } catch (e) {
    console.error("[attendanceSync] pullAttendance failed:", e.message);
    return { error: e.message };
  } finally {
    running.pull = false;
  }
}

// ---------- 3. Push duty rosters HR -> droplet ----------
// Materializes approved duty rosters into per-employee per-date schedule rows
// over a rolling window (today-7 .. today+35) and pushes them so the attendance
// dashboard judges late/absent against real rosters. Only ROSTER-covered days
// are sent — the droplet applies the 09:15-17:00 default for everything else.
// The window is pushed in self-contained 7-day sub-windows (the endpoint has
// replace-window semantics, so each call fully owns its date range).
async function pushRosters({ force = false } = {}) {
  if (running.rosters) {
    console.log("[attendanceSync] roster push already running, skipping");
    return { skipped: true };
  }
  running.rosters = true;
  try {
    const {
      buildScheduleResolver,
      toDateOnly,
      addDays,
      formatYMD,
    } = require("../services/rosterScheduleService");

    // Cheap change detection: skip when no approved roster changed since last push.
    const latest = await prisma.dutyRoster.findFirst({
      where: { is_deleted: false, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    const watermark = latest?.updatedAt ? latest.updatedAt.toISOString() : "none";
    const last = await getSetting(SETTING.rosterPush);
    if (!force && last?.watermark === watermark) {
      return { skipped: "unchanged" };
    }

    const today = toDateOnly(new Date());
    const windowStart = addDays(today, -7);
    const windowEnd = addDays(today, 35);

    const employments = await prisma.employment.findMany({
      where: {
        is_current: true,
        is_deleted: false,
        employee: { is_deleted: false, status: "Active" },
      },
      select: { employee: { select: { id: true, cnic: true } } },
    });
    const emps = employments
      .map((r) => ({ id: r.employee.id, cnic: String(r.employee.cnic || "").replace(/\D/g, "") }))
      .filter((e) => e.cnic);

    const resolver = await buildScheduleResolver(
      emps.map((e) => e.id),
      windowStart,
      windowEnd
    );

    let totalRows = 0;
    for (let subStart = new Date(windowStart); subStart <= windowEnd; subStart = addDays(subStart, 7)) {
      let subEnd = addDays(subStart, 6);
      if (subEnd > windowEnd) subEnd = new Date(windowEnd);

      const schedules = [];
      for (const emp of emps) {
        for (let d = new Date(subStart); d <= subEnd; d = addDays(d, 1)) {
          const day = resolver.resolveDay(emp.id, d);
          if (day.source !== "ROSTER") continue;
          schedules.push({
            cnic: emp.cnic,
            date: formatYMD(d),
            start: day.kind === "time" ? day.time_from : null,
            end: day.kind === "time" ? day.time_to : null,
            off: day.kind === "weekly_off",
            source: "ROSTER",
          });
        }
      }

      await apiFetch("/admin/rosters/sync", {
        method: "POST",
        body: JSON.stringify({
          window: { start: formatYMD(subStart), end: formatYMD(subEnd) },
          schedules,
        }),
      });
      totalRows += schedules.length;
    }

    await setSetting(SETTING.rosterPush, { watermark, at: new Date().toISOString() });
    console.log(
      `[attendanceSync] pushed rosters: ${totalRows} schedule row(s) over ${formatYMD(windowStart)}..${formatYMD(windowEnd)}`
    );
    return { pushed: totalRows };
  } catch (e) {
    console.error("[attendanceSync] pushRosters failed:", e.message);
    return { error: e.message };
  } finally {
    running.rosters = false;
  }
}

// ---------- 4. Retention: keep a rolling N-month backup ----------
async function pruneBackup() {
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - CONFIG.backupMonths);
    // Rolling backup: drop attendance older than the retention window.
    const { count } = await prisma.attendance.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    if (count) console.log(`[attendanceSync] pruned ${count} record(s) older than ${CONFIG.backupMonths} months`);
    return { pruned: count, cutoff };
  } catch (e) {
    console.error("[attendanceSync] pruneBackup failed:", e.message);
    return { error: e.message };
  }
}

// ---------- Scheduler ----------
function startAttendanceSync() {
  if (!CONFIG.enabled) {
    console.log("[attendanceSync] disabled (set ATTENDANCE_SYNC_ENABLED=true to enable)");
    return;
  }
  if (!CONFIG.apiUrl || !CONFIG.token) {
    console.warn("[attendanceSync] ATTENDANCE_API_URL / ATTENDANCE_API_TOKEN missing — sync NOT started");
    return;
  }

  cron.schedule(CONFIG.pushCron, () => pushEmployees({ full: false }));
  cron.schedule(CONFIG.pushCron, () => pushRosters()); // watermark-gated: cheap no-op when rosters unchanged
  cron.schedule(CONFIG.reconcileCron, () => pushEmployees({ full: true }));
  cron.schedule(CONFIG.reconcileCron, () => pushRosters({ force: true })); // nightly full refresh (rolls the window)
  cron.schedule(CONFIG.pullCron, () => pullAttendance());
  cron.schedule(CONFIG.pruneCron, () => pruneBackup());

  console.log(
    `[attendanceSync] started → ${CONFIG.apiUrl} | push ${CONFIG.pushCron}, reconcile ${CONFIG.reconcileCron}, pull ${CONFIG.pullCron}, prune ${CONFIG.pruneCron} (${CONFIG.backupMonths}mo)`
  );

  // Initial catch-up shortly after boot (covers any downtime while HR was off).
  setTimeout(() => {
    pushEmployees({ full: true })
      .then(() => pullAttendance())
      .then(() => pushRosters({ force: true }));
  }, 8000);
}

module.exports = {
  startAttendanceSync,
  pushEmployees,
  pullAttendance,
  pushRosters,
  pruneBackup,
  CONFIG,
};
