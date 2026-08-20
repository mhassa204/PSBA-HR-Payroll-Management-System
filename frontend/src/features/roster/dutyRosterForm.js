// Shared model + formatting for the official "Staff Duty Roster Form".
// Consumed by the print (HTML) and Excel exporters so both stay identical.
import { formatTime12, DAYS } from "./rosterUtils";
import { designationRank } from "../../utils/dutyRoster";

export const PRINT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const FORM_HEADERS = [
  "Sr. #",
  "NAME",
  "DESIGNATION",
  "CNIC",
  "CONTACT NUMBER",
  "Weekly off",
  ...PRINT_DAYS.map((d) => d.toUpperCase()),
];

// Staff category bands, in the order they appear on the form.
const CATEGORY_ORDER = [
  "MANAGEMENT STAFF",
  "SECURITY MORNING STAFF",
  "SECURITY EVENING STAFF",
  "SECURITY NIGHT STAFF",
  "SANITATION STAFF",
  "OTHER STAFF",
];

const designationOf = (en) =>
  en?.employee?.employmentRecords?.[0]?.designation?.title || "";

const startHourOf = (daySchedules) => {
  for (const d of DAYS) {
    const cell = daySchedules?.[d];
    if (cell?.type === "time" && cell.time_from) {
      const m = String(cell.time_from).match(/^(\d{1,2}):/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return null;
};

const categoryOf = (en) => {
  const d = designationOf(en).toLowerCase();
  if (/incharge|supervisor|record\s*keeper/.test(d)) return "MANAGEMENT STAFF";
  if (/sanitation/.test(d)) return "SANITATION STAFF";
  if (/security/.test(d)) {
    const h = startHourOf(en.day_schedules);
    if (h == null || h < 12) return "SECURITY MORNING STAFF";
    if (h < 18) return "SECURITY EVENING STAFF";
    return "SECURITY NIGHT STAFF";
  }
  return "OTHER STAFF";
};

export const dayCellText = (day) => {
  if (!day || !day.type) return "-";
  if (day.type === "weekly_off") return "OFF";
  if (day.type === "offsite")
    return day.location ? `OFFSITE: ${day.location}` : "OFFSITE";
  if (day.type === "time" && (day.time_from || day.time_to)) {
    return `${formatTime12(day.time_from)} TO ${formatTime12(day.time_to)}`.toUpperCase();
  }
  return "-";
};

const weeklyOffLabel = (daySchedules) => {
  const offs = DAYS.filter((d) => daySchedules?.[d]?.type === "weekly_off");
  return offs.length ? offs.map((d) => d.toUpperCase()).join(", ") : "-";
};

export const fmtCnic = (cnic) => {
  const digits = String(cnic || "").replace(/\D/g, "");
  if (digits.length === 13)
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  return cnic || "-";
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

const MINUTES_IN_DAY = 1440;

// Operational timing = the hours the roster actually puts someone on duty.
//
// Shifts are treated as intervals on a 24-hour clock and unioned, because a
// night shift such as 23:00-07:00 wraps past midnight. Taking the earliest
// start and the latest end (the previous approach) silently dropped that
// wrapped block: a bazaar with 08:00-20:00 day staff plus a 20:00-08:00 guard
// reported "8:00 AM TO 8:00 PM" and hid twelve hours of night cover.
//
// Like the rest of this form, coverage is pooled across the whole week rather
// than computed per day.
const operationalTiming = (entries) => {
  const toMin = (t) => {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  };
  const minToHHmm = (mins) =>
    `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  // midnight prints as 12:00 AM whether it is the start or the end of a block
  const label = (mins) =>
    mins % MINUTES_IN_DAY === 0 ? "12:00 AM" : formatTime12(minToHHmm(mins));

  const covered = new Array(MINUTES_IN_DAY).fill(false);
  const mark = (from, to) => {
    for (let i = from; i < to; i += 1) covered[i] = true;
  };

  let anyShift = false;
  for (const en of entries) {
    for (const d of DAYS) {
      const cell = en.day_schedules?.[d];
      if (cell?.type !== "time") continue;
      const s = toMin(cell.time_from);
      let e = toMin(cell.time_to);
      if (s == null || e == null) continue;
      anyShift = true;
      if (e === s) {
        mark(0, MINUTES_IN_DAY); // same start and end = round-the-clock posting
        continue;
      }
      if (e === 0) e = MINUTES_IN_DAY; // ends at midnight
      if (e > s) mark(s, e);
      else {
        mark(s, MINUTES_IN_DAY); // wraps past midnight
        mark(0, e);
      }
    }
  }

  if (!anyShift) return "";
  const total = covered.reduce((n, c) => n + (c ? 1 : 0), 0);
  if (total === 0) return "";
  // "12:00 AM TO 12:00 AM" reads as a zero-length window, so say it plainly
  if (total === MINUTES_IN_DAY) return "24 HOURS";

  // Walk the clock from the first minute that follows a gap, so a block
  // running through midnight comes out as one block rather than two.
  const startIdx = covered.findIndex(
    (c, i) => c && !covered[(i - 1 + MINUTES_IN_DAY) % MINUTES_IN_DAY]
  );
  const blocks = [];
  let i = 0;
  while (i < MINUTES_IN_DAY) {
    const at = (startIdx + i) % MINUTES_IN_DAY;
    if (!covered[at]) {
      i += 1;
      continue;
    }
    let len = 0;
    while (len < MINUTES_IN_DAY && covered[(startIdx + i + len) % MINUTES_IN_DAY]) len += 1;
    blocks.push([at, (at + len) % MINUTES_IN_DAY || MINUTES_IN_DAY]);
    i += len;
  }

  if (!blocks.length) return "";
  if (blocks.length === 1) return `${label(blocks[0][0])} TO ${label(blocks[0][1])}`;
  if (blocks.length <= 3) {
    return blocks.map(([a, b]) => `${label(a)} TO ${label(b)}`).join(" & ");
  }
  // Too fragmented to list — show the outer span of the covered blocks
  return `${label(blocks[0][0])} TO ${label(blocks[blocks.length - 1][1])}`;
};

// Build the printable form model from a roster detail object.
export function buildDutyRosterFormModel(roster) {
  const entries = roster?.entries || [];
  const unitName =
    roster?.scope === "HQ_DEPARTMENT"
      ? roster?.department?.name || "HQ Department"
      : roster?.location?.name || "Bazaar";

  const grouped = new Map();
  for (const en of entries) {
    const cat = categoryOf(en);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(en);
  }

  const groups = [];
  for (const cat of CATEGORY_ORDER) {
    const list = grouped.get(cat);
    if (!list || !list.length) continue;
    list.sort(
      (a, b) =>
        designationRank(designationOf(a)) - designationRank(designationOf(b)) ||
        (a.employee?.full_name || "").localeCompare(b.employee?.full_name || "")
    );
    groups.push({
      category: cat,
      rows: list.map((en, i) => {
        const emp = en.employee || {};
        return {
          sr: i + 1,
          name: emp.full_name || "-",
          designation: designationOf(en) || "-",
          cnic: fmtCnic(emp.cnic),
          contact: emp.mobile_number || "-",
          weeklyOff: weeklyOffLabel(en.day_schedules),
          dayCells: PRINT_DAYS.map((d) => dayCellText(en.day_schedules?.[d])),
        };
      }),
    });
  }

  const incharge = entries.find((en) => /incharge/i.test(designationOf(en)))
    ?.employee?.full_name;

  return {
    unitName,
    title: `STAFF DUTY ROSTER OF ${unitName.toUpperCase()}`,
    timing: operationalTiming(entries),
    validFrom: fmtDate(roster.valid_from),
    validTo: roster.valid_to ? fmtDate(roster.valid_to) : null,
    incharge: incharge || null,
    groups,
  };
}
