import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import rosterService from "../services/rosterService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Pagination from "../../../components/ui/Pagination";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import {
  statusBadgeClass,
  scopeLabel,
  periodLabel,
  cycleLabel,
  approverLabel,
  canModify,
  canDelete,
  currentCycleMonth,
  cycleMonthLabel,
  cycleMonthRange,
  cycleMonthOptions,
} from "../rosterUtils";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];
const SCOPE_FILTERS = [
  { value: "ALL", label: "All scopes" },
  { value: "LOCATION", label: "Bazaars & Locations" },
  { value: "HQ_DEPARTMENT", label: "HQ Departments" },
];
const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "id_asc", label: "Roster # ascending" },
  { value: "id_desc", label: "Roster # descending" },
];

// One coverage number. Clicking it narrows the table to the same set.
const StatTile = ({ label, value, tone = "gray", onClick, title }) => {
  const tones = {
    gray: "border-gray-200 text-gray-800",
    blue: "border-blue-200 text-blue-700 bg-blue-50/60",
    green: "border-green-200 text-green-700 bg-green-50/60",
    amber: "border-amber-200 text-amber-700 bg-amber-50/60",
    red: "border-red-200 text-red-700 bg-red-50/60",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={!onClick}
      className={`rounded-lg border px-3 py-2 text-left bg-white transition ${tones[tone]} ${
        onClick ? "hover:shadow-sm cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="text-lg font-semibold leading-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
    </button>
  );
};

const RosterList = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);

  const [data, setData] = useState({ rosters: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [month, setMonth] = useState(""); // "" = all months
  const [status, setStatus] = useState("ALL");
  const [scope, setScope] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Coverage (always for a concrete cycle month)
  const coverageMonth = month || currentCycleMonth();
  const [coverage, setCoverage] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { scope, statuses[], title }
  const [detailSearch, setDetailSearch] = useState("");

  // Late-arrival grace for HQ rosters (Establishment account)
  const [graceOpen, setGraceOpen] = useState(false);
  const [grace, setGrace] = useState(null); // { default_minutes, departments, ... }
  const [graceTarget, setGraceTarget] = useState(""); // "" = all HQ departments
  const [graceMinutes, setGraceMinutes] = useState("");
  const [graceSaveDefault, setGraceSaveDefault] = useState(true);
  const [graceSaving, setGraceSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const canCreate = can("roster.create") && (user?.location_id || user?.department_id);
  const isSuperAdmin = user?.role?.name === "Super Admin";
  const canSetGrace = isSuperAdmin || /^\s*establishment/i.test(user?.role?.name || "");
  const monthOptions = useMemo(() => cycleMonthOptions(), []);

  // Debounce the search box so typing doesn't hammer the API
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Changing a filter always restarts at page 1. Batched with the filter change
  // itself (same event) so the list is fetched once, not twice.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const changeMonth = withPageReset(setMonth);
  const changeStatus = withPageReset(setStatus);
  const changeScope = withPageReset(setScope);
  const changeSort = withPageReset(setSort);
  const changeLimit = withPageReset(setLimit);

  const loadList = async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort };
      if (status !== "ALL") params.status = status;
      if (scope !== "ALL") params.scope = scope;
      if (month) params.month = month;
      if (search) params.search = search;
      const res = await rosterService.list(params);
      setData(res);
      // The server clamps a stale page to the last available one
      if (res.page && res.page !== page) setPage(res.page);
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to load rosters",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCoverage = async () => {
    setCoverageLoading(true);
    try {
      setCoverage(await rosterService.coverage(coverageMonth));
    } catch {
      // Coverage is supplementary — the list below still works without it
      setCoverage(null);
    } finally {
      setCoverageLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, scope, month, search, sort]);

  useEffect(() => {
    loadCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverageMonth]);

  const refreshAll = async () => {
    await Promise.all([loadList(), loadCoverage()]);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await rosterService.remove(confirmDeleteId);
      toastBus.emit({ type: "success", message: "Roster deleted" });
      setConfirmDeleteId(null);
      await refreshAll();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to delete" });
    } finally {
      setDeleting(false);
    }
  };

  const doBulkDelete = async () => {
    if (bulkConfirmText.trim().toLowerCase() !== "delete") return;
    setBulkDeleting(true);
    try {
      const res = await rosterService.bulkDeleteAll(bulkConfirmText.trim());
      toastBus.emit({
        type: "success",
        message: `Deleted ${res.count ?? 0} roster(s)`,
      });
      setBulkOpen(false);
      setBulkConfirmText("");
      await refreshAll();
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to delete rosters",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const openGrace = async () => {
    setGraceOpen(true);
    setGrace(null);
    try {
      const res = await rosterService.graceSettings();
      setGrace(res);
      setGraceTarget("");
      setGraceMinutes(String(res.default_minutes ?? 15));
      setGraceSaveDefault(true);
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to load grace settings",
      });
      setGraceOpen(false);
    }
  };

  const saveGrace = async () => {
    const minutes = Number(graceMinutes);
    const max = grace?.max_minutes ?? 240;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > max) {
      toastBus.emit({
        type: "error",
        message: `Grace must be a whole number of minutes (0–${max}).`,
      });
      return;
    }
    setGraceSaving(true);
    try {
      const res = await rosterService.setBulkGrace({
        department_id: graceTarget === "" ? null : Number(graceTarget),
        grace_minutes: minutes,
        save_default: graceSaveDefault,
      });
      toastBus.emit({
        type: "success",
        message: `Grace set to ${minutes} min for ${res.target} — ${res.updated} roster(s) updated.`,
      });
      setGraceOpen(false);
      await loadList();
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to set grace period",
      });
    } finally {
      setGraceSaving(false);
    }
  };

  // How many rosters the current selection will touch
  const graceTargetCount =
    graceTarget === ""
      ? grace?.total_hq_rosters ?? 0
      : grace?.departments?.find((d) => String(d.id) === String(graceTarget))?.roster_count ?? 0;

  const resetFilters = () => {
    setMonth("");
    setStatus("ALL");
    setScope("ALL");
    setSort("recent");
    setSearchInput("");
    setSearch("");
    setLimit(25);
    setPage(1);
  };

  const filtersActive =
    month || status !== "ALL" || scope !== "ALL" || search || sort !== "recent";

  // Clicking a coverage tile filters the table to the matching rosters
  const applyCoverageFilter = (unitScope, unitStatus) => {
    setMonth(coverageMonth);
    setScope(unitScope);
    setStatus(unitStatus);
    setPage(1);
  };

  // Units without a roster have nothing to show in the table — list them instead
  const openDetail = (unitScope, statuses, title) => {
    setDetailSearch("");
    setDetail({ scope: unitScope, statuses, title });
  };

  const detailUnits = useMemo(() => {
    if (!detail || !coverage?.units) return [];
    const q = detailSearch.trim().toLowerCase();
    return coverage.units
      .filter((u) => (detail.scope === "ALL" ? true : u.scope === detail.scope))
      .filter((u) => detail.statuses.includes(u.status))
      .filter((u) => (q ? u.name.toLowerCase().includes(q) : true));
  }, [detail, detailSearch, coverage]);

  const typeLabel = (r) =>
    r.roster_type === "PERMANENT" ? "Permanent" : cycleLabel(r) || "Monthly";

  const firstIndex = (data.page ? data.page - 1 : page - 1) * limit;

  const coverageGroups = coverage
    ? [
        { key: "LOCATION", title: "Bazaars & Locations", stats: coverage.summary?.LOCATION },
        { key: "HQ_DEPARTMENT", title: "HQ Departments", stats: coverage.summary?.HQ_DEPARTMENT },
      ].filter((g) => g.stats && g.stats.total > 0)
    : [];

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
          <button onClick={refreshAll} className="btn btn-outline">
            Refresh
          </button>
          {can("roster.approve") && (
            <button onClick={() => navigate("/rosters/approvals")} className="btn btn-outline">
              Approvals
            </button>
          )}
          {canSetGrace && (
            <button onClick={openGrace} className="btn btn-outline">
              Grace Period
            </button>
          )}
          {canCreate && (
            <button onClick={() => navigate("/rosters/create")} className="btn btn-primary">
              Create Roster
            </button>
          )}
          {isSuperAdmin && data.total > 0 && (
            <button
              onClick={() => {
                setBulkConfirmText("");
                setBulkOpen(true);
              }}
              className="btn btn-error"
            >
              Delete All Rosters
            </button>
          )}
        </div>
      </div>

      {/* ---- Coverage for the selected cycle ---- */}
      <div className="card-soft p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Roster coverage — {cycleMonthLabel(coverageMonth)}
            </h2>
            <p className="text-[11px] text-gray-500">
              Cycle {cycleMonthRange(coverageMonth)} · counted per location / department
              {!month && " · showing the current cycle (pick a month below to change)"}
            </p>
          </div>
          {coverage?.scoped && (
            <span className="badge badge-gray self-start">Limited to your own unit</span>
          )}
        </div>

        {coverageLoading ? (
          <div className="text-xs text-gray-500 py-4">Loading coverage…</div>
        ) : !coverageGroups.length ? (
          <div className="text-xs text-gray-500 py-4">
            No locations or departments are assigned to your account, so there is nothing to
            summarise.
          </div>
        ) : (
          <div className="space-y-3">
            {coverageGroups.map((g) => (
              <div key={g.key}>
                <div className="text-xs font-medium text-gray-600 mb-1.5">
                  {g.title}{" "}
                  <span className="text-gray-400">
                    ({g.stats.created} of {g.stats.total} created)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <StatTile
                    label="Total units"
                    value={g.stats.total}
                    title={`All ${g.title.toLowerCase()} expected to submit a roster`}
                    onClick={() => openDetail(g.key, ["APPROVED", "PENDING", "REJECTED", "NOT_CREATED"], `${g.title} — all units`)}
                  />
                  <StatTile
                    label="Created"
                    value={g.stats.created}
                    tone="blue"
                    title="Units that submitted at least one roster for this cycle"
                    onClick={() => applyCoverageFilter(g.key, "ALL")}
                  />
                  <StatTile
                    label="Not created"
                    value={g.stats.notCreated}
                    tone="red"
                    title="Units with no roster at all for this cycle — click to list them"
                    onClick={() => openDetail(g.key, ["NOT_CREATED"], `${g.title} — no roster for ${cycleMonthLabel(coverageMonth)}`)}
                  />
                  <StatTile
                    label="Pending"
                    value={g.stats.pending}
                    tone="amber"
                    title="Submitted and waiting for approval"
                    onClick={() => applyCoverageFilter(g.key, "PENDING")}
                  />
                  <StatTile
                    label="Approved"
                    value={g.stats.approved}
                    tone="green"
                    title="Approved and in force for this cycle"
                    onClick={() => applyCoverageFilter(g.key, "APPROVED")}
                  />
                </div>
                {g.stats.rejected > 0 && (
                  <button
                    onClick={() => applyCoverageFilter(g.key, "REJECTED")}
                    className="text-[11px] text-red-600 mt-1.5 hover:underline"
                  >
                    {g.stats.rejected} unit(s) currently rejected — needs correction
                  </button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-1">
              {coverage.totalRosters} roster(s) fall inside this cycle. A unit that submitted more
              than one roster is counted once, by its best status (approved &gt; pending &gt;
              rejected).
            </p>
          </div>
        )}
      </div>

      {/* ---- Filters ---- */}
      <div className="card-soft p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Search</label>
            <input
              className="form-input w-full"
              placeholder="Title, bazaar, department, creator or roster #"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Month (cycle)</label>
            <select
              className="form-input w-full"
              value={month}
              onChange={(e) => changeMonth(e.target.value)}
            >
              <option value="">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {cycleMonthLabel(m)} ({cycleMonthRange(m)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Scope</label>
            <select
              className="form-input w-full"
              value={scope}
              onChange={(e) => changeScope(e.target.value)}
            >
              {SCOPE_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Sort by</label>
            <select
              className="form-input w-full"
              value={sort}
              onChange={(e) => changeSort(e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`btn btn-sm ${status === s ? "btn-primary" : "btn-outline"}`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          {filtersActive && (
            <button onClick={resetFilters} className="btn btn-sm btn-ghost">
              Reset filters
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {loading ? "Loading…" : `${data.total ?? 0} roster(s) found`}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading rosters..." />
      ) : !data.rosters?.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No rosters match the current filters.
          {filtersActive && (
            <button onClick={resetFilters} className="btn btn-sm btn-outline ml-2">
              Clear filters
            </button>
          )}
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
                  <th>Entries</th>
                  <th>Status</th>
                  <th className="text-left">Pending With</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rosters.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-gray-500">{firstIndex + i + 1}</td>
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
                          <button
                            onClick={() => navigate(`/rosters/${r.id}/edit`)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete(r, user) && (
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="btn btn-error-soft btn-sm"
                          >
                            Delete
                          </button>
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
            {data.rosters.map((r, i) => (
              <div key={r.id} className="card-soft p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800">
                      <span className="text-gray-400 mr-1">{firstIndex + i + 1}.</span>
                      {r.title || `Roster #${r.id}`}
                    </div>
                    <div className="text-xs text-gray-500">{scopeLabel(r)}</div>
                  </div>
                  <span className={statusBadgeClass(r.status)}>{r.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  #{r.id} · {typeLabel(r)} · {periodLabel(r)} · {r._count?.entries ?? 0} employees
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
                    <button
                      onClick={() => navigate(`/rosters/${r.id}/edit`)}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete(r, user) && (
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="btn btn-error-soft btn-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card-soft p-3">
            <Pagination
              currentPage={data.page || page}
              totalPages={data.totalPages || 1}
              totalItems={data.total || 0}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={changeLimit}
              pageSizeOptions={[25, 50, 100, 200]}
            />
            {/* Pagination hides itself on a single page — keep the page-size
                control reachable so a large size can be undone */}
            {(data.totalPages || 1) <= 1 && (
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  Showing all {data.total ?? 0} roster(s)
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Show:</label>
                  <select
                    value={limit}
                    onChange={(e) => changeLimit(parseInt(e.target.value))}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Coverage drill-down (units, including those with no roster) */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-semibold">{detail.title}</h3>
                <p className="text-[11px] text-gray-500">
                  {detailUnits.length} unit(s) · cycle {cycleMonthRange(coverageMonth)}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="btn btn-sm btn-ghost">
                Close
              </button>
            </div>
            <div className="p-4 pb-2">
              <input
                className="form-input w-full"
                placeholder="Search units…"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
              />
            </div>
            <div className="px-4 pb-4 overflow-y-auto custom-thin-scroll">
              {!detailUnits.length ? (
                <div className="text-sm text-gray-500 py-6 text-center">No units to show.</div>
              ) : (
                <table className="table-enhanced min-w-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="text-left">Name</th>
                      <th className="text-left">Status</th>
                      <th className="text-left">Roster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailUnits.map((u, i) => (
                      <tr key={`${u.scope}-${u.id}`}>
                        <td className="text-gray-500">{i + 1}</td>
                        <td className="text-left">{u.name}</td>
                        <td className="text-left">
                          {u.status === "NOT_CREATED" ? (
                            <span className="badge badge-gray">NOT CREATED</span>
                          ) : (
                            <span className={statusBadgeClass(u.status)}>{u.status}</span>
                          )}
                        </td>
                        <td className="text-left">
                          {u.roster_id ? (
                            <button
                              onClick={() => {
                                setDetail(null);
                                navigate(`/rosters/${u.roster_id}`);
                              }}
                              className="btn btn-outline btn-sm"
                            >
                              View #{u.roster_id}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Late-arrival grace for HQ rosters */}
      {graceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-semibold">Late-arrival grace period</h3>
                <p className="text-[11px] text-gray-500">
                  Applies to HQ department rosters — bazaar rosters do not use grace
                </p>
              </div>
              <button onClick={() => setGraceOpen(false)} className="btn btn-sm btn-ghost">
                Close
              </button>
            </div>

            {!grace ? (
              <div className="p-6 text-sm text-gray-500">Loading…</div>
            ) : (
              <>
                <div className="p-4 space-y-3 overflow-y-auto custom-thin-scroll">
                  <div className="text-xs text-gray-600">
                    Current default for new rosters:{" "}
                    <span className="font-semibold">{grace.default_minutes} min</span>. With a 9:00
                    AM start and 15 minutes, arriving up to 9:15:59 counts as on time; 9:16 is late.
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Apply to
                    </label>
                    <select
                      className="form-input w-full"
                      value={graceTarget}
                      onChange={(e) => setGraceTarget(e.target.value)}
                    >
                      <option value="">
                        HQ — all departments ({grace.total_hq_rosters} roster
                        {grace.total_hq_rosters === 1 ? "" : "s"})
                      </option>
                      {grace.departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.roster_count} roster{d.roster_count === 1 ? "" : "s"}
                          {d.roster_count
                            ? `, currently ${d.grace_minutes === null ? "mixed" : `${d.grace_minutes} min`}`
                            : ""}
                          )
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Grace period (minutes)
                    </label>
                    <input
                      className="form-input w-32"
                      type="number"
                      min={0}
                      max={grace.max_minutes}
                      value={graceMinutes}
                      onChange={(e) => setGraceMinutes(e.target.value)}
                    />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={graceSaveDefault}
                      onChange={(e) => setGraceSaveDefault(e.target.checked)}
                    />
                    <span>
                      Save as the default so rosters created from now on start with this value —
                      otherwise it has to be set again every cycle.
                    </span>
                  </label>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800">
                    This updates <span className="font-semibold">{graceTargetCount}</span> roster
                    {graceTargetCount === 1 ? "" : "s"} across{" "}
                    <span className="font-semibold">every month, including finished cycles</span>.
                    Grace decides Late vs On Time, so attendance already reported for past months
                    will be re-scored.
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                  <button onClick={() => setGraceOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={saveGrace}
                    disabled={graceSaving || !grace.can_edit}
                    className="btn btn-primary"
                  >
                    {graceSaving ? "Applying…" : `Apply to ${graceTargetCount} roster(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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

      {/* Bulk delete confirmation (Super Admin) — requires typing "delete" */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-red-700">
              Delete ALL rosters?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              This soft-deletes <span className="font-semibold">every</span> duty
              roster in the system — all locations and HQ departments, every
              status. This cannot be undone from the UI.
            </p>
            <p className="text-sm text-red-700 mb-3">
              The filters above do <span className="font-semibold">not</span> limit this — all{" "}
              rosters are removed, not just the ones currently listed.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Type <span className="font-mono font-semibold">delete</span> to
              confirm
            </label>
            <input
              className="form-input w-full"
              value={bulkConfirmText}
              onChange={(e) => setBulkConfirmText(e.target.value)}
              placeholder="delete"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setBulkOpen(false);
                  setBulkConfirmText("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={doBulkDelete}
                disabled={
                  bulkDeleting ||
                  bulkConfirmText.trim().toLowerCase() !== "delete"
                }
                className="btn btn-error"
              >
                {bulkDeleting ? "Deleting..." : "Delete all rosters"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterList;
