import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Pagination from "../../../components/ui/Pagination";
import { toastBus } from "../../../utils/toastBus";
import {
  scopeLabel,
  periodLabel,
  cycleLabel,
  currentCycleMonth,
  cycleMonthLabel,
  cycleMonthOptions,
} from "../rosterUtils";

// The approver queue arrives whole (no server paging), so filtering, sorting
// and paging all happen client-side over the loaded set.
const SCOPE_FILTERS = [
  { value: "ALL", label: "All scopes" },
  { value: "LOCATION", label: "Bazaars & Locations" },
  { value: "HQ_DEPARTMENT", label: "HQ Departments" },
];

// A roster belongs to a cycle month when its validity overlaps that cycle
// (PERMANENT rosters have no end date and cover every later month).
const inCycleMonth = (roster, month) => {
  const y = parseInt(month.slice(0, 4), 10);
  const m0 = parseInt(month.slice(5, 7), 10) - 1;
  const start = Date.UTC(m0 === 0 ? y - 1 : y, m0 === 0 ? 11 : m0 - 1, 21);
  const end = Date.UTC(y, m0, 20);
  const from = new Date(roster.valid_from).getTime();
  const to = roster.valid_to ? new Date(roster.valid_to).getTime() : Infinity;
  return from <= end && to >= start;
};

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

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("ALL");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const monthOptions = useMemo(() => cycleMonthOptions(), []);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rosters
      .filter((r) => (scope === "ALL" ? true : r.scope === scope))
      .filter((r) => (month ? inCycleMonth(r, month) : true))
      .filter((r) =>
        q
          ? [r.title, scopeLabel(r), r.createdBy?.email, String(r.id)]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      );
  }, [rosters, search, scope, month]);

  const totalPages = Math.max(Math.ceil(filtered.length / limit), 1);
  const safePage = Math.min(page, totalPages);
  const firstIndex = (safePage - 1) * limit;
  const visible = filtered.slice(firstIndex, firstIndex + limit);

  // A filter change (or an approval shrinking the queue) invalidates the page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch("");
    setScope("ALL");
    setMonth("");
    setPage(1);
  };
  const filtersActive = search || scope !== "ALL" || month;

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

      {/* Filters — the queue can run to dozens of rosters across every bazaar */}
      {!loading && rosters.length > 0 && (
        <div className="card-soft p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Search</label>
              <input
                className="form-input w-full"
                placeholder="Title, bazaar, department, creator or roster #"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Month (cycle)
              </label>
              <select
                className="form-input w-full"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {cycleMonthLabel(m)}
                    {m === currentCycleMonth() ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Scope</label>
              <select
                className="form-input w-full"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setPage(1);
                }}
              >
                {SCOPE_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filtersActive && (
              <button onClick={resetFilters} className="btn btn-sm btn-ghost">
                Reset filters
              </button>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {filtered.length} of {rosters.length} pending roster(s)
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading approvals..." />
      ) : !rosters.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No pending approvals. 🎉
        </div>
      ) : !filtered.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No pending rosters match the current filters.
          <button onClick={resetFilters} className="btn btn-sm btn-outline ml-2">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roster ID</th>
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
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-gray-500">{firstIndex + i + 1}</td>
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
            {visible.map((r, i) => (
              <div key={r.id} className="card-soft p-4 space-y-2">
                <div className="font-medium text-gray-800">
                  <span className="text-gray-400 mr-1">{firstIndex + i + 1}.</span>
                  {r.title || `Roster #${r.id}`}
                </div>
                <div className="text-xs text-gray-500">
                  #{r.id} · {scopeLabel(r)} · {typeLabel(r)} · {periodLabel(r)}
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

          <div className="card-soft p-3">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
            />
            {totalPages <= 1 && (
              <div className="text-sm text-slate-600">
                Showing all {filtered.length} pending roster(s)
              </div>
            )}
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
