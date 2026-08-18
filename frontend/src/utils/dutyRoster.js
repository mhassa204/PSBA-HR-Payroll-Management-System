// Shared duty-roster helpers: designation ordering/labels, per-bazaar staff
// counts, and the ">8 hours" long-duty rule. Used by the roster module pages
// and the attendance "Attendance vs Duty Roster" monitoring page so the two
// stay consistent.

// Prescribed display/priority order. "Other" collects every role not on the
// prescribed list (Sanitation Attendant, Gardener, Electrician, …).
export const DESIGNATION_ORDER = [
  "Incharge",
  "Supervisor",
  "Record Keeper",
  "Security Guard",
  "Other",
];

// Map a raw designation title onto a friendly bucket label.
export function designationBucket(title) {
  const t = String(title || "").toLowerCase();
  if (t.includes("incharge")) return "Incharge";
  if (t.includes("supervisor")) return "Supervisor";
  if (t.includes("record keeper")) return "Record Keeper";
  if (t.includes("security")) return "Security Guard";
  return "Other";
}

// Sort key: prescribed roles first (in order), everything else last.
export function designationRank(title) {
  const idx = DESIGNATION_ORDER.indexOf(designationBucket(title));
  return idx === -1 ? DESIGNATION_ORDER.length : idx;
}

// Duty duration in minutes from an "HH:mm" / "HH:mm:ss" pair; null if either
// side is missing/invalid. A "to" before "from" is treated as crossing midnight.
export function dutyMinutesFromTimes(from, to) {
  const parse = (s) => {
    if (!s) return null;
    const m = String(s).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const f = parse(from);
  const t = parse(to);
  if (f == null || t == null) return null;
  let mins = t - f;
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export const LONG_DUTY_MINUTES = 8 * 60; // more than 8 hours

export function isLongDuty(from, to) {
  const mins = dutyMinutesFromTimes(from, to);
  return mins != null && mins > LONG_DUTY_MINUTES;
}

// Ordered [{ label, count }] using friendly labels; "Other" roles keep their
// own title so nothing is hidden. getTitle(item) -> designation title string.
export function staffCountSummary(items, getTitle) {
  const counts = new Map();
  for (const it of items || []) {
    const title = getTitle(it);
    const bucket = designationBucket(title);
    const label = bucket === "Other" ? title || "Other" : bucket;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const rankOf = (label) => {
    const i = DESIGNATION_ORDER.indexOf(label);
    return i === -1 ? DESIGNATION_ORDER.length : i;
  };
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort(
      (a, b) => rankOf(a.label) - rankOf(b.label) || a.label.localeCompare(b.label)
    );
}

// "1 Incharge" / "3 Supervisors"
export function countLabel(label, count) {
  return `${count} ${count === 1 ? label : `${label}s`}`;
}
