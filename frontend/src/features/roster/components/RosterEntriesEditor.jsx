import React, { useMemo, useState } from "react";
import { DAYS } from "../rosterUtils";

// Editor for per-employee day schedules. Desktop: grouped tables with a column
// per weekday. Mobile (< md): accordion cards per employee.
// Props:
//   employees: [{ id, full_name, designation, cnic, mobile_number, role_tag_name }]
//   entries:   [{ employee_id, day_schedules, remarks }]
//   onChange:  (nextEntries) => void

const DAY_TYPES = [
  { value: "time", label: "Time" },
  { value: "offsite", label: "Offsite" },
  { value: "weekly_off", label: "Weekly off" },
];

function DayEditor({ day, onChange, compact = false }) {
  const type = day?.type || "time";
  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5" : "flex items-center gap-1.5"}>
      <select
        className="form-input sm w-auto"
        value={type}
        onChange={(e) => {
          const t = e.target.value;
          onChange(
            t === "time"
              ? { type: t, time_from: "", time_to: "", location: "" }
              : t === "offsite"
              ? { type: t, location: "" }
              : { type: t }
          );
        }}
      >
        {DAY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {type === "time" && (
        <>
          <input
            type="time"
            className="form-input sm w-24"
            value={day.time_from || ""}
            onChange={(e) => onChange({ ...day, time_from: e.target.value })}
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="time"
            className="form-input sm w-24"
            value={day.time_to || ""}
            onChange={(e) => onChange({ ...day, time_to: e.target.value })}
          />
        </>
      )}
      {type === "offsite" && (
        <input
          className="form-input sm w-28"
          placeholder="Location"
          value={day.location || ""}
          onChange={(e) => onChange({ ...day, location: e.target.value })}
        />
      )}
      {type === "weekly_off" && <span className="text-gray-400 text-xs">Off</span>}
    </div>
  );
}

function CollectiveWeeklyOff({ cwo, onChange }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={!!cwo.enabled}
          onChange={(e) => onChange({ ...cwo, enabled: e.target.checked })}
        />
        Collective off range
      </label>
      {cwo.enabled && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            type="date"
            className="form-input sm"
            value={cwo.from || ""}
            onChange={(e) => onChange({ ...cwo, from: e.target.value })}
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            className="form-input sm"
            value={cwo.to || ""}
            onChange={(e) => onChange({ ...cwo, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

const RosterEntriesEditor = ({ employees, entries, onChange }) => {
  const [openCard, setOpenCard] = useState(null);

  const entryByEmp = useMemo(() => {
    const m = new Map();
    for (const en of entries) m.set(en.employee_id, en);
    return m;
  }, [entries]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of employees) {
      const key = e.role_tag_name || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return Array.from(map.entries()).map(([name, list]) => ({ name, list }));
  }, [employees]);

  const updateEntry = (empId, updater) => {
    onChange(entries.map((en) => (en.employee_id === empId ? updater({ ...en }) : en)));
  };

  const setDay = (empId, dayKey, value) =>
    updateEntry(empId, (curr) => ({
      ...curr,
      day_schedules: { ...curr.day_schedules, [dayKey]: value },
    }));

  const setCwo = (empId, value) =>
    updateEntry(empId, (curr) => ({
      ...curr,
      day_schedules: { ...curr.day_schedules, _collective_weekly_off: value },
    }));

  const setRemarks = (empId, value) =>
    updateEntry(empId, (curr) => ({ ...curr, remarks: value }));

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {group.name}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {group.list.length} employee{group.list.length === 1 ? "" : "s"}
            </span>
          </h3>

          {/* Desktop grid */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced table-no-wrap min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Employee</th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-left">
                      {d.slice(0, 3)}
                    </th>
                  ))}
                  <th className="text-left">Collective Off</th>
                  <th className="text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {group.list.map((emp) => {
                  const entry = entryByEmp.get(emp.id);
                  if (!entry) return null;
                  const cwo = entry.day_schedules?._collective_weekly_off || {
                    enabled: false,
                    from: "",
                    to: "",
                  };
                  return (
                    <tr key={emp.id}>
                      <td className="text-left align-top">
                        <div className="font-medium text-gray-800 whitespace-nowrap">
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] text-gray-400 whitespace-nowrap">
                          {emp.designation || "—"}
                        </div>
                      </td>
                      {DAYS.map((d) => (
                        <td key={d} className="text-left align-top">
                          <DayEditor
                            day={entry.day_schedules?.[d] || { type: "time" }}
                            onChange={(v) => setDay(emp.id, d, v)}
                          />
                        </td>
                      ))}
                      <td className="text-left align-top">
                        <CollectiveWeeklyOff cwo={cwo} onChange={(v) => setCwo(emp.id, v)} />
                      </td>
                      <td className="text-left align-top">
                        <input
                          className="form-input sm w-32"
                          placeholder="Remarks"
                          value={entry.remarks || ""}
                          onChange={(e) => setRemarks(emp.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile accordion cards */}
          <div className="md:hidden space-y-2">
            {group.list.map((emp) => {
              const entry = entryByEmp.get(emp.id);
              if (!entry) return null;
              const cwo = entry.day_schedules?._collective_weekly_off || {
                enabled: false,
                from: "",
                to: "",
              };
              const open = openCard === emp.id;
              return (
                <div key={emp.id} className="card-soft p-0 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenCard(open ? null : emp.id)}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{emp.full_name}</div>
                      <div className="text-xs text-gray-400">{emp.designation || "—"}</div>
                    </div>
                    <span className="text-gray-400 text-sm">{open ? "▾" : "▸"}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      {DAYS.map((d) => (
                        <div key={d} className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-500">{d}</span>
                          <DayEditor
                            day={entry.day_schedules?.[d] || { type: "time" }}
                            onChange={(v) => setDay(emp.id, d, v)}
                            compact
                          />
                        </div>
                      ))}
                      <CollectiveWeeklyOff cwo={cwo} onChange={(v) => setCwo(emp.id, v)} />
                      <input
                        className="form-input sm w-full"
                        placeholder="Remarks"
                        value={entry.remarks || ""}
                        onChange={(e) => setRemarks(emp.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RosterEntriesEditor;
