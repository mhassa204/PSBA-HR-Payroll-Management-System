import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { statusBadgeClass, timeRangeLabel, formatTime12 } from "../rosterUtils";
import {
  designationRank,
  isLongDuty,
  staffCountSummary,
} from "../../../utils/dutyRoster";
import { exportToExcel } from "../../../lib/exportUtils";

// Plain-text form of a breakdown cell for the Excel export.
const cellExportText = (cell) => {
  if (!cell || cell.kind == null) return "-";
  if (cell.kind === "weekly_off") return "OFF";
  if (cell.kind === "offsite")
    return cell.location ? `OFFSITE: ${cell.location}` : "OFFSITE";
  const t = `${formatTime12(cell.time_from)} TO ${formatTime12(cell.time_to)}`.toUpperCase();
  return cell.conflict ? `${t} *` : t;
};

const SHORT_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dowOf = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const dayNum = (ymd) => ymd.slice(8, 10);

// One schedule cell: Weekly Off bold, >8h highlighted, conflicts ring-marked.
function BreakdownCell({ cell }) {
  if (!cell || cell.kind == null) {
    return <span className="text-gray-300">—</span>;
  }
  let body;
  if (cell.kind === "weekly_off") {
    body = <span className="font-bold text-rose-700">Weekly Off</span>;
  } else if (cell.kind === "offsite") {
    body = <span className="text-purple-700">Offsite{cell.location ? `: ${cell.location}` : ""}</span>;
  } else {
    const long = isLongDuty(cell.time_from, cell.time_to);
    body = (
      <span
        className={long ? "font-semibold text-amber-800" : ""}
        title={long ? "Duty exceeds 8 hours" : undefined}
      >
        {timeRangeLabel(cell.time_from, cell.time_to)}
        {long ? " ⚠" : ""}
      </span>
    );
  }
  if (cell.conflict) {
    return (
      <span
        className="inline-block rounded px-1 ring-2 ring-orange-400 bg-orange-50"
        title={`${cell.roster_count} rosters give different schedules for this date — showing the effective (newest-approved) one.`}
      >
        {body} <span className="text-orange-600 font-bold">*</span>
      </span>
    );
  }
  return body;
}

const CycleBreakdown = () => {
  const { scope, unitId } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get("month") || "";
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diffOnly, setDiffOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    rosterService
      .cycleBreakdown({ scope, unit_id: unitId, month })
      .then((res) => setData(res))
      .catch((e) => setError(e?.response?.data?.error || "Failed to load cycle breakdown"))
      .finally(() => setLoading(false));
  }, [scope, unitId, month]);

  const sortedEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return [...data.employees].sort(
      (a, b) =>
        designationRank(a.designation) - designationRank(b.designation) ||
        (a.name || "").localeCompare(b.name || "")
    );
  }, [data]);

  const staffCounts = useMemo(
    () => staffCountSummary(data?.employees || [], (e) => e.designation),
    [data]
  );

  // Which date columns to show: all, or only those with a conflict somewhere.
  const visibleDateIdx = useMemo(() => {
    if (!data?.dates) return [];
    const idx = data.dates.map((_, i) => i);
    if (!diffOnly) return idx;
    return idx.filter((i) => sortedEmployees.some((e) => e.days[i]?.conflict));
  }, [data, diffOnly, sortedEmployees]);

  const conflictCount = useMemo(() => {
    if (!data?.dates) return 0;
    return data.dates.filter((_, i) => sortedEmployees.some((e) => e.days[i]?.conflict)).length;
  }, [data, sortedEmployees]);

  const exportGrid = () => {
    const headers = ["Name", "Designation", ...data.dates];
    const rows = sortedEmployees.map((e) => {
      const row = { Name: e.name, Designation: e.designation || "" };
      data.dates.forEach((ymd, i) => {
        row[ymd] = cellExportText(e.days[i]);
      });
      return row;
    });
    exportToExcel(
      `Cycle_Roster_${(data.unit.name || "Unit").replace(/[\\/:*?"<>|]+/g, "-")}_${data.cycle.month}.xlsx`,
      rows,
      "Cycle Roster",
      headers,
      `${data.unit.name} — ${data.cycle.label} (combined ${data.rosters.length} roster${data.rosters.length === 1 ? "" : "s"})`
    );
  };

  if (loading) return <LoadingSpinner text="Loading cycle breakdown..." />;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Cycle Roster — {data.unit.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.cycle.label} · {data.cycle.start} → {data.cycle.end} ·{" "}
            {data.rosters.length} roster{data.rosters.length === 1 ? "" : "s"} combined
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportGrid} className="btn btn-secondary">
            Export Excel
          </button>
          <button onClick={() => navigate("/rosters")} className="btn btn-outline">
            Back
          </button>
        </div>
      </div>

      {/* The rosters that make up this cycle */}
      <div className="card-soft p-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Rosters in this cycle
        </div>
        <div className="flex flex-wrap gap-2">
          {data.rosters.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/rosters/${r.id}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
              title={`${r.entries_count} employees${r.created_by ? ` · by ${r.created_by}` : ""}`}
            >
              <span className="font-semibold">#{r.id}</span>
              <span className={statusBadgeClass(r.status)}>{r.status}</span>
              <span className="text-gray-500">
                {String(r.valid_from).slice(0, 10)}
                {r.valid_to ? ` → ${String(r.valid_to).slice(0, 10)}` : " (permanent)"}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          When rosters overlap on a date, the <span className="font-medium">newest approved</span>{" "}
          one takes effect (if none is approved yet, the latest submitted). Cells marked{" "}
          <span className="text-orange-600 font-bold">*</span> are dates where the rosters disagree.
        </p>
      </div>

      {/* Staff summary + controls */}
      <div className="card-soft p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {staffCounts.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-xs px-3 py-1"
            >
              <span className="font-semibold">{c.count}</span>
              {c.count === 1 ? c.label : `${c.label}s`}
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={diffOnly}
            onChange={(e) => setDiffOnly(e.target.checked)}
          />
          Show only dates with differences ({conflictCount})
        </label>
      </div>

      {/* Combined per-employee / per-date grid */}
      {!visibleDateIdx.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          {diffOnly
            ? "No dates have differing schedules between the rosters in this cycle."
            : "No dates to show."}
        </div>
      ) : (
        <div className="table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
          <table className="table-enhanced table-no-wrap min-w-full text-xs">
            <thead>
              <tr>
                <th className="text-left sticky left-0 bg-white z-10">Employee</th>
                <th className="text-left">Designation</th>
                {visibleDateIdx.map((i) => {
                  const ymd = data.dates[i];
                  return (
                    <th key={ymd} className="text-center whitespace-nowrap">
                      <div>{dayNum(ymd)}</div>
                      <div className="text-[10px] font-normal text-gray-400">
                        {SHORT_DOW[dowOf(ymd)]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((e) => (
                <tr key={e.employee_id}>
                  <td className="text-left font-medium whitespace-nowrap sticky left-0 bg-white">
                    {e.name}
                  </td>
                  <td className="text-left whitespace-nowrap text-gray-500">
                    {e.designation || "—"}
                  </td>
                  {visibleDateIdx.map((i) => (
                    <td key={i} className="text-center whitespace-nowrap">
                      <BreakdownCell cell={e.days[i]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CycleBreakdown;
