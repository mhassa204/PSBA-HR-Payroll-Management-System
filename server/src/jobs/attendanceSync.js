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
};

let running = { push: false, pull: false }; // simple in-process locks

const PK_OFFSET_MS = 5 * 3600 * 1000; // Pakistan is UTC+5

// Normalized attendance day (UTC midnight of the punch's PK-local calendar date),
// matching how existing ZKTeco rows store attendanceDate.
function pkAttendanceDate(ts) {
  const pk = new Date(ts.getTime() + PK_OFFSET_MS);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()));
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
        const cnic = String(r.cnic || "").replace(/\D/g, "");
        if (!cnic || r.sourceId == null) continue;
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
        // Idempotent on the droplet's row id (source_id @unique).
        await prisma.attendance.upsert({
          where: { source_id: r.sourceId },
          create: data,
          update: data,
        });
        totalUpserted++;
      }

      cursor = Number(resp.nextCursor) || cursor;
      await setSetting(SETTING.cursor, { cursor }); // persist after each page
      pages++;
      if (!resp.hasMore) break;
    }

    if (totalUpserted) {
      console.log(`[attendanceSync] pulled attendance: ${totalUpserted} record(s), cursor=${cursor}`);
    }
    return { upserted: totalUpserted, cursor };
  } catch (e) {
    console.error("[attendanceSync] pullAttendance failed:", e.message);
    return { error: e.message };
  } finally {
    running.pull = false;
  }
}

// ---------- 3. Retention: keep a rolling N-month backup ----------
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
  cron.schedule(CONFIG.reconcileCron, () => pushEmployees({ full: true }));
  cron.schedule(CONFIG.pullCron, () => pullAttendance());
  cron.schedule(CONFIG.pruneCron, () => pruneBackup());

  console.log(
    `[attendanceSync] started → ${CONFIG.apiUrl} | push ${CONFIG.pushCron}, reconcile ${CONFIG.reconcileCron}, pull ${CONFIG.pullCron}, prune ${CONFIG.pruneCron} (${CONFIG.backupMonths}mo)`
  );

  // Initial catch-up shortly after boot (covers any downtime while HR was off).
  setTimeout(() => {
    pushEmployees({ full: true }).then(() => pullAttendance());
  }, 8000);
}

module.exports = {
  startAttendanceSync,
  pushEmployees,
  pullAttendance,
  pruneBackup,
  CONFIG,
};
