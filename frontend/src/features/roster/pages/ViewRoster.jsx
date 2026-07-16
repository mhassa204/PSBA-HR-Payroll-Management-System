import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useAuthStore } from "../../auth/authStore";
import {
  DAYS,
  statusBadgeClass,
  scopeLabel,
  periodLabel,
  cycleLabel,
  approverLabel,
  canModify,
} from "../rosterUtils";

const ACTION_LABELS = {
  SUBMITTED: "Submitted",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function dayCellText(day) {
  if (!day) return "—";
  if (day.type === "weekly_off") return "Weekly off";
  if (day.type === "offsite") return `Offsite: ${day.location || "—"}`;
  if (day.type === "time" && (day.time_from || day.time_to)) {
    return `${day.time_from || "—"} – ${day.time_to || "—"}`;
  }
  return "—";
}

const ViewRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    rosterService
      .get(id)
      .then((res) => setRoster(res.roster))
      .catch((e) => setError(e?.response?.data?.error || "Failed to load roster"));
  }, [id]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!roster) return <LoadingSpinner text="Loading roster..." />;

  const isHq = roster.scope === "HQ_DEPARTMENT";

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
          HQ employees not listed on any approved roster default to 09:15 – 17:00, Monday to Friday.
        </div>
      )}

      {/* Schedule — desktop table */}
      <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
        <table className="table-enhanced table-no-wrap min-w-full">
          <thead>
            <tr>
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
            {roster.entries.map((en) => {
              const emp = en.employee;
              const desig = emp?.employmentRecords?.[0]?.designation?.title || "—";
              const cwo = en.day_schedules?._collective_weekly_off;
              return (
                <tr key={en.id}>
                  <td className="text-left font-medium whitespace-nowrap">{emp?.full_name}</td>
                  <td className="text-left whitespace-nowrap">{desig}</td>
                  {DAYS.map((d) => (
                    <td key={d} className="text-left whitespace-nowrap">
                      {dayCellText(en.day_schedules?.[d])}
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
        {roster.entries.map((en) => {
          const emp = en.employee;
          const cwo = en.day_schedules?._collective_weekly_off;
          return (
            <div key={en.id} className="card-soft p-4">
              <div className="font-medium text-gray-800">{emp?.full_name}</div>
              <div className="text-xs text-gray-400 mb-2">
                {emp?.employmentRecords?.[0]?.designation?.title || "—"}
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {DAYS.map((d) => (
                  <div key={d} className="flex justify-between border-b border-gray-50 py-1">
                    <span className="text-gray-500">{d}</span>
                    <span className="text-gray-700">{dayCellText(en.day_schedules?.[d])}</span>
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
