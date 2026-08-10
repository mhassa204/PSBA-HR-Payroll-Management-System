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
