import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { exportToCSV, exportToExcel } from "../../../lib/exportUtils";
import { toastBus } from "../../../utils/toastBus";

function getPayrollRangeForMonth(year, month /* 0-based */) {
  // cycle: 21st of given month to 20th of next month
  const start = new Date(Date.UTC(year, month, 21));
  const end = new Date(Date.UTC(year, month + 1, 20));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
function getDefaultPayrollMonth() {
  const now = new Date();
  const utcNow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  // if today >= 21, current month cycle; else previous month cycle
  if (utcNow.getUTCDate() >= 21)
    return { year: utcNow.getUTCFullYear(), month: utcNow.getUTCMonth() };
  // previous month
  const d = new Date(
    Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() - 1, 1)
  );
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

const LocationFMOPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // filters (initialize from URL)
  const [fBiometricId, setFBiometricId] = useState(
    () => searchParams.get("fbio") || ""
  );
  const [fCnic, setFCnic] = useState(() => searchParams.get("fcnic") || "");
  const [fName, setFName] = useState(() => searchParams.get("fname") || "");
  const [fDesignation, setFDesignation] = useState(
    () => searchParams.get("fdesig") || ""
  );
  const [fCostCenter, setFCostCenter] = useState(
    () => searchParams.get("fcc") || ""
  );

  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  // month selector state derives from start/end or default payroll month
  const initialMonth = useMemo(() => {
    if (start && end) {
      const d = new Date(start + "T00:00:00Z");
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    }
    return getDefaultPayrollMonth();
  }, [start, end]);
  const [selYear, setSelYear] = useState(initialMonth.year);
  const [selMonth, setSelMonth] = useState(initialMonth.month); // 0-based

  // Sync month into URL only when changed
  useEffect(() => {
    const { start: s, end: e } = getPayrollRangeForMonth(selYear, selMonth);
    const np = new URLSearchParams(searchParams);
    let changed = false;
    if (np.get("start") !== s) {
      np.set("start", s);
      changed = true;
    }
    if (np.get("end") !== e) {
      np.set("end", e);
      changed = true;
    }
    if (changed) setSearchParams(np, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMonth]);

  // keep filters in URL (only when changed)
  useEffect(() => {
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    const setOrDelete = (k, v) => {
      if (v && String(v).length) np.set(k, v);
      else np.delete(k);
    };
    setOrDelete("fbio", fBiometricId);
    setOrDelete("fcnic", fCnic);
    setOrDelete("fname", fName);
    setOrDelete("fdesig", fDesignation);
    setOrDelete("fcc", fCostCenter);
    const after = np.toString();
    if (after !== before) setSearchParams(np, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fBiometricId, fCnic, fName, fDesignation, fCostCenter]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/attendance/locations/${id}/fmo`, {
        params: { ...(start ? { start } : {}), ...(end ? { end } : {}) },
      });
      setData(data);
    } catch (e) {
      // ignore detailed error UI for brevity
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (start && end) load();
  }, [id, start, end]);

  // derive days/rows safely for hooks below regardless of loading state
  const days = data && data.days ? data.days : [];
  const rows = data && data.rows ? data.rows : [];

  const filteredRows = useMemo(() => {
    const inc = (val, f) =>
      String(val || "")
        .toLowerCase()
        .includes(String(f || "").toLowerCase());
    return rows.filter(
      (r) =>
        inc(r.biometricId, fBiometricId) &&
        inc(r.cnic, fCnic) &&
        inc(r.name, fName) &&
        inc(r.designation, fDesignation) &&
        inc(r.roleTag, fCostCenter)
    );
  }, [rows, fBiometricId, fCnic, fName, fDesignation, fCostCenter]);

  // Determine if a given index corresponds to a future day within the current range
  const isFutureDay = (idx) => {
    try {
      if (!data?.range?.start) return false;
      const startDate = new Date(data.range.start + "T00:00:00Z");
      const dayDate = new Date(startDate);
      dayDate.setUTCDate(startDate.getUTCDate() + idx);
      const now = new Date();
      const todayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      return dayDate > todayUtc;
    } catch {
      return false;
    }
  };

  // build month options: show last 12 months including current
  const monthOptions = [];
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1)
    );
    monthOptions.push({
      value: { y: d.getUTCFullYear(), m: d.getUTCMonth() },
      label: d.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    });
  }

  // Export helpers
  const mapFmoForExport = (rowsForExport, daysForExport) => {
    // Flatten row into object with dynamic date columns and totals
    return rowsForExport.map((r) => {
      const base = {
        SrNo: r.sr,
        BiometricID: r.biometricId || "",
        CNIC: r.cnic || "",
        Name: r.name || "",
        Designation: r.designation || "",
        CostCenter: r.roleTag || "",
      };
      daysForExport.forEach((d, idx) => {
        const colKey = `${d.dow} ${d.label}`; // align with headers
        base[colKey] = r.marks[idx] || "";
      });
      base.TotalDays = r.totals?.totalDays ?? "";
      base.Present = r.totals?.present ?? "";
      base.NotMark = r.totals?.notMark ?? "";
      base.Absent = r.totals?.absent ?? "";
      return base;
    });
  };

  const titleText = `Attendance FMO - ${data?.location?.name || ""} (${
    data?.range?.start
  } to ${data?.range?.end})`;

  const handleExport = (type, onlyFiltered) => {
    const rowsSrc = onlyFiltered ? filteredRows : rows;
    if (!rowsSrc?.length) return;
    const payload = mapFmoForExport(rowsSrc, days);
    const headers = [
      "SrNo",
      "BiometricID",
      "CNIC",
      "Name",
      "Designation",
      "CostCenter",
      ...days.map((d) => `${d.dow} ${d.label}`),
      "TotalDays",
      "Present",
      "NotMark",
      "Absent",
    ];
    const filename = `FMO_${data?.location?.name || "Location"}_${
      data?.range?.start
    }_to_${data?.range?.end}.${type === "csv" ? "csv" : "xlsx"}`;
    if (type === "csv") exportToCSV(filename, payload, headers, titleText);
    else exportToExcel(filename, payload, "FMO", headers, titleText);
    const mode = onlyFiltered ? "filtered" : "all";
    toastBus.emit({
      type: "success",
      message: `Exported ${
        rowsSrc.length
      } ${mode} rows to ${type.toUpperCase()}.`,
    });
  };

  const exportRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading attendance..." />
      </div>
    );
  if (!data?.success)
    return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[97vw] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Attendance FMO - {data.location?.name}
          </h1>
          <p className="text-xs text-gray-500">
            {data.range.start} to {data.range.end}
          </p>
        </div>
        <div className="actions-inline">
          <select
            className="form-input dense-input !w-auto text-xs"
            value={`${selYear}-${selMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value
                .split("-")
                .map((n) => parseInt(n, 10));
              setSelYear(y);
              setSelMonth(m);
            }}
          >
            {monthOptions.map((opt, idx) => (
              <option key={idx} value={`${opt.value.y}-${opt.value.m}`}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => setExportOpen((o) => !o)}
            >
              Export ▾
            </button>
            {exportOpen && (
              <div
                className="menu-surface absolute right-0 mt-1 z-30 flex flex-col"
                role="menu"
              >
                <button
                  className="menu-item"
                  onClick={() => {
                    handleExport("csv", true);
                    setExportOpen(false);
                  }}
                >
                  Filtered CSV
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    handleExport("xlsx", true);
                    setExportOpen(false);
                  }}
                >
                  Filtered Excel
                </button>
                <div className="h-px my-1 bg-gray-200" />
                <button
                  className="menu-item"
                  onClick={() => {
                    handleExport("csv", false);
                    setExportOpen(false);
                  }}
                >
                  All CSV
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    handleExport("xlsx", false);
                    setExportOpen(false);
                  }}
                >
                  All Excel
                </button>
              </div>
            )}
          </div>
          <Link
            to={`/attendance/locations/${id}`}
            className="btn btn-outline text-xs"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="card-soft p-4 space-y-3">
        <div className="filter-panel compact">
          <input
            className="form-input"
            placeholder="Biometric ID"
            value={fBiometricId}
            onChange={(e) => setFBiometricId(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="CNIC No."
            value={fCnic}
            onChange={(e) => setFCnic(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Name"
            value={fName}
            onChange={(e) => setFName(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Designation"
            value={fDesignation}
            onChange={(e) => setFDesignation(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Cost Center"
            value={fCostCenter}
            onChange={(e) => setFCostCenter(e.target.value)}
          />
        </div>
      </div>

      <div className="table-shell card-soft p-0 custom-thin-scroll table-fixed-viewport">
        <table
          className="table-enhanced table-no-wrap"
          style={{ tableLayout: "auto", minWidth: "100%" }}
        >
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>Biometric ID</th>
              <th>CNIC No.</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Cost Center</th>
              {days.map((d) => (
                <th key={d.label} className="text-center">
                  {d.dow} {d.label}
                </th>
              ))}
              <th>Total Days</th>
              <th>Present</th>
              <th>Not Mark</th>
              <th>Absent</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.sr}>
                <td>{r.sr}</td>
                <td>{r.biometricId || "-"}</td>
                <td>{r.cnic || "-"}</td>
                <td>{r.name}</td>
                <td>{r.designation || "-"}</td>
                <td>{r.roleTag || "-"}</td>
                {r.marks.map((m, i) => {
                  const future = isFutureDay(i);
                  const text = future ? "N/A" : m || "";
                  const cls = future
                    ? ""
                    : m === "P"
                    ? "mark-present"
                    : "mark-absent";
                  return (
                    <td key={i} className={cls}>
                      {text}
                    </td>
                  );
                })}
                <td>{r.totals.totalDays}</td>
                <td className="mark-present">{r.totals.present}</td>
                <td>{r.totals.notMark}</td>
                <td className="mark-absent">{r.totals.absent}</td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td
                  colSpan={11 + days.length}
                  className="text-center py-6 text-gray-500 text-xs"
                >
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationFMOPage;
