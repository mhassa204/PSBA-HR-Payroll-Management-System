import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { scopeLabel, periodLabel, cycleLabel } from "../rosterUtils";

// Pending duty rosters routed to the logged-in approver:
// - Operations-role users see all location rosters
// - HQ officers see rosters assigned to them (reporting-line routing)
const RosterApprovalsPage = () => {
  const navigate = useNavigate();
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmApprove, setConfirmApprove] = useState(null); // roster
  const [rejecting, setRejecting] = useState(null); // roster
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await rosterService.pendingApprovals();
      setRosters(res.rosters || []);
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to load pending approvals",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doApprove = async () => {
    setBusy(true);
    try {
      await rosterService.approve(confirmApprove.id);
      toastBus.emit({ type: "success", message: `Roster #${confirmApprove.id} approved` });
      setConfirmApprove(null);
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to approve" });
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!reason.trim()) {
      toastBus.emit({ type: "error", message: "A rejection reason is required" });
      return;
    }
    setBusy(true);
    try {
      await rosterService.reject(rejecting.id, reason.trim());
      toastBus.emit({ type: "success", message: `Roster #${rejecting.id} rejected` });
      setRejecting(null);
      setReason("");
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to reject" });
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = (r) =>
    r.roster_type === "PERMANENT" ? "Permanent" : cycleLabel(r) || "Monthly";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Roster Approvals</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Duty rosters waiting for your approval
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button onClick={load} className="btn btn-outline">
            Refresh
          </button>
          <button onClick={() => navigate("/rosters")} className="btn btn-secondary">
            All Rosters
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading approvals..." />
      ) : !rosters.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No pending approvals. 🎉
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th className="text-left">Title</th>
                  <th className="text-left">Location / Department</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Validity</th>
                  <th>Employees</th>
                  <th className="text-left">Submitted By</th>
                  <th className="text-left">Submitted</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td className="text-left">{r.title || "—"}</td>
                    <td className="text-left">{scopeLabel(r)}</td>
                    <td className="text-left">{typeLabel(r)}</td>
                    <td className="text-left whitespace-nowrap">{periodLabel(r)}</td>
                    <td>{r._count?.entries ?? 0}</td>
                    <td className="text-left">{r.createdBy?.email || "—"}</td>
                    <td className="text-left whitespace-nowrap">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-left">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => navigate(`/rosters/${r.id}`)}
                          className="btn btn-outline btn-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setConfirmApprove(r)}
                          className="btn btn-success btn-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejecting(r)}
                          className="btn btn-error-soft btn-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {rosters.map((r) => (
              <div key={r.id} className="card-soft p-4 space-y-2">
                <div className="font-medium text-gray-800">{r.title || `Roster #${r.id}`}</div>
                <div className="text-xs text-gray-500">
                  {scopeLabel(r)} · {typeLabel(r)} · {periodLabel(r)}
                </div>
                <div className="text-xs text-gray-400">
                  {r._count?.entries ?? 0} employees · by {r.createdBy?.email || "—"}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/rosters/${r.id}`)}
                    className="btn btn-outline btn-sm"
                  >
                    View
                  </button>
                  <button onClick={() => setConfirmApprove(r)} className="btn btn-success btn-sm">
                    Approve
                  </button>
                  <button onClick={() => setRejecting(r)} className="btn btn-error-soft btn-sm">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approve confirmation */}
      {confirmApprove && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">
              Approve roster #{confirmApprove.id}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {scopeLabel(confirmApprove)} · {periodLabel(confirmApprove)}. Once approved, the
              roster becomes active and can no longer be edited.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmApprove(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={doApprove} disabled={busy} className="btn btn-success">
                {busy ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject with required reason */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Reject roster #{rejecting.id}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {scopeLabel(rejecting)} · {periodLabel(rejecting)}. The creator will see your reason
              and can fix and resubmit.
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
                  setRejecting(null);
                  setReason("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={doReject} disabled={busy} className="btn btn-error">
                {busy ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterApprovalsPage;
