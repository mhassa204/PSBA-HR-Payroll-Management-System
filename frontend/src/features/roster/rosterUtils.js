export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

// Owner can edit/delete only their own non-approved rosters
export function canModify(roster, user) {
  if (!roster || !user) return false;
  const isCreator = (roster.created_by_user_id ?? roster.createdBy?.id) === user.id;
  return isCreator && roster.status !== "APPROVED";
}
