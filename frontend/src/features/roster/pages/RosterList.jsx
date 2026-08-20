import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  effectiveState,
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

  // Filters live in the query string, not component state: opening a roster and
  // coming back (browser Back, or the View page's Back button) restores the
  // exact same filtered page instead of dumping you on an unfiltered page 1.
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get("month") || "";
  const status = searchParams.get("status") || "ALL";
  const scope = searchParams.get("scope") || "ALL";
  const region = searchParams.get("region") || "ALL";
  const sort = searchParams.get("sort") || "recent";
  const search = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 25;
  const groupByRegion = searchParams.get("group") !== "off";
  // "bazaar" = one row per bazaar for the month (the simple view);
  // "list" = one row per roster document.
  const view = searchParams.get("view") === "list" ? "list" : "bazaar";

  // The search box is local while typing; it lands in the URL after a pause.
  const [searchInput, setSearchInput] = useState(search);

  // Values equal to the default are dropped so the URL stays short and a bare
  // /rosters is the clean default view.
  const DEFAULTS = { status: "ALL", scope: "ALL", region: "ALL", sort: "recent", page: 1, limit: 25 };
  const applyParams = (patch, { keepPage = false } = {}) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          const isDefault =
            value === "" || value === null || value === undefined ||
            String(value) === String(DEFAULTS[key]);
          if (isDefault) next.delete(key);
          else next.set(key, String(value));
        }
        // any filter change restarts at page 1
        if (!keepPage && !("page" in patch)) next.delete("page");
        return next;
      },
      { replace: true }
    );
  };

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
    const next = searchInput.trim();
    if (next === search) return;
    const t = setTimeout(() => applyParams({ q: next }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Keep the box in step when the URL changes from elsewhere (Back, a tile
  // click, Reset) rather than letting it drift from what is actually filtered.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const changeMonth = (v) => applyParams({ month: v });
  const changeStatus = (v) => applyParams({ status: v });
  const changeScope = (v) => applyParams({ scope: v });
  const changeRegion = (v) => applyParams({ region: v });
  const changeSort = (v) => applyParams({ sort: v });
  const changeLimit = (v) => applyParams({ limit: v });
  const changePage = (v) => applyParams({ page: v }, { keepPage: true });

  const loadList = async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort };
      if (status !== "ALL") params.status = status;
      if (scope !== "ALL") params.scope = scope;
      if (region !== "ALL") params.region_id = region;
      if (month) params.month = month;
      if (search) params.search = search;
      const res = await rosterService.list(params);
      setData(res);
      // The server clamps a stale page to the last available one
      if (res.page && res.page !== page) changePage(res.page);
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
  }, [page, limit, status, scope, region, month, search, sort]);

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
    setSearchInput("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const filtersActive =
    month ||
    status !== "ALL" ||
    scope !== "ALL" ||
    region !== "ALL" ||
    search ||
    sort !== "recent";

  // Clicking a KPI tile filters the table to exactly the rosters it counted
  const applyCoverageFilter = (unitScope, unitStatus) => {
    applyParams({ month: coverageMonth, scope: unitScope, status: unitStatus });
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

  // Regions come from the coverage payload — every bazaar carries the region it
  // belongs to, so no extra request is needed.
  const regionOptions = useMemo(() => {
    const map = new Map();
    for (const u of coverage?.units || []) {
      if (u.scope !== "LOCATION" || !u.region_id) continue;
      if (!map.has(u.region_id)) {
        map.set(u.region_id, { id: u.region_id, name: u.region_name, incharge: u.region_incharge });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [coverage]);

  // One row per bazaar/department for the selected month: how many of its
  // rosters are approved, which one is applied, and which are still pending.
  const unitRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (coverage?.units || [])
      .filter((u) => (scope === "ALL" ? true : u.scope === scope))
      .filter((u) => {
        if (region === "ALL") return true;
        if (region === "none") return u.scope === "LOCATION" && !u.region_id;
        return String(u.region_id) === String(region);
      })
      .filter((u) => {
        if (status === "ALL") return true;
        if (status === "APPROVED") return (u.approved_ids || []).length > 0;
        if (status === "PENDING") return (u.pending_ids || []).length > 0;
        if (status === "REJECTED") return (u.rejected_ids || []).length > 0;
        return true;
      })
      .filter((u) =>
        q
          ? [u.name, u.region_name, u.region_incharge]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)) ||
            [...(u.approved_ids || []), ...(u.pending_ids || [])].some((id) =>
              String(id).includes(q)
            )
          : true
      )
      .sort((a, b) => {
        // things needing attention first: pending, then nothing created
        const rank = (u) =>
          (u.pending_ids || []).length ? 0 : u.roster_count === 0 ? 1 : 2;
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
  }, [coverage, scope, region, status, search]);

  const regionOfRoster = (r) => {
    if (r.scope === "HQ_DEPARTMENT") {
      return { key: "hq", name: "HQ Departments", incharge: null };
    }
    const ri = r.location?.regionalIncharge;
    if (!ri) return { key: "none", name: "No region assigned", incharge: null };
    return { key: `r${ri.id}`, name: ri.region_name, incharge: ri.employee?.full_name || null };
  };

  // Rows grouped region-wise for display. Grouping is per page — the server
  // still paginates, so a region's rosters can span pages.
  // Serial numbers stay continuous down the page even when rows are grouped
  const rowIndex = useMemo(() => {
    const m = new Map();
    (data.rosters || []).forEach((r, i) => m.set(r.id, i));
    return m;
  }, [data.rosters]);

  const groupedRows = useMemo(() => {
    const rows = data.rosters || [];
    if (!groupByRegion) return [{ key: "all", name: null, incharge: null, rows }];
    const groups = new Map();
    rows.forEach((r) => {
      const g = regionOfRoster(r);
      if (!groups.has(g.key)) groups.set(g.key, { ...g, rows: [] });
      groups.get(g.key).rows.push(r);
    });
    // HQ and unassigned sit at the end; named regions alphabetical
    return [...groups.values()].sort((a, b) => {
      const rank = (x) => (x.key === "hq" ? 2 : x.key === "none" ? 1 : 0);
      return rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "");
    });
  }, [data.rosters, groupByRegion]);

  // The cycle month a roster belongs to (named by the month its validity ends in).
  const rosterCycleMonth = (r) => {
    if (r.valid_to) {
      const d = new Date(r.valid_to);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return month || currentCycleMonth();
  };
  const unitOf = (r) => (r.scope === "HQ_DEPARTMENT" ? r.department_id : r.bazaar_id);

  // Per-unit roster count for the coverage month, to flag units with several
  // rosters in one cycle ("show them as one" → View combined).
  const unitCountMap = useMemo(() => {
    const m = new Map();
    for (const u of coverage?.units || []) m.set(`${u.scope}:${u.id}`, u.roster_count || 0);
    return m;
  }, [coverage]);
  const cycleCountFor = (r) =>
    rosterCycleMonth(r) === coverageMonth
      ? unitCountMap.get(`${r.scope}:${unitOf(r)}`) || 0
      : 0;
  const goToCycle = (r) =>
    navigate(`/rosters/cycle/${r.scope}/${unitOf(r)}?month=${rosterCycleMonth(r)}`);

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
                    ({g.stats.rosters.total} roster
                    {g.stats.rosters.total === 1 ? "" : "s"} from {g.stats.created} of{" "}
                    {g.stats.total} units)
                  </span>
                </div>

                {/* Roster counts — these are what the table below lists, so a
                    tile and the result count always agree. */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatTile
                    label="Rosters"
                    value={g.stats.rosters.total}
                    title="Roster documents falling inside this cycle"
                    onClick={() => applyCoverageFilter(g.key, "ALL")}
                  />
                  <StatTile
                    label="Approved"
                    value={g.stats.rosters.approved}
                    tone="green"
                    title="Approved rosters in this cycle"
                    onClick={() => applyCoverageFilter(g.key, "APPROVED")}
                  />
                  <StatTile
                    label="Pending"
                    value={g.stats.rosters.pending}
                    tone="amber"
                    title="Submitted and waiting for approval"
                    onClick={() => applyCoverageFilter(g.key, "PENDING")}
                  />
                  <StatTile
                    label="Rejected"
                    value={g.stats.rosters.rejected}
                    tone="red"
                    title="Rejected — the unit must correct and resubmit"
                    onClick={() => applyCoverageFilter(g.key, "REJECTED")}
                  />
                </div>

                {/* Unit coverage — a different question: how many bazaars have
                    anything at all. A bazaar with 3 rosters counts once here. */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <StatTile
                    label="Units total"
                    value={g.stats.total}
                    title={`All ${g.title.toLowerCase()} expected to submit a roster`}
                    onClick={() =>
                      openDetail(
                        g.key,
                        ["APPROVED", "PENDING", "REJECTED", "NOT_CREATED"],
                        `${g.title} — all units`
                      )
                    }
                  />
                  <StatTile
                    label="Units covered"
                    value={g.stats.created}
                    tone="blue"
                    title="Units that submitted at least one roster for this cycle"
                    onClick={() =>
                      openDetail(
                        g.key,
                        ["APPROVED", "PENDING", "REJECTED"],
                        `${g.title} — units with a roster`
                      )
                    }
                  />
                  <StatTile
                    label="Not created"
                    value={g.stats.notCreated}
                    tone="red"
                    title="Units with no roster at all for this cycle — click to list them"
                    onClick={() =>
                      openDetail(
                        g.key,
                        ["NOT_CREATED"],
                        `${g.title} — no roster for ${cycleMonthLabel(coverageMonth)}`
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-1">
              Top row counts roster documents (what the table lists). Bottom row counts units — a
              bazaar that filed several rosters for this cycle is one covered unit but several
              rosters, which is why the two rows differ.
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
              /* The by-bazaar view summarises one cycle, so "All months" is not
                 a state it can be in — show the cycle actually on screen. */
              value={view === "bazaar" ? coverageMonth : month}
              onChange={(e) => changeMonth(e.target.value)}
            >
              {view === "list" && <option value="">All months</option>}
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {cycleMonthLabel(m)} ({cycleMonthRange(m)})
                </option>
              ))}
            </select>
            {view === "bazaar" && (
              <p className="text-[11px] text-gray-400 mt-1">
                One cycle at a time — switch to "All rosters" to see every month.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Region</label>
            <select
              className="form-input w-full"
              value={region}
              onChange={(e) => changeRegion(e.target.value)}
            >
              <option value="ALL">All regions</option>
              {regionOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.incharge ? ` — ${r.incharge}` : ""}
                </option>
              ))}
              <option value="none">No region assigned</option>
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
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => applyParams({ view: "" })}
              className={`btn btn-sm ${view === "bazaar" ? "btn-primary" : "btn-outline"}`}
              title="One row per bazaar for the selected month"
            >
              By bazaar
            </button>
            <button
              onClick={() => applyParams({ view: "list" })}
              className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-outline"}`}
              title="One row per roster document"
            >
              All rosters
            </button>
          </div>
          {view === "list" && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 ml-1">
              <input
                type="checkbox"
                checked={groupByRegion}
                onChange={(e) => applyParams({ group: e.target.checked ? "" : "off" })}
              />
              Group by region
            </label>
          )}
          {filtersActive && (
            <button onClick={resetFilters} className="btn btn-sm btn-ghost">
              Reset filters
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {view === "bazaar"
              ? `${unitRows.length} bazaar/department(s) — ${cycleMonthLabel(coverageMonth)}`
              : loading
              ? "Loading…"
              : `${data.total ?? 0} roster(s) found`}
          </span>
        </div>
      </div>

      {view === "bazaar" ? (
        coverageLoading ? (
          <LoadingSpinner text="Loading bazaars..." />
        ) : !unitRows.length ? (
          <div className="card-soft p-8 text-center text-sm text-gray-500">
            No bazaars or departments match the current filters.
          </div>
        ) : (
          <div className="table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="text-left">Bazaar / Department</th>
                  <th className="text-left">Region</th>
                  <th className="text-left">Approved</th>
                  <th className="text-left">In force</th>
                  <th className="text-left">Awaiting approval</th>
                </tr>
              </thead>
              <tbody>
                {unitRows.map((u, i) => {
                  const approved = u.approved_ids || [];
                  const pending = u.pending_ids || [];
                  const rejected = u.rejected_ids || [];
                  return (
                    <tr key={`${u.scope}-${u.id}`} className={pending.length ? "bg-amber-50/40" : ""}>
                      <td className="text-gray-500">{i + 1}</td>
                      <td className="text-left">
                        <div className="font-medium text-gray-800">{u.name}</div>
                        {rejected.length > 0 && (
                          <div className="text-[11px] text-red-600">
                            rejected:{" "}
                            {rejected.map((id, k) => (
                              <span key={id}>
                                {k > 0 && ", "}
                                <button
                                  onClick={() => navigate(`/rosters/${id}`)}
                                  className="hover:underline font-medium"
                                >
                                  #{id}
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-left text-gray-600">
                        {u.scope === "HQ_DEPARTMENT" ? "HQ" : u.region_name || "—"}
                      </td>
                      <td className="text-left whitespace-nowrap">
                        {u.roster_count === 0 ? (
                          <span className="badge badge-gray">none created</span>
                        ) : (
                          <span
                            className={
                              approved.length
                                ? "font-semibold text-green-700"
                                : "font-semibold text-amber-700"
                            }
                            title={`${approved.length} of this bazaar's ${u.roster_count} roster(s) for this month are approved`}
                          >
                            {approved.length} / {u.roster_count} approved
                          </span>
                        )}
                      </td>
                      <td className="text-left whitespace-nowrap">
                        {u.in_force_id ? (
                          <button
                            onClick={() => navigate(`/rosters/${u.in_force_id}`)}
                            className="text-green-700 font-medium hover:underline"
                            title="The roster attendance is actually using — open it"
                          >
                            #{u.in_force_id}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-left">
                        {!pending.length ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className="text-amber-800">
                            {pending.map((id, k) => (
                              <span key={id}>
                                {k > 0 && ", "}
                                <button
                                  onClick={() => navigate(`/rosters/${id}`)}
                                  className="font-medium hover:underline"
                                  title="Open this pending roster to review and approve it"
                                >
                                  #{id}
                                </button>
                              </span>
                            ))}
                            <span className="text-[11px] text-gray-500 ml-1">
                              ({pending.length} pending)
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : loading ? (
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
              {groupedRows.map((g) => (
                <tbody key={g.key}>
                  {g.name && (
                    <tr className="bg-slate-100">
                      <td colSpan={10} className="text-left !py-1.5">
                        <span className="text-xs font-semibold text-gray-700">{g.name}</span>
                        {g.incharge && (
                          <span className="text-[11px] text-gray-500 ml-2">· {g.incharge}</span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-2">
                          · {g.rows.length} roster{g.rows.length === 1 ? "" : "s"} on this page
                        </span>
                      </td>
                    </tr>
                  )}
                  {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-gray-500">{firstIndex + (rowIndex.get(r.id) ?? 0) + 1}</td>
                    <td>{r.id}</td>
                    <td className="text-left">{r.title || "—"}</td>
                    <td className="text-left">{scopeLabel(r)}</td>
                    <td className="text-left">{typeLabel(r)}</td>
                    <td className="text-left whitespace-nowrap">{periodLabel(r)}</td>
                    <td>{r._count?.entries ?? 0}</td>
                    <td>
                      {(() => {
                        const st = effectiveState(r);
                        return st ? (
                          <span className={st.cls} title={st.hint}>
                            {st.label}
                          </span>
                        ) : (
                          <span className={statusBadgeClass(r.status)}>{r.status}</span>
                        );
                      })()}
                      {r.same_period?.total > 1 && (
                        <div className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                          {r.same_period.total} rosters this month
                          {r.in_force_roster_id && r.in_force_roster_id !== r.id && (
                            <>
                              {" · "}
                              <button
                                onClick={() => navigate(`/rosters/${r.in_force_roster_id}`)}
                                className="text-blue-600 hover:underline"
                                title="Open the roster currently applied for this bazaar"
                              >
                                #{r.in_force_roster_id} is applied
                              </button>
                            </>
                          )}
                        </div>
                      )}
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
                        {cycleCountFor(r) > 1 && (
                          <button
                            onClick={() => goToCycle(r)}
                            className="btn btn-secondary btn-sm"
                            title="Combine all rosters for this unit's cycle into one breakdown"
                          >
                            Cycle
                          </button>
                        )}
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
              ))}
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
                  {(() => {
                    const st = effectiveState(r);
                    return st ? (
                      <span className={st.cls} title={st.hint}>
                        {st.label}
                      </span>
                    ) : (
                      <span className={statusBadgeClass(r.status)}>{r.status}</span>
                    );
                  })()}
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
                  {cycleCountFor(r) > 1 && (
                    <button
                      onClick={() => goToCycle(r)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cycle ({cycleCountFor(r)})
                    </button>
                  )}
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
              onPageChange={changePage}
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
