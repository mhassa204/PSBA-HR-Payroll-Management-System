import React, { useEffect, useMemo, useState } from "react";
import { DAYS } from "../rosterUtils";
import { toastBus } from "../../../utils/toastBus";

// Editor for per-employee day schedules. Desktop: grouped tables with a column
// per weekday. Mobile (< md): accordion cards per employee.
// A "Bulk fill" panel applies one schedule to any set of days x selected
// employees, so a common roster is two clicks and only exceptions are edited
// by hand. Per-row "Copy to selected" clones one employee's week onto others.
// Props:
//   employees: [{ id, full_name, designation, cnic, mobile_number, role_tag_name }]
//   entries:   [{ employee_id, day_schedules, remarks }]
//   onChange:  (nextEntries) => void

const DAY_TYPES = [
  { value: "time", label: "Time" },
  { value: "offsite", label: "Offsite" },
  { value: "weekly_off", label: "Weekly off" },
];

const DAY_PRESETS = [
  { label: "Mon–Fri", days: DAYS.slice(0, 5) },
  { label: "Mon–Sat", days: DAYS.slice(0, 6) },
  { label: "All days", days: DAYS },
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

  // Bulk fill state. Everyone starts selected — the common schedule is the
  // rule, exceptions are the exception.
  const [selected, setSelected] = useState(() => new Set(employees.map((e) => e.id)));
  const [bulkDay, setBulkDay] = useState({ type: "time", time_from: "09:15", time_to: "17:00", location: "" });
  const [bulkDays, setBulkDays] = useState(() => new Set(DAYS.slice(0, 5)));

  useEffect(() => {
    setSelected(new Set(employees.map((e) => e.id)));
  }, [employees]);

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

  // --- Selection helpers -------------------------------------------------
  const toggleSelected = (empId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const setGroupSelected = (list, value) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const emp of list) {
        if (value) next.add(emp.id);
        else next.delete(emp.id);
      }
      return next;
    });
  };

  const allSelected = employees.length > 0 && selected.size === employees.length;

  // --- Bulk apply --------------------------------------------------------
  const toggleBulkDay = (day) => {
    setBulkDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const applyBulk = () => {
    if (!selected.size) {
      toastBus.emit({ type: "info", message: "Select at least one employee first." });
      return;
    }
    if (!bulkDays.size) {
      toastBus.emit({ type: "info", message: "Select at least one day to fill." });
      return;
    }
    if (bulkDay.type === "time" && (!bulkDay.time_from || !bulkDay.time_to)) {
      toastBus.emit({ type: "info", message: "Set both times for the common schedule." });
      return;
    }
    const dayValue =
      bulkDay.type === "time"
        ? { type: "time", time_from: bulkDay.time_from, time_to: bulkDay.time_to, location: "" }
        : bulkDay.type === "offsite"
        ? { type: "offsite", location: bulkDay.location || "" }
        : { type: "weekly_off" };
    const patch = Object.fromEntries([...bulkDays].map((d) => [d, { ...dayValue }]));
    onChange(
      entries.map((en) =>
        selected.has(en.employee_id)
          ? { ...en, day_schedules: { ...en.day_schedules, ...patch } }
          : en
      )
    );
    toastBus.emit({
      type: "success",
      message: `Applied to ${selected.size} employee(s) × ${bulkDays.size} day(s). Now adjust only the exceptions.`,
    });
  };

  // Clone one employee's full week onto every other selected employee
  const copyWeekToSelected = (sourceId) => {
    const source = entryByEmp.get(sourceId);
    if (!source) return;
    const targets = [...selected].filter((id) => id !== sourceId);
    if (!targets.length) {
      toastBus.emit({ type: "info", message: "Select the employees to copy this week to." });
      return;
    }
    const week = Object.fromEntries(
      DAYS.map((d) => [d, { ...(source.day_schedules?.[d] || { type: "time" }) }])
    );
    onChange(
      entries.map((en) =>
        targets.includes(en.employee_id)
          ? { ...en, day_schedules: { ...en.day_schedules, ...week } }
          : en
      )
    );
    toastBus.emit({ type: "success", message: `Week copied to ${targets.length} employee(s).` });
  };

  return (
    <div className="space-y-6">
      {/* Bulk fill panel */}
      <div className="card-soft p-4 space-y-3 border-l-4 border-blue-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Bulk fill — common schedule</h3>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => setGroupSelected(employees, e.target.checked)}
            />
            Select all ({selected.size}/{employees.length} selected)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <DayEditor day={bulkDay} onChange={setBulkDay} compact />
          <div className="flex flex-wrap items-center gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleBulkDay(d)}
                className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                  bulkDays.has(d)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
            <span className="mx-1 text-gray-300">|</span>
            {DAY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setBulkDays(new Set(p.days))}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyBulk}>
            Apply to {selected.size} selected
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          Tip: apply the common timing to everyone first (e.g. 09:15–17:00 Mon–Fri, then Weekly off
          for Sat/Sun), then hand-edit only the employees whose roster differs. You can also set one
          employee's week and use "Copy to selected" on their row.
        </p>
      </div>

      {groups.map((group) => {
        const groupAllSelected = group.list.every((emp) => selected.has(emp.id));
        return (
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
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={groupAllSelected}
                        onChange={(e) => setGroupSelected(group.list, e.target.checked)}
                        title="Select group"
                      />
                    </th>
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
                      <tr key={emp.id} className={selected.has(emp.id) ? "" : "opacity-70"}>
                        <td className="align-top">
                          <input
                            type="checkbox"
                            checked={selected.has(emp.id)}
                            onChange={() => toggleSelected(emp.id)}
                          />
                        </td>
                        <td className="text-left align-top">
                          <div className="font-medium text-gray-800 whitespace-nowrap">
                            {emp.full_name}
                          </div>
                          <div className="text-[11px] text-gray-400 whitespace-nowrap">
                            {emp.designation || "—"}
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-blue-600 hover:underline"
                            onClick={() => copyWeekToSelected(emp.id)}
                            title="Copy this employee's week to all selected employees"
                          >
                            Copy to selected
                          </button>
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
                    <div className="w-full flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => toggleSelected(emp.id)}
                      />
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-between text-left"
                        onClick={() => setOpenCard(open ? null : emp.id)}
                      >
                        <div>
                          <div className="font-medium text-gray-800">{emp.full_name}</div>
                          <div className="text-xs text-gray-400">{emp.designation || "—"}</div>
                        </div>
                        <span className="text-gray-400 text-sm">{open ? "▾" : "▸"}</span>
                      </button>
                    </div>
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
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => copyWeekToSelected(emp.id)}
                        >
                          Copy this week to selected employees
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RosterEntriesEditor;
