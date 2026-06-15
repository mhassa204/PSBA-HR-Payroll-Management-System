import React from "react";

/**
 * DetailField — renders a label/value row ONLY when the value is meaningfully
 * present. If the value is empty/null/"N/A"-like, it renders nothing (so empty
 * fields are HIDDEN entirely instead of showing "N/A"). Requirement: no "N/A".
 *
 * Usage:
 *   <DetailField label="Blood Group" value={employee.blood_group} />
 *   <DetailField label="Email" value={employee.email} layout="row" />
 */
export function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return true;
  const s = String(v).trim();
  if (s === "") return false;
  const empties = ["n/a", "na", "-", "—", "unknown", "not specified", "not provided", "null", "undefined"];
  return !empties.includes(s.toLowerCase());
}

const DetailField = ({ label, value, children, layout = "stack", className = "", labelClassName = "", valueClassName = "" }) => {
  const content = children !== undefined ? children : value;
  // When children are passed, only the explicit `value` (or children truthiness) gates visibility
  const visible = children !== undefined ? hasValue(value ?? true) && content != null : hasValue(value);
  if (!visible) return null;

  if (layout === "row") {
    return (
      <div className={`flex items-center justify-between py-2 ${className}`}>
        <span className={`text-gray-600 ${labelClassName}`}>{label}</span>
        <span className={`font-medium text-gray-900 text-right ${valueClassName}`}>{content}</span>
      </div>
    );
  }
  return (
    <div className={className}>
      {label && <p className={`text-sm text-gray-500 ${labelClassName}`}>{label}</p>}
      <p className={`font-semibold text-gray-900 ${valueClassName}`}>{content}</p>
    </div>
  );
};

export default DetailField;
