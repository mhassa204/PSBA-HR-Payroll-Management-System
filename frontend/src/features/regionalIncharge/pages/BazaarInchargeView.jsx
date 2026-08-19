import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import regionalInchargeService from "../services/regionalInchargeService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";

// The other direction: every bazaar with a dropdown to set its regional
// incharge. Saves immediately per row — this is the screen for fixing one
// bazaar, not for bulk work.
const BazaarInchargeView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const can = useAuthStore((s) => s.can);
  const canManage = can("regional_incharge.manage");

  const [bazaars, setBazaars] = useState([]);
  const [incharges, setIncharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const filter = searchParams.get("filter") || "all";

  const load = async () => {
    setLoading(true);
    try {
      const [all, list] = await Promise.all([
        regionalInchargeService.bazaars(),
        regionalInchargeService.list(),
      ]);
      setBazaars(all.bazaars || []);
      setIncharges(list.incharges || []);
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to load" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("filter");
    else next.set("filter", value);
    setSearchParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bazaars
      .filter((b) => (filter === "unassigned" ? !b.regional_incharge_id : true))
      .filter((b) =>
        q
          ? [b.name, b.district?.name, b.regionalIncharge?.region_name, b.regionalIncharge?.employee?.full_name]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      );
  }, [bazaars, search, filter]);

  const unassignedCount = bazaars.filter((b) => !b.regional_incharge_id).length;

  const assign = async (bazaar, value) => {
    setSavingId(bazaar.id);
    try {
      const res = await regionalInchargeService.setBazaarIncharge(
        bazaar.id,
        value === "" ? null : Number(value)
      );
      setBazaars((prev) =>
        prev.map((b) =>
          b.id === bazaar.id
            ? {
                ...b,
                regional_incharge_id: res.location.regionalIncharge?.id ?? null,
                regionalIncharge: res.location.regionalIncharge,
              }
            : b
        )
      );
      toastBus.emit({
        type: "success",
        message: res.location.regionalIncharge
          ? `${bazaar.name} → ${res.location.regionalIncharge.region_name}`
          : `${bazaar.name} has no regional incharge now`,
      });
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to assign" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Bazaars by Incharge</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Set the regional incharge for a single bazaar — changes save as you pick
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button onClick={load} className="btn btn-outline">
            Refresh
          </button>
          <button onClick={() => navigate("/regional-incharges")} className="btn btn-secondary">
            All Regions
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading bazaars..." />
      ) : (
        <>
          <div className="card-soft p-3 flex flex-wrap items-center gap-2">
            <input
              className="form-input flex-1 min-w-[200px]"
              placeholder="Search bazaar, district or region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setFilter("all")}
              className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline"}`}
            >
              All ({bazaars.length})
            </button>
            <button
              onClick={() => setFilter("unassigned")}
              className={`btn btn-sm ${filter === "unassigned" ? "btn-primary" : "btn-outline"}`}
            >
              No incharge ({unassignedCount})
            </button>
          </div>

          {!rows.length ? (
            <div className="card-soft p-8 text-center text-sm text-gray-500">
              No bazaars match the current filter.
            </div>
          ) : (
            <div className="table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
              <table className="table-enhanced min-w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="text-left">Bazaar</th>
                    <th className="text-left">District</th>
                    <th className="text-left">Regional Incharge</th>
                    <th className="text-left">Person</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b, i) => (
                    <tr key={b.id} className={!b.regional_incharge_id ? "bg-amber-50/40" : ""}>
                      <td className="text-gray-500">{i + 1}</td>
                      <td className="text-left">
                        {b.name}
                        {!b.is_active && <span className="badge badge-gray ml-2">INACTIVE</span>}
                      </td>
                      <td className="text-left">{b.district?.name || "—"}</td>
                      <td className="text-left">
                        <select
                          className="form-input sm !w-auto min-w-[12rem]"
                          value={b.regional_incharge_id ?? ""}
                          disabled={!canManage || savingId === b.id}
                          onChange={(e) => assign(b, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {incharges.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.region_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-left text-gray-600">
                        {b.regionalIncharge?.employee?.full_name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BazaarInchargeView;
