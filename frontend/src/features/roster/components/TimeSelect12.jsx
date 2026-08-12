import React, { useEffect, useState } from "react";
import { parse24 } from "../rosterUtils";

// Hour : Minute : AM/PM, all three as pickers.
//
// Every minute of the day is reachable (no 5-minute grid), while nothing can be
// typed — so there is no input to mistype and nothing to validate. Three short
// lists beat one 1440-item list, and it reads left-to-right as "9 : 15 AM".
// The value stays 24-hour "HH:mm" for the API.

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const EMPTY = { hour: "", minute: "", meridiem: "AM" };

// "13:45" -> { hour: "1", minute: "45", meridiem: "PM" }
function toParts(value) {
  const t = parse24(value);
  if (!t) return EMPTY;
  return {
    hour: String(t.hours % 12 === 0 ? 12 : t.hours % 12),
    minute: String(t.minutes).padStart(2, "0"),
    meridiem: t.hours >= 12 ? "PM" : "AM",
  };
}

// -> "21:45", or "" while no hour is chosen
function fromParts({ hour, minute, meridiem }) {
  if (!hour) return "";
  let h = parseInt(hour, 10);
  if (meridiem === "PM") h = h === 12 ? 12 : h + 12;
  else h = h === 12 ? 0 : h;
  return `${String(h).padStart(2, "0")}:${minute || "00"}`;
}

const TimeSelect12 = ({ value, onChange, label, className = "" }) => {
  const [parts, setParts] = useState(() => toParts(value));

  // Re-sync when the value is set from outside (bulk fill, copy week), but not
  // while it already matches what is selected here.
  useEffect(() => {
    setParts((curr) => (fromParts(curr) === (value || "") ? curr : toParts(value)));
  }, [value]);

  const apply = (next) => {
    setParts(next);
    onChange(fromParts(next));
  };

  // Minute/meridiem stay inert until there is an hour, so a half-made
  // selection can never be mistaken for a real time.
  const noHour = !parts.hour;
  const cls = "form-input sm !w-auto shrink-0";

  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 ${className}`}>
      <select
        className={cls}
        aria-label={label ? `${label} — hour` : "Hour"}
        value={parts.hour}
        onChange={(e) =>
          apply(
            e.target.value
              ? { ...parts, hour: e.target.value, minute: parts.minute || "00" }
              : { ...EMPTY, meridiem: parts.meridiem }
          )
        }
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="shrink-0 text-gray-400 text-xs">:</span>
      <select
        className={cls}
        aria-label={label ? `${label} — minute` : "Minute"}
        disabled={noHour}
        value={parts.minute}
        onChange={(e) => apply({ ...parts, minute: e.target.value })}
      >
        {noHour && <option value="">--</option>}
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={cls}
        aria-label={label ? `${label} — AM or PM` : "AM or PM"}
        disabled={noHour}
        value={parts.meridiem}
        onChange={(e) => apply({ ...parts, meridiem: e.target.value })}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </span>
  );
};

export default TimeSelect12;
