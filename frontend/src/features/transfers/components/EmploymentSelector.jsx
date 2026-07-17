import React from "react";
import { Link } from "react-router-dom";

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Selectable list of an employee's employment records. Collapses to a summary
// line when there is only one.
const EmploymentSelector = ({ employeeId, employments, selectedId, onSelect }) => {
  if (!employments.length) {
    return (
      <div className="card-soft p-8 text-center space-y-2">
        <p className="text-sm text-gray-600">This employee has no employment records yet.</p>
        <Link to={`/employees/${employeeId}/employment`} className="btn btn-primary btn-sm inline-block">
          Manage Employment
        </Link>
      </div>
    );
  }

  const summary = (emp) => {
    const period = [fmtDate(emp.effective_from) || "?", emp.is_current ? "Present" : fmtDate(emp.effective_till) || "?"].join(" – ");
    const title = emp.designation?.title || emp.designation_text || "No designation";
    return { period, title };
  };

  if (employments.length === 1) {
    const emp = employments[0];
    const { period, title } = summary(emp);
    return (
      <div className="card-soft px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{emp.organization}</span>
        <span className="text-gray-500">{title}</span>
        <span className="text-gray-400 text-xs">{period}</span>
        {emp.is_current && <span className="badge badge-green">Current</span>}
      </div>
    );
  }

  return (
    <div className="card-soft p-4 space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select employment</p>
      <div className="flex flex-wrap gap-2">
        {employments.map((emp) => {
          const { period, title } = summary(emp);
          const active = emp.id === selectedId;
          return (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.id)}
              className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                active ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{emp.organization}</span>
                {emp.is_current && <span className="badge badge-green">Current</span>}
              </div>
              <div className="text-xs text-gray-500">{title}</div>
              <div className="text-[11px] text-gray-400">{period}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmploymentSelector;
