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
  EFFECTIVE_STATE,
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

// The comparison endpoint returns raw stored values ("09:00-17:00"); show them
// the same 12-hour way as the rest of the page.
function prettyCell(text) {
  if (!text) return "-";
  const m = String(text).match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  return m ? timeRangeLabel(m[1], m[2]) : text;
}

const ViewRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);
  const [graceInput, setGraceInput] = useState("");
  // Other rosters covering the same bazaar and period
  const [overlaps, setOverlaps] = useState([]);
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  // Approve / reject straight from here, for whoever is the approver
  const [canApprove, setCanApprove] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [savingGrace, setSavingGrace] = useState(false);

  const load = () =>
    rosterService
      .get(id)
      .then((res) => {
        setRoster(res.roster);
        setGraceInput(String(res.roster?.grace_minutes ?? 0));
        setOverlaps(res.overlaps || []);
        setCanApprove(!!res.can_approve);
        setDiff(null);
      })
      .catch((e) => setError(e?.response?.data?.error || "Failed to load roster"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const doApprove = async () => {
    setActing(true);
    try {
      await rosterService.approve(id);
      toastBus.emit({ type: "success", message: `Roster #${id} approved` });
      setConfirmApprove(false);
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to approve" });
    } finally {
      setActing(false);
    }
  };

  const doReject = async () => {
    if (!reason.trim()) {
      toastBus.emit({ type: "error", message: "A rejection reason is required." });
      return;
    }
    setActing(true);
    try {
      await rosterService.reject(id, reason.trim());
      toastBus.emit({ type: "success", message: `Roster #${id} rejected` });
      setRejecting(false);
      setReason("");
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to reject" });
    } finally {
      setActing(false);
    }
  };

  const isEstablishment = /^\s*establishment/i.test(user?.role?.name || "");

  // The diff is only worth fetching when the user asks for it — it loads every
  // entry of every overlapping roster.
  const loadDiff = async () => {
    setDiffLoading(true);
    try {
      setDiff(await rosterService.overlaps(id));
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to compare rosters",
      });
    } finally {
      setDiffLoading(false);
    }
  };

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

  const approveSummary = diff?.summary;

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
          {canApprove && (
            <>
              <button onClick={() => setConfirmApprove(true)} className="btn btn-success">
                Approve
              </button>
              <button onClick={() => setRejecting(true)} className="btn btn-error-soft">
                Reject
              </button>
            </>
          )}
          {canModify(roster, user) && (
            <button
              onClick={() => navigate(`/rosters/${roster.id}/edit`)}
              className="btn btn-secondary"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/rosters"))}
            className="btn btn-outline"
            title="Back to the roster list, with your filters intact"
          >
            Back
          </button>
        </div>
      </div>

      {/* Several rosters cover this bazaar and month. Say plainly which one
          attendance is using, and exactly what this one changes. */}
      {overlaps.length > 0 && (
        <div className="card-soft p-4 border-l-4 border-blue-400 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                This bazaar has {overlaps.length + 1} rosters for this month
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Attendance uses the approved roster with the latest approval. The others are not
                applied.
              </p>
            </div>
            <button onClick={loadDiff} disabled={diffLoading} className="btn btn-outline btn-sm">
              {diffLoading ? "Loading..." : diff ? "Refresh" : "Show what changes"}
            </button>
          </div>

          {diff && (
            <>
              {/* one row per roster: which is applied, which is waiting */}
              <div className="overflow-x-auto custom-thin-scroll">
                <table className="table-enhanced min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Roster</th>
                      <th className="text-left">State</th>
                      <th>Staff</th>
                      <th className="text-left">Created by</th>
                      <th className="text-left">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.all_for_period.map((r) => {
                      const st = EFFECTIVE_STATE[r.effective_state];
                      const isThis = r.id === diff.this_roster.id;
                      return (
                        <tr key={r.id} className={isThis ? "bg-blue-50/50" : ""}>
                          <td className="text-left">
                            {isThis ? (
                              <span className="font-semibold">#{r.id} (this one)</span>
                            ) : (
                              <button
                                onClick={() => navigate(`/rosters/${r.id}`)}
                                className="text-blue-600 hover:underline"
                              >
                                #{r.id}
                              </button>
                            )}
                          </td>
                          <td className="text-left">
                            <span className={st?.cls || "badge badge-gray"} title={st?.hint}>
                              {st?.label || r.status}
                            </span>
                          </td>
                          <td>{r.entry_count}</td>
                          <td className="text-left">{r.created_by || "-"}</td>
                          <td className="text-left whitespace-nowrap">
                            {r.approved_at ? new Date(r.approved_at).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* what this roster does to the applied one */}
              {!diff.compared_with ? (
                <div className="text-xs text-gray-600">
                  Nothing approved yet for this month, so there is nothing to compare against - the
                  timings below are what will apply once a roster is approved.
                </div>
              ) : diff.summary.identical ? (
                <div className="text-xs text-gray-600">
                  Identical to roster #{diff.compared_with.id} - same staff, same timings. A repeat
                  submission with nothing to review.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-700">
                    {diff.this_roster.effective_state === "IN_FORCE" ? (
                      <>
                        <span className="font-semibold text-green-700">This roster is applied.</span>{" "}
                        Against the roster it replaced (#{diff.compared_with.id}) it changed{" "}
                        <span className="font-semibold">{diff.summary.day_changes}</span> day
                        {diff.summary.day_changes === 1 ? "" : "s"} for{" "}
                        <span className="font-semibold">{diff.summary.employees_affected}</span>{" "}
                        employee{diff.summary.employees_affected === 1 ? "" : "s"}.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-amber-700">
                          Not applied - roster #{diff.in_force?.id} is in force.
                        </span>{" "}
                        Approving this one would change{" "}
                        <span className="font-semibold">{diff.summary.day_changes}</span> day
                        {diff.summary.day_changes === 1 ? "" : "s"} for{" "}
                        <span className="font-semibold">{diff.summary.employees_affected}</span>{" "}
                        employee{diff.summary.employees_affected === 1 ? "" : "s"}
                        {diff.summary.added > 0 && `, add ${diff.summary.added}`}
                        {diff.summary.removed > 0 && `, drop ${diff.summary.removed}`}.
                      </>
                    )}
                  </div>

                  <div className="overflow-x-auto custom-thin-scroll">
                    <table className="table-enhanced min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Employee</th>
                          <th className="text-left">Day</th>
                          <th className="text-left">Applied now (#{diff.compared_with.id})</th>
                          <th className="text-left">This roster</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diff.changes.map((emp) =>
                          emp.days.map((d, i) => (
                            <tr key={`${emp.employee_id}-${d.day}`}>
                              <td className="text-left">
                                {i === 0 ? (
                                  <>
                                    {emp.employee_name}
                                    {emp.is_new && (
                                      <span className="badge badge-blue ml-1">new</span>
                                    )}
                                  </>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="text-left">{d.day}</td>
                              <td className="text-left whitespace-nowrap text-gray-600">
                                {d.applied ? prettyCell(d.applied) : "not rostered"}
                              </td>
                              <td className="text-left whitespace-nowrap font-medium text-amber-800">
                                {prettyCell(d.proposed)}
                              </td>
                            </tr>
                          ))
                        )}
                        {diff.removed.map((emp) => (
                          <tr key={`rm-${emp.employee_id}`}>
                            <td className="text-left">{emp.employee_name}</td>
                            <td className="text-left" colSpan={2}>
                              <span className="text-gray-600">
                                in #{diff.compared_with.id}
                              </span>
                            </td>
                            <td className="text-left text-red-700">dropped from this roster</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Status banners */}
      {roster.status === "PENDING" && (
        <div className="card-soft p-4 border-l-4 border-amber-400 text-sm text-gray-600">
          Pending approval with <span className="font-medium">{approverLabel(roster)}</span>.
          {canApprove && (
            <>
              {" "}
              <span className="font-medium text-amber-800">You can approve this roster.</span>
              {overlaps.length > 0 && !diff && (
                <>
                  {" "}
                  <button onClick={loadDiff} className="text-blue-600 hover:underline">
                    Review what it changes first
                  </button>
                  .
                </>
              )}
            </>
          )}
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
      {/* Approve — restate the effect so nobody approves blind */}
      {confirmApprove && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Approve roster #{roster.id}?</h3>
            <p className="text-sm text-gray-600 mb-3">
              {scopeLabel(roster)} · {periodLabel(roster)}
            </p>
            {overlaps.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 mb-3">
                {approveSummary ? (
                  <>
                    This becomes the applied roster for the period. It changes{" "}
                    <span className="font-semibold">{approveSummary.day_changes}</span> day
                    {approveSummary.day_changes === 1 ? "" : "s"} for{" "}
                    <span className="font-semibold">{approveSummary.employees_affected}</span>{" "}
                    employee{approveSummary.employees_affected === 1 ? "" : "s"}
                    {approveSummary.added > 0 && `, adds ${approveSummary.added}`}
                    {approveSummary.removed > 0 && `, drops ${approveSummary.removed}`}.
                  </>
                ) : (
                  <>
                    {overlaps.length} other roster{overlaps.length === 1 ? "" : "s"} cover this
                    period. Approving this one replaces whichever is applied now.{" "}
                    <button
                      onClick={() => {
                        setConfirmApprove(false);
                        loadDiff();
                      }}
                      className="underline font-medium"
                    >
                      See what changes
                    </button>
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">
              Once approved the roster is locked — corrections are made by submitting a new one.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmApprove(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={doApprove} disabled={acting} className="btn btn-success">
                {acting ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject — reason is required */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Reject roster #{roster.id}</h3>
            <p className="text-sm text-gray-600 mb-3">
              The creator sees your reason and can correct and resubmit.
            </p>
            <textarea
              className="form-input w-full"
              rows={3}
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejecting(false);
                  setReason("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={doReject} disabled={acting} className="btn btn-error">
                {acting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ViewRoster;
