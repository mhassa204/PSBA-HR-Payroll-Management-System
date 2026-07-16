const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Single source of truth for resolving an employee's duty schedule on a date.
// Used by: attendanceController (locationAgainstRoster, locationLSR),
// payrollService (getEmployeePayrollDetails) and the roster module itself.
//
// Rules:
// - Only APPROVED, non-deleted rosters count.
// - Rosters may overlap by design (corrections supersede): for any date the
//   applicable roster is the one most recently APPROVED (approved_at; legacy
//   rows fall back to updatedAt via the backfill script / effectiveApprovalTime).
// - HQ employees (current employment at a HEAD_OFFICE location) with no
//   applicable roster entry default to 09:15-17:00 Mon-Fri, Sat/Sun weekly off,
//   from HQ_DEFAULT_EFFECTIVE_FROM onward (guards historical payroll re-runs).

// Start of the first payroll cycle where the HQ default applies (21 Jun 2026).
const HQ_DEFAULT_EFFECTIVE_FROM = new Date(Date.UTC(2026, 5, 21));
const HQ_DEFAULT_TIME = Object.freeze({ time_from: "09:15", time_to: "17:00" });

function toDateOnly(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt;
}

function formatYMD(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayName(d) {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][d.getUTCDay()];
}

function effectiveApprovalTime(roster) {
  return roster.approved_at || roster.updatedAt || roster.createdAt;
}

// valid_to is null for PERMANENT rosters (open-ended)
function rosterCoversDate(roster, date) {
  return (
    roster.valid_from <= date &&
    (roster.valid_to == null || roster.valid_to >= date)
  );
}

// candidates: array of { roster, entry }. Returns the pair whose roster covers
// the date and was approved last (tie-break: higher roster id).
function pickApplicable(candidates, date) {
  let best = null;
  for (const cand of candidates) {
    if (!rosterCoversDate(cand.roster, date)) continue;
    if (!best) {
      best = cand;
      continue;
    }
    const a = effectiveApprovalTime(cand.roster);
    const b = effectiveApprovalTime(best.roster);
    if (a > b || (a.getTime() === b.getTime() && cand.roster.id > best.roster.id)) {
      best = cand;
    }
  }
  return best;
}

// Interpret one entry's day_schedules JSON for a given date.
// Returns { kind: 'time'|'weekly_off'|'offsite', time_from, time_to, offsite_location }.
function interpretDaySchedules(daySchedules, date) {
  const sched = daySchedules || {};
  const dayInfo = sched[dayName(date)] || { type: "time", time_from: null, time_to: null };

  const cwo = sched._collective_weekly_off || { enabled: false, from: null, to: null };
  const withinCwo =
    cwo.enabled &&
    cwo.from &&
    cwo.to &&
    toDateOnly(cwo.from) <= date &&
    toDateOnly(cwo.to) >= date;

  if (withinCwo || dayInfo?.type === "weekly_off") {
    return { kind: "weekly_off", time_from: null, time_to: null, offsite_location: null };
  }
  if (dayInfo?.type === "offsite") {
    const offsite_location =
      dayInfo.location_name ||
      dayInfo.location ||
      dayInfo.offsite_location ||
      dayInfo.site ||
      dayInfo.place ||
      dayInfo.name ||
      null;
    return { kind: "offsite", time_from: null, time_to: null, offsite_location };
  }
  return {
    kind: "time",
    time_from: dayInfo?.time_from || null,
    time_to: dayInfo?.time_to || null,
    offsite_location: null,
  };
}

function hqDefaultDay(date) {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) {
    return { kind: "weekly_off", time_from: null, time_to: null, offsite_location: null };
  }
  return { kind: "time", ...HQ_DEFAULT_TIME, offsite_location: null };
}

/**
 * Build a per-employee, per-date schedule resolver over [start, end]
 * (UTC-midnight Dates). Entry-based roster lookup: any approved roster naming
 * the employee counts, regardless of scope — this keeps mid-cycle transfers
 * correct and makes stale entries harmless.
 */
async function buildScheduleResolver(employeeIds, start, end, opts = {}) {
  const db = opts.prisma || prisma;
  const ids = [...new Set((employeeIds || []).map(Number).filter(Boolean))];

  const rosters = ids.length
    ? await db.dutyRoster.findMany({
        where: {
          is_deleted: false,
          status: "APPROVED",
          valid_from: { lte: end },
          OR: [{ valid_to: null }, { valid_to: { gte: start } }],
          entries: { some: { employee_id: { in: ids } } },
        },
        include: { entries: { where: { employee_id: { in: ids } } } },
      })
    : [];

  const entriesByEmp = new Map(); // employee_id -> [{ roster, entry }]
  for (const roster of rosters) {
    for (const entry of roster.entries) {
      if (!entriesByEmp.has(entry.employee_id)) entriesByEmp.set(entry.employee_id, []);
      entriesByEmp.get(entry.employee_id).push({ roster, entry });
    }
  }

  const employments = ids.length
    ? await db.employment.findMany({
        where: { employee_id: { in: ids }, is_current: true, is_deleted: false },
        select: { employee_id: true, location: { select: { type: true } } },
      })
    : [];
  const hqEmployees = new Set(
    employments
      .filter((e) => e.location?.type === "HEAD_OFFICE")
      .map((e) => e.employee_id)
  );

  const NONE = Object.freeze({
    source: "NONE",
    kind: null,
    time_from: null,
    time_to: null,
    offsite_location: null,
    roster_id: null,
    entry_id: null,
  });

  return {
    isHqEmployee: (employeeId) => hqEmployees.has(Number(employeeId)),
    entriesFor: (employeeId) => entriesByEmp.get(Number(employeeId)) || [],
    resolveDay(employeeId, date) {
      const candidates = entriesByEmp.get(Number(employeeId)) || [];
      const applicable = pickApplicable(candidates, date);
      if (applicable) {
        return {
          source: "ROSTER",
          roster_id: applicable.roster.id,
          entry_id: applicable.entry.id,
          ...interpretDaySchedules(applicable.entry.day_schedules, date),
        };
      }
      if (hqEmployees.has(Number(employeeId)) && date >= HQ_DEFAULT_EFFECTIVE_FROM) {
        return { source: "HQ_DEFAULT", roster_id: null, entry_id: null, ...hqDefaultDay(date) };
      }
      return NONE;
    },
  };
}

/**
 * Shared payroll/LSR tally: walk dayList through the resolver.
 * dutyDates = covered dates that are not weekly offs (offsite counts as duty).
 */
function tallySchedule(resolver, employeeId, dayList) {
  const coveredDates = [];
  const weeklyOffDates = [];
  const dutyDates = [];
  for (const date of dayList) {
    const day = resolver.resolveDay(employeeId, date);
    if (day.source === "NONE") continue;
    coveredDates.push(date);
    if (day.kind === "weekly_off") weeklyOffDates.push(date);
    else dutyDates.push(date);
  }
  return { coveredDates, weeklyOffDates, dutyDates };
}

module.exports = {
  HQ_DEFAULT_EFFECTIVE_FROM,
  HQ_DEFAULT_TIME,
  buildScheduleResolver,
  tallySchedule,
  interpretDaySchedules,
  pickApplicable,
  effectiveApprovalTime,
  rosterCoversDate,
  hqDefaultDay,
  toDateOnly,
  addDays,
  formatYMD,
  dayName,
};
