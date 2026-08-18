import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import {
  DAYS,
  statusBadgeClass,
  scopeLabel,
  periodLabel,
  cycleLabel,
  approverLabel,
  canModify,
  timeRangeLabel,
} from "../rosterUtils";
import {
  designationRank,
  isLongDuty,
  staffCountSummary,
} from "../../../utils/dutyRoster";
import { openDutyRosterPrint } from "../dutyRosterPrint";
import { exportDutyRosterFormExcel } from "../dutyRosterExcel";

const ACTION_LABELS = {
  SUBMITTED: "Submitted",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const entryDesignation = (en) =>
  en?.employee?.employmentRecords?.[0]?.designation?.title || "";

// A day's schedule cell: Weekly Off shown in bold, and any duty over 8 hours
// highlighted.
function DayCell({ day }) {
  if (!day) return <span className="text-gray-300">—</span>;
  if (day.type === "weekly_off") {
    return <span className="font-bold text-rose-700">Weekly Off</span>;
  }
  if (day.type === "offsite") {
    return <span>Offsite: {day.location || "—"}</span>;
  }
  if (day.type === "time" && (day.time_from || day.time_to)) {
    const long = isLongDuty(day.time_from, day.time_to);
    return (
      <span
        className={
          long
            ? "font-semibold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5 whitespace-nowrap"
            : "whitespace-nowrap"
        }
        title={long ? "Duty exceeds 8 hours" : undefined}
      >
        {timeRangeLabel(day.time_from, day.time_to)}
        {long ? " ⚠" : ""}
      </span>
    );
  }
  return <span className="text-gray-300">—</span>;
}

const ViewRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);
  const [graceInput, setGraceInput] = useState("");
  const [savingGrace, setSavingGrace] = useState(false);

  useEffect(() => {
    rosterService
      .get(id)
      .then((res) => {
        setRoster(res.roster);
        setGraceInput(String(res.roster?.grace_minutes ?? 0));
      })
      .catch((e) => setError(e?.response?.data?.error || "Failed to load roster"));
  }, [id]);

  const isEstablishment = /^\s*establishment/i.test(user?.role?.name || "");

  const saveGrace = async () => {
    const minutes = Number(graceInput);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
      toastBus.emit({
        type: "error",
        message: "Grace must be a whole number of minutes (0–240).",
      });
      return;
    }
    setSavingGrace(true);
    try {
      const res = await rosterService.setGrace(roster.id, minutes);
      setRoster(res.roster);
      setGraceInput(String(res.roster?.grace_minutes ?? 0));
      toastBus.emit({ type: "success", message: "Grace period updated" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to update grace period",
      });
    } finally {
      setSavingGrace(false);
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!roster) return <LoadingSpinner text="Loading roster..." />;

  const isHq = roster.scope === "HQ_DEPARTMENT";

  // Arrange designation-wise (Incharge → Supervisor → Record Keeper → Security
  // Guard → others), then by name.
  const sortedEntries = [...(roster.entries || [])].sort(
    (a, b) =>
      designationRank(entryDesignation(a)) - designationRank(entryDesignation(b)) ||
      (a.employee?.full_name || "").localeCompare(b.employee?.full_name || "")
  );
  const staffCounts = staffCountSummary(roster.entries || [], entryDesignation);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            {roster.title || `Duty Roster #${roster.id}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span>
              {isHq ? "HQ Department" : "Location"}:{" "}
              <span className="font-medium">{scopeLabel(roster)}</span>
            </span>
            <span>·</span>
            <span>
              {roster.roster_type === "PERMANENT"
                ? "Permanent"
                : cycleLabel(roster) || "Monthly"}{" "}
              — {periodLabel(roster)}
            </span>
            <span className={statusBadgeClass(roster.status)}>{roster.status}</span>
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button
            onClick={() => {
              if (!openDutyRosterPrint(roster)) {
                toastBus.emit({
                  type: "error",
                  message: "Allow pop-ups to open the printable roster form.",
                });
              }
            }}
            className="btn btn-primary"
            title="Open the printable staff duty roster form (Print or Save as PDF)"
          >
            Duty Roster Form (PDF)
          </button>
          <button
            onClick={() => {
              try {
                exportDutyRosterFormExcel(roster);
              } catch (e) {
                toastBus.emit({
                  type: "error",
                  message: "Failed to export the roster form to Excel.",
                });
              }
            }}
            className="btn btn-secondary"
            title="Download the staff duty roster form as an Excel file"
          >
            Form (Excel)
          </button>
          {canModify(roster, user) && (
            <button
              onClick={() => navigate(`/rosters/${roster.id}/edit`)}
              className="btn btn-secondary"
            >
              Edit
            </button>
          )}
          <button onClick={() => navigate("/rosters")} className="btn btn-outline">
            Back
          </button>
        </div>
      </div>

      {/* Status banners */}
      {roster.status === "PENDING" && (
        <div className="card-soft p-4 border-l-4 border-amber-400 text-sm text-gray-600">
          Pending approval with <span className="font-medium">{approverLabel(roster)}</span>.
        </div>
      )}
      {roster.status === "REJECTED" && roster.rejection_reason && (
        <div className="card-soft p-4 border-l-4 border-red-400 text-sm text-gray-600">
          <span className="font-medium text-red-700">Rejected:</span> {roster.rejection_reason}
        </div>
      )}
      {roster.status === "APPROVED" && (
        <div className="card-soft p-4 border-l-4 border-green-400 text-sm text-gray-600">
          Approved by{" "}
          <span className="font-medium">
            {roster.approvedBy?.employee?.full_name || roster.approvedBy?.email || "—"}
          </span>
          {roster.approved_at ? ` on ${new Date(roster.approved_at).toLocaleString()}` : ""}. This
          roster is locked — submit a new roster for the same period to supersede it.
        </div>
      )}
      {isHq && (
        <div className="text-xs text-gray-400">
          HQ employees not listed on any approved roster default to {timeRangeLabel("09:15", "17:00")},
          Monday to Friday.
        </div>
      )}

      {/* Grace period — HQ rosters only; editable by the Establishment account */}
      {isHq && (
        <div className="card-soft p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700">
              Late-arrival grace period
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              A check-in within this many minutes past duty start is treated as on
              time.
              {isEstablishment
                ? " Set by the Establishment account."
                : " Only the Establishment account can change this."}
            </div>
          </div>
          {isEstablishment ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={240}
                className="form-input w-24"
                value={graceInput}
                onChange={(e) => setGraceInput(e.target.value)}
              />
              <span className="text-xs text-gray-500">min</span>
              <button
                onClick={saveGrace}
                disabled={
                  savingGrace ||
                  String(roster.grace_minutes ?? 0) === String(graceInput)
                }
                className="btn btn-primary"
              >
                {savingGrace ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <div className="text-lg font-semibold text-gray-800">
              {roster.grace_minutes || 0}{" "}
              <span className="text-sm font-normal text-gray-500">min</span>
            </div>
          )}
        </div>
      )}

      {/* Staff count summary (designation-wise) */}
      {staffCounts.length > 0 && (
        <div className="card-soft p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Staff on this roster ({roster.entries.length})
          </div>
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
        </div>
      )}

      {/* Schedule — desktop table */}
      <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
        <table className="table-enhanced table-no-wrap min-w-full">
          <thead>
            <tr>
              <th>#</th>
              <th className="text-left">Employee</th>
              <th className="text-left">Designation</th>
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
            {sortedEntries.map((en, i) => {
              const emp = en.employee;
              const desig = emp?.employmentRecords?.[0]?.designation?.title || "—";
              const cwo = en.day_schedules?._collective_weekly_off;
              return (
                <tr key={en.id}>
                  <td className="text-gray-500">{i + 1}</td>
                  <td className="text-left font-medium whitespace-nowrap">{emp?.full_name}</td>
                  <td className="text-left whitespace-nowrap">{desig}</td>
                  {DAYS.map((d) => (
                    <td key={d} className="text-left whitespace-nowrap">
                      <DayCell day={en.day_schedules?.[d]} />
                    </td>
                  ))}
                  <td className="text-left whitespace-nowrap">
                    {cwo?.enabled ? `${cwo.from || "—"} → ${cwo.to || "—"}` : "—"}
                  </td>
                  <td className="text-left">{en.remarks || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Schedule — mobile cards */}
      <div className="md:hidden space-y-2">
        {sortedEntries.map((en, i) => {
          const emp = en.employee;
          const cwo = en.day_schedules?._collective_weekly_off;
          return (
            <div key={en.id} className="card-soft p-4">
              <div className="font-medium text-gray-800">
                <span className="text-gray-400 mr-1">{i + 1}.</span>
                {emp?.full_name}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {emp?.employmentRecords?.[0]?.designation?.title || "—"}
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {DAYS.map((d) => (
                  <div key={d} className="flex justify-between border-b border-gray-50 py-1">
                    <span className="text-gray-500">{d}</span>
                    <span className="text-gray-700">
                      <DayCell day={en.day_schedules?.[d]} />
                    </span>
                  </div>
                ))}
                {cwo?.enabled && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Collective off</span>
                    <span className="text-gray-700">
                      {cwo.from || "—"} → {cwo.to || "—"}
                    </span>
                  </div>
                )}
                {en.remarks && <div className="text-gray-500 pt-1">Remarks: {en.remarks}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval timeline */}
      {roster.statusHistory?.length > 0 && (
        <div className="card-soft p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">History</h3>
          <ol className="space-y-2">
            {roster.statusHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span
                  className={
                    h.action === "APPROVED"
                      ? "badge badge-green"
                      : h.action === "REJECTED"
                      ? "badge badge-red"
                      : "badge badge-blue"
                  }
                >
                  {ACTION_LABELS[h.action] || h.action}
                </span>
                <span className="text-gray-600">
                  {h.user?.employee?.full_name || h.user?.email || `User #${h.user_id}`}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
                {h.reason && <span className="text-xs text-gray-500 w-full">“{h.reason}”</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default ViewRoster;
