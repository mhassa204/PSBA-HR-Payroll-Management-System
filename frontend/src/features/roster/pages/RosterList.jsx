import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import {
  statusBadgeClass,
  scopeLabel,
  periodLabel,
  cycleLabel,
  approverLabel,
  canModify,
} from "../rosterUtils";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

const RosterList = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);

  const [data, setData] = useState({ rosters: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = can("roster.create") && (user?.location_id || user?.department_id);

  const load = async (statusFilter = status) => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await rosterService.list(params);
      setData(res);
    } catch (e) {
      toastBus.emit({ type: "error", message: "Failed to load rosters" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(status);
  }, [status]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await rosterService.remove(confirmDeleteId);
      toastBus.emit({ type: "success", message: "Roster deleted" });
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to delete" });
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = (r) =>
    r.roster_type === "PERMANENT" ? "Permanent" : cycleLabel(r) || "Monthly";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Duty Rosters</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Schedules for locations and HQ departments
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          {can("roster.approve") && (
            <button onClick={() => navigate("/rosters/approvals")} className="btn btn-outline">
              Approvals
            </button>
          )}
          {canCreate && (
            <button onClick={() => navigate("/rosters/create")} className="btn btn-primary">
              Create Roster
            </button>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`btn btn-sm ${status === s ? "btn-primary" : "btn-outline"}`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading rosters..." />
      ) : !data.rosters?.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No rosters found.
          {canCreate && " Use “Create Roster” to submit one for approval."}
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
                  <th>Entries</th>
                  <th>Status</th>
                  <th className="text-left">Pending With</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rosters.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td className="text-left">{r.title || "—"}</td>
                    <td className="text-left">{scopeLabel(r)}</td>
                    <td className="text-left">{typeLabel(r)}</td>
                    <td className="text-left whitespace-nowrap">{periodLabel(r)}</td>
                    <td>{r._count?.entries ?? 0}</td>
                    <td>
                      <span className={statusBadgeClass(r.status)}>{r.status}</span>
                    </td>
                    <td className="text-left">
                      {r.status === "PENDING" ? approverLabel(r) : "—"}
                    </td>
                    <td className="text-left">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => navigate(`/rosters/${r.id}`)}
                          className="btn btn-outline btn-sm"
                        >
                          View
                        </button>
                        {canModify(r, user) && (
                          <>
                            <button
                              onClick={() => navigate(`/rosters/${r.id}/edit`)}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(r.id)}
                              className="btn btn-error-soft btn-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {data.rosters.map((r) => (
              <div key={r.id} className="card-soft p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800">
                      {r.title || `Roster #${r.id}`}
                    </div>
                    <div className="text-xs text-gray-500">{scopeLabel(r)}</div>
                  </div>
                  <span className={statusBadgeClass(r.status)}>{r.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {typeLabel(r)} · {periodLabel(r)} · {r._count?.entries ?? 0} employees
                </div>
                {r.status === "PENDING" && (
                  <div className="text-xs text-gray-400">Pending with {approverLabel(r)}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/rosters/${r.id}`)}
                    className="btn btn-outline btn-sm"
                  >
                    View
                  </button>
                  {canModify(r, user) && (
                    <>
                      <button
                        onClick={() => navigate(`/rosters/${r.id}/edit`)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="btn btn-error-soft btn-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Delete roster #{confirmDeleteId}?</h3>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={doDelete} disabled={deleting} className="btn btn-error">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterList;
