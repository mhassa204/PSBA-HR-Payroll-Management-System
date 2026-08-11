import React from "react";

// Red asterisk for required form fields
export const Req = () => <span className="text-red-500 ml-1">*</span>;

// Distinguishing chip shown wherever a leave appears; includes the time
// interval when available
export const ShortLeaveChip = ({ leave, className = "" }) =>
  !leave?.is_short_leave ? null : (
    <span
      className={`badge badge-blue text-[10px] whitespace-nowrap ${className}`}
    >
      Short Leave
      {leave.short_leave_from && leave.short_leave_to
        ? ` ${leave.short_leave_from}–${leave.short_leave_to}`
        : ""}
    </span>
  );

// Latest "returned for correction" reason from a leave's status history
export const lastReturnComment = (l) => {
  const hist = Array.isArray(l?.statusHistory) ? l.statusHistory : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].action_type === "RETURNED") return hist[i].comments || null;
  }
  return null;
};

// A multi-day leave application is stored as one Leave row per date, all
// sharing the same employee + type + submission time. Group those rows back
// into a single "request" for display so each application shows as one entry
// instead of one row per day.
export const groupLeavesByRequest = (leaves) => {
  const map = new Map();
  for (const l of leaves || []) {
    const sub = String(l.submission_time || l.createdAt || "");
    const key = [l.employee_id, l.type, l.custom_type || "", sub].join("|");
    if (!map.has(key)) {
      map.set(key, { key, days: [], ids: [], dates: [], statuses: new Set() });
    }
    const g = map.get(key);
    g.days.push(l);
    g.ids.push(l.id);
    g.dates.push(String(l.date).slice(0, 10));
    g.statuses.add(l.current_status || l.status);
  }
  return [...map.values()].map((g) => {
    const days = [...g.days].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const dates = [...g.dates].sort();
    return {
      key: g.key,
      days,
      ids: g.ids,
      dates,
      count: days.length,
      first: days[0],
      statuses: g.statuses,
      status: g.statuses.size === 1 ? [...g.statuses][0] : "MIXED",
    };
  });
};

// "2026-08-01" or "2026-08-01 → 2026-08-05 (5 days)"
export const requestDateLabel = (group) => {
  if (!group?.dates?.length) return "—";
  if (group.dates.length === 1) return group.dates[0];
  return `${group.dates[0]} → ${group.dates[group.dates.length - 1]} (${group.dates.length} days)`;
};
