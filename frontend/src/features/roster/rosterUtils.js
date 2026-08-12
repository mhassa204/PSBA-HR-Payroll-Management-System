export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Stored schedule time -> { hours, minutes }, or null when it isn't one.
// Tolerates "HH:mm:ss" as well as "HH:mm".
export function parse24(value) {
  const m = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

// Schedules are stored as 24-hour "HH:mm" but always shown to users as 12-hour
// with AM/PM — the people reading a duty roster shouldn't have to translate
// "17:00". Anything unparseable passes through untouched.
export function formatTime12(value) {
  const t = parse24(value);
  if (!t) return value ? String(value) : "";
  const meridiem = t.hours >= 12 ? "PM" : "AM";
  const h = t.hours % 12 === 0 ? 12 : t.hours % 12;
  return `${h}:${String(t.minutes).padStart(2, "0")} ${meridiem}`;
}

// "09:15" + "17:00" -> "9:15 AM – 5:00 PM"
export function timeRangeLabel(from, to) {
  return `${formatTime12(from) || "—"} – ${formatTime12(to) || "—"}`;
}


export function statusBadgeClass(status) {
  if (status === "APPROVED") return "badge badge-green";
  if (status === "REJECTED") return "badge badge-red";
  return "badge badge-amber";
}

export function scopeLabel(roster) {
  if (roster?.scope === "HQ_DEPARTMENT") return roster?.department?.name || "HQ Department";
  return roster?.location?.name || "—";
}

function fmt(d) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function periodLabel(roster) {
  if (!roster) return "";
  if (roster.roster_type === "PERMANENT") return `Permanent from ${fmt(roster.valid_from)}`;
  return `${fmt(roster.valid_from)} → ${fmt(roster.valid_to)}`;
}

// e.g. "July 2026" when the range is a 21st→20th payroll cycle
export function cycleLabel(roster) {
  if (!roster?.valid_from || !roster?.valid_to) return null;
  const from = new Date(roster.valid_from);
  const to = new Date(roster.valid_to);
  if (from.getUTCDate() === 21 && to.getUTCDate() === 20) {
    return `${to.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${to.getUTCFullYear()} cycle`;
  }
  return null;
}

// A cycle month 'YYYY-MM' names the month the cycle ENDS in:
// 2026-08 => 21 Jul 2026 → 20 Aug 2026 (same convention as the server).
export function currentCycleMonth(today = new Date()) {
  let y = today.getUTCFullYear();
  let m0 = today.getUTCMonth();
  if (today.getUTCDate() >= 21) m0 += 1;
  if (m0 > 11) {
    m0 = 0;
    y += 1;
  }
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

export function cycleMonthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "";
  const y = parseInt(month.slice(0, 4), 10);
  const m0 = parseInt(month.slice(5, 7), 10) - 1;
  const end = new Date(Date.UTC(y, m0, 20));
  return `${end.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${end.getUTCFullYear()}`;
}

// Cycle range text for the selected month, e.g. "21 Jul → 20 Aug 2026"
export function cycleMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "";
  const y = parseInt(month.slice(0, 4), 10);
  const m0 = parseInt(month.slice(5, 7), 10) - 1;
  const start = new Date(Date.UTC(m0 === 0 ? y - 1 : y, m0 === 0 ? 11 : m0 - 1, 21));
  const end = new Date(Date.UTC(y, m0, 20));
  const f = (d, withYear) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${f(start, start.getUTCFullYear() !== end.getUTCFullYear())} → ${f(end, true)}`;
}

// Selectable cycle months: `back` months before the current cycle, plus the next
// one (rosters are usually prepared ahead of the cycle they cover).
export function cycleMonthOptions(back = 17, forward = 1, today = new Date()) {
  const current = currentCycleMonth(today);
  const y = parseInt(current.slice(0, 4), 10);
  const m0 = parseInt(current.slice(5, 7), 10) - 1;
  const out = [];
  for (let i = forward; i >= -back; i--) {
    const d = new Date(Date.UTC(y, m0 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function approverLabel(roster) {
  if (roster?.approver) {
    return roster.approver.employee?.full_name || roster.approver.email;
  }
  if (roster?.scope === "LOCATION" || !roster?.scope) return "Operations";
  return "—";
}

export function blankDaySchedules() {
  return {
    ...DAYS.reduce(
      (acc, d) => ({ ...acc, [d]: { type: "time", time_from: "", time_to: "", location: "" } }),
      {}
    ),
    _collective_weekly_off: { enabled: false, from: "", to: "" },
  };
}

// Every day of an employee's week must carry a complete selection before a
// roster can be submitted. Returns the first incomplete day label, else null.
export function findIncompleteDay(daySchedules) {
  const sched = daySchedules || {};
  for (const d of DAYS) {
    const cell = sched[d];
    if (!cell || !cell.type) return d;
    if (cell.type === "time") {
      if (!cell.time_from || !cell.time_to) return d;
    } else if (cell.type === "offsite") {
      if (!cell.location || !String(cell.location).trim()) return d;
    } else if (cell.type !== "weekly_off") {
      return d;
    }
  }
  const cwo = sched._collective_weekly_off;
  if (cwo?.enabled && (!cwo.from || !cwo.to)) return "collective off range";
  return null;
}

// Owner can edit/delete only their own non-approved rosters
export function canModify(roster, user) {
  if (!roster || !user) return false;
  const isCreator = (roster.created_by_user_id ?? roster.createdBy?.id) === user.id;
  return isCreator && roster.status !== "APPROVED";
}

// Super Admin can delete any roster regardless of status or creator
export function canDelete(roster, user) {
  if (!roster || !user) return false;
  if (user.role?.name === "Super Admin") return true;
  return canModify(roster, user);
}
