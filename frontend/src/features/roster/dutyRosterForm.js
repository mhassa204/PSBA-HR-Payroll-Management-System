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

// Earliest start → latest close across the roster's time schedules.
const operationalTiming = (entries) => {
  let min = null;
  let max = null;
  const toMin = (t) => {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  };
  const minToHHmm = (mins) =>
    `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  for (const en of entries) {
    for (const d of DAYS) {
      const cell = en.day_schedules?.[d];
      if (cell?.type !== "time") continue;
      const s = toMin(cell.time_from);
      let e = toMin(cell.time_to);
      if (e === 0) e = 1440;
      if (s != null) min = min == null ? s : Math.min(min, s);
      if (e != null) max = max == null ? e : Math.max(max, e);
    }
  }
  if (min == null || max == null) return "";
  const startTxt = formatTime12(minToHHmm(min));
  const endTxt = max >= 1440 ? "12:00 AM" : formatTime12(minToHHmm(max));
  return `${startTxt} TO ${endTxt}`;
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
