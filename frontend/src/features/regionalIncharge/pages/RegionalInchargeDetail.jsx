import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import regionalInchargeService from "../services/regionalInchargeService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";

// Assign bazaars to one regional incharge — the "from the incharge" direction.
// Ticking a bazaar held by another region moves it; that is called out before
// saving rather than happening quietly.
const RegionalInchargeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuthStore((s) => s.can);
  const canManage = can("regional_incharge.manage");

  const [incharge, setIncharge] = useState(null);
  const [bazaars, setBazaars] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [one, all] = await Promise.all([
        regionalInchargeService.get(id),
        regionalInchargeService.bazaars(),
      ]);
      setIncharge(one.incharge);
      setBazaars(all.bazaars || []);
      setSelected(new Set((one.incharge.locations || []).map((l) => l.id)));
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to load" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bazaars
      .filter((b) => (onlyMine ? selected.has(b.id) : true))
      .filter((b) =>
        q
          ? [b.name, b.district?.name, b.regionalIncharge?.region_name]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      );
  }, [bazaars, search, onlyMine, selected]);

  const toggle = (bazaarId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bazaarId)) next.delete(bazaarId);
      else next.add(bazaarId);
      return next;
    });

  // Ticked bazaars currently held by a different region
  const takingOver = useMemo(
    () =>
      bazaars.filter(
        (b) =>
          selected.has(b.id) &&
          b.regional_incharge_id &&
          String(b.regional_incharge_id) !== String(id)
      ),
    [bazaars, selected, id]
  );

  const dropping = useMemo(
    () => (incharge?.locations || []).filter((l) => !selected.has(l.id)),
    [incharge, selected]
  );

  const dirty =
    takingOver.length > 0 ||
    dropping.length > 0 ||
    selected.size !== (incharge?.locations?.length || 0);

  const save = async () => {
    setSaving(true);
    try {
      const res = await regionalInchargeService.setBazaars(id, [...selected]);
      const moved = res.moved_from_other_regions?.length || 0;
      toastBus.emit({
        type: "success",
        message: `${res.region_name}: ${res.count} bazaar(s) assigned${moved ? `, ${moved} moved from another region` : ""}.`,
      });
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading region..." />;
  if (!incharge) return <div className="p-6 text-red-600">Region not found.</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            {incharge.region_name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {incharge.employee?.full_name}
            {incharge.employee?.designation ? ` · ${incharge.employee.designation}` : ""}
            {incharge.contact_number ? ` · ${incharge.contact_number}` : ""}
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button onClick={() => navigate("/regional-incharges")} className="btn btn-outline">
            All Regions
          </button>
          {canManage && (
            <button onClick={save} disabled={saving || !dirty} className="btn btn-primary">
              {saving ? "Saving…" : `Save (${selected.size} bazaars)`}
            </button>
          )}
        </div>
      </div>

      {(takingOver.length > 0 || dropping.length > 0) && (
        <div className="card-soft p-3 border-l-4 border-amber-400 text-xs space-y-1">
          {takingOver.length > 0 && (
            <div>
              <span className="font-semibold text-amber-800">
                Moving {takingOver.length} bazaar(s) from another region:
              </span>{" "}
              {takingOver.map((b) => `${b.name} (${b.regionalIncharge?.region_name})`).join(", ")}
            </div>
          )}
          {dropping.length > 0 && (
            <div>
              <span className="font-semibold text-amber-800">
                Releasing {dropping.length} bazaar(s):
              </span>{" "}
              {dropping.map((l) => l.name).join(", ")} — they will have no regional incharge until
              reassigned.
            </div>
          )}
        </div>
      )}

      <div className="card-soft p-3 flex flex-wrap items-center gap-2">
        <input
          className="form-input flex-1 min-w-[200px]"
          placeholder="Search bazaars…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Only this region
        </label>
        <span className="text-xs text-gray-500 ml-auto">
          {selected.size} selected of {bazaars.length} bazaars
        </span>
      </div>

      <div className="table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
        <table className="table-enhanced min-w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>#</th>
              <th className="text-left">Bazaar</th>
              <th className="text-left">District</th>
              <th className="text-left">Currently with</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const mine = selected.has(b.id);
              const otherRegion =
                b.regional_incharge_id && String(b.regional_incharge_id) !== String(id)
                  ? b.regionalIncharge?.region_name
                  : null;
              return (
                <tr key={b.id} className={mine ? "bg-blue-50/40" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={mine}
                      disabled={!canManage}
                      onChange={() => toggle(b.id)}
                    />
                  </td>
                  <td className="text-gray-500">{i + 1}</td>
                  <td className="text-left">
                    {b.name}
                    {!b.is_active && <span className="badge badge-gray ml-2">INACTIVE</span>}
                  </td>
                  <td className="text-left">{b.district?.name || "—"}</td>
                  <td className="text-left">
                    {!b.regional_incharge_id ? (
                      <span className="text-amber-700">— none —</span>
                    ) : otherRegion ? (
                      <span className={mine ? "text-amber-700 font-medium" : "text-gray-600"}>
                        {otherRegion}
                        {mine ? " → moving here" : ""}
                      </span>
                    ) : (
                      <span className="text-green-700">this region</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegionalInchargeDetail;
