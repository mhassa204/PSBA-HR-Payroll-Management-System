import React, { useEffect, useRef, useState } from "react";
import { exportToCSV, exportToExcel } from "../../../lib/exportUtils";
import { toastBus } from "../../../utils/toastBus";
import { displayCNIC } from "../../../utils/formatters";

const HEADERS = ["Effective Date", "From", "To", "Description", "Remarks", "Recorded By", "Recorded On"];

const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const TransferExportMenu = ({ transfers, employment, employeeName, employeeCnic }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = (type) => {
    setOpen(false);
    if (!transfers.length) return;
    const rows = transfers.map((t) => ({
      "Effective Date": fmtDate(t.changed_at),
      From: t.old_value_label || "",
      To: t.new_value_label || "",
      Description: t.change_description || "",
      Remarks: t.remarks || "",
      "Recorded By": t.changed_by_label || "",
      "Recorded On": fmtDate(t.createdAt),
    }));
    const safeName = String(employeeName || "employee").replace(/[^\w-]+/g, "_");
    const base = `transfers_${safeName}_${employment?.id || ""}_${fmtDate(new Date())}`;
    const title = `Transfer History — ${employeeName}${employeeCnic ? ` (${displayCNIC(employeeCnic)})` : ""} · ${employment?.organization || ""}`;
    if (type === "xlsx") exportToExcel(`${base}.xlsx`, rows, "Transfers", HEADERS, title);
    else exportToCSV(`${base}.csv`, rows, HEADERS, title);
    toastBus.emit({ type: "success", message: `Exported ${rows.length} transfer(s).` });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={!transfers.length}
        onClick={() => setOpen((o) => !o)}
      >
        Export ▾
      </button>
      {open && (
        <div className="menu-surface absolute right-0 mt-1 z-30 flex flex-col" role="menu">
          <button className="menu-item" onClick={() => handleExport("xlsx")}>Excel</button>
          <button className="menu-item" onClick={() => handleExport("csv")}>CSV</button>
        </div>
      )}
    </div>
  );
};

export default TransferExportMenu;
