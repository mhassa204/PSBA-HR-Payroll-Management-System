import React from "react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const locationLine = (location) => {
  if (!location) return "Not assigned";
  const city = location.city?.name;
  return city ? `${location.name}, ${city}` : location.name;
};

// Transfer history for one employment. Rows come from EmploymentHistory
// (history_type TRANSFER) sorted by effective date desc.
const TransferTimeline = ({ employment, transfers, loading, canTransfer, onNewTransfer }) => {
  if (loading) {
    return <div className="py-16 flex justify-center"><LoadingSpinner size="md" text="Loading transfer history..." /></div>;
  }

  // The posting can be set outside the transfer log (legacy employment edit
  // paths) — surface a quiet note when the log's tip disagrees with it.
  const newest = transfers[0];
  const logMismatch =
    newest && employment?.location_id != null && String(employment.location_id) !== String(newest.new_value);

  return (
    <div className="space-y-3">
      <div className="card-soft px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current posting</p>
          <p className="text-sm font-semibold">{locationLine(employment?.location)}</p>
          {logMismatch && (
            <p className="text-[11px] text-gray-400">Current posting was set outside the transfer log.</p>
          )}
        </div>
        {canTransfer && (
          <button className="btn btn-primary btn-sm" onClick={onNewTransfer}>
            <span className="mr-1">+</span> New Transfer
          </button>
        )}
      </div>

      {!transfers.length ? (
        <div className="card-soft p-10 text-center space-y-3">
          <p className="text-sm text-gray-500">No transfers recorded for this employment.</p>
          {canTransfer && (
            <button className="btn btn-primary btn-sm" onClick={onNewTransfer}>Record the first transfer</button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Effective Date</th>
                  <th className="text-left">From</th>
                  <th className="text-left">To</th>
                  <th className="text-left">Description</th>
                  <th className="text-left">Remarks</th>
                  <th className="text-left">Recorded By</th>
                  <th className="text-left">Recorded On</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="text-left font-medium whitespace-nowrap">{fmtDate(t.changed_at)}</td>
                    <td className="text-left">{t.old_value_label || "—"}</td>
                    <td className="text-left font-medium">{t.new_value_label || "—"}</td>
                    <td className="text-left text-gray-600">{t.change_description || "—"}</td>
                    <td className="text-left text-gray-600 max-w-[16rem] whitespace-normal">{t.remarks || "—"}</td>
                    <td className="text-left whitespace-nowrap">{t.changed_by_label}</td>
                    <td className="text-left whitespace-nowrap text-gray-500">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="card-soft p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{fmtDate(t.changed_at)}</span>
                  <span className="badge badge-blue">Transfer</span>
                </div>
                <p className="text-sm">
                  <span className="text-gray-500">{t.old_value_label || "—"}</span>
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="font-medium">{t.new_value_label || "—"}</span>
                </p>
                {t.remarks && <p className="text-xs text-gray-600">{t.remarks}</p>}
                <p className="text-[11px] text-gray-400">
                  Recorded by {t.changed_by_label} on {fmtDate(t.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TransferTimeline;
