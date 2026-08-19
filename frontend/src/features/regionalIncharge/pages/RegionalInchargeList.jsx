import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import regionalInchargeService from "../services/regionalInchargeService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import EmployeePicker from "../components/EmployeePicker";

// Regional Incharges — who oversees which bazaars.
// One incharge per bazaar; an incharge holds many. Coverage is edited either
// from here (pick the bazaars for a region) or from the bazaar list tab.

const RegionalInchargeList = () => {
  const navigate = useNavigate();
  const can = useAuthStore((s) => s.can);
  const canManage = can("regional_incharge.manage");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // row being edited, or null = new
  const [form, setForm] = useState({ region_name: "", employee_id: null, contact_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await regionalInchargeService.list());
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to load regional incharges",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data?.incharges || [];
    if (!q) return rows;
    return rows.filter((r) =>
      [r.region_name, r.employee?.full_name, r.contact_number, r.employee?.posted_at]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ region_name: "", employee_id: null, contact_number: "", notes: "" });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      region_name: row.region_name,
      employee_id: row.employee?.id ?? null,
      contact_number: row.contact_number || "",
      notes: row.notes || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.region_name.trim()) {
      toastBus.emit({ type: "error", message: "Region name is required." });
      return;
    }
    if (!form.employee_id) {
      toastBus.emit({ type: "error", message: "Pick the employee who holds this region." });
      return;
    }
    setSaving(true);
    try {
      if (editing) await regionalInchargeService.update(editing.id, form);
      else await regionalInchargeService.create(form);
      toastBus.emit({
        type: "success",
        message: editing ? "Region updated" : `Region "${form.region_name}" created`,
      });
      setFormOpen(false);
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      const res = await regionalInchargeService.remove(confirmDelete.id);
      toastBus.emit({ type: "success", message: res.message });
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to remove" });
    }
  };

  const totalBazaars = (data?.incharges || []).reduce((n, r) => n + r.bazaar_count, 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Regional Incharges</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Each bazaar is overseen by one regional incharge; an incharge holds many bazaars
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button onClick={load} className="btn btn-outline">
            Refresh
          </button>
          <button onClick={() => navigate("/regional-incharges/bazaars")} className="btn btn-outline">
            Bazaar View
          </button>
          {canManage && (
            <button onClick={openNew} className="btn btn-primary">
              Add Region
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading regional incharges..." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="card-soft p-3">
              <div className="text-lg font-semibold">{data?.total ?? 0}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Regions</div>
            </div>
            <div className="card-soft p-3">
              <div className="text-lg font-semibold">{totalBazaars}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Bazaars covered</div>
            </div>
            <button
              onClick={() => navigate("/regional-incharges/bazaars?filter=unassigned")}
              className={`card-soft p-3 text-left ${data?.unassigned_bazaars ? "border-amber-300" : ""}`}
            >
              <div
                className={`text-lg font-semibold ${data?.unassigned_bazaars ? "text-amber-700" : ""}`}
              >
                {data?.unassigned_bazaars ?? 0}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Bazaars with no incharge
              </div>
            </button>
          </div>

          <div className="card-soft p-3">
            <input
              className="form-input w-full"
              placeholder="Search region, incharge, contact…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!filtered.length ? (
            <div className="card-soft p-8 text-center text-sm text-gray-500">
              No regions found.
              {canManage && " Use “Add Region” to create one."}
            </div>
          ) : (
            <>
              <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
                <table className="table-enhanced min-w-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="text-left">Region</th>
                      <th className="text-left">Regional Incharge</th>
                      <th className="text-left">Posted At</th>
                      <th className="text-left">Contact</th>
                      <th>Bazaars</th>
                      <th>Status</th>
                      <th className="text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id}>
                        <td className="text-gray-500">{i + 1}</td>
                        <td className="text-left font-medium">{r.region_name}</td>
                        <td className="text-left">
                          {r.employee?.full_name || "—"}
                          <div className="text-[11px] text-gray-400">
                            {r.employee?.designation || ""}
                          </div>
                        </td>
                        <td className="text-left">{r.employee?.posted_at || "—"}</td>
                        <td className="text-left whitespace-nowrap">{r.contact_number || "—"}</td>
                        <td>{r.bazaar_count}</td>
                        <td>
                          <span className={r.is_active ? "badge badge-green" : "badge badge-gray"}>
                            {r.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="text-left">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => navigate(`/regional-incharges/${r.id}`)}
                              className="btn btn-outline btn-sm"
                            >
                              Bazaars
                            </button>
                            {canManage && (
                              <>
                                <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm">
                                  Edit
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(r)}
                                  className="btn btn-error-soft btn-sm"
                                >
                                  Remove
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

              <div className="md:hidden space-y-2">
                {filtered.map((r, i) => (
                  <div key={r.id} className="card-soft p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-800">
                          <span className="text-gray-400 mr-1">{i + 1}.</span>
                          {r.region_name}
                        </div>
                        <div className="text-xs text-gray-500">{r.employee?.full_name || "—"}</div>
                      </div>
                      <span className="badge badge-blue">{r.bazaar_count} bazaars</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.contact_number || "—"} · posted at {r.employee?.posted_at || "—"}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/regional-incharges/${r.id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        Bazaars
                      </button>
                      {canManage && (
                        <>
                          <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm">
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r)}
                            className="btn btn-error-soft btn-sm"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create / edit */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="modal-header">
              <h3 className="text-base font-semibold">
                {editing ? `Edit ${editing.region_name}` : "Add Region"}
              </h3>
              <button onClick={() => setFormOpen(false)} className="btn btn-sm btn-ghost">
                Close
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-thin-scroll">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Region name
                </label>
                <input
                  className="form-input w-full"
                  placeholder="e.g. Lahore-1, Sargodha &amp; Rawalpindi"
                  value={form.region_name}
                  onChange={(e) => setForm((f) => ({ ...f, region_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Regional incharge (employee)
                </label>
                <EmployeePicker
                  value={form.employee_id}
                  initialLabel={editing?.employee?.full_name}
                  onChange={(emp) =>
                    setForm((f) => ({
                      ...f,
                      employee_id: emp?.id ?? null,
                      contact_number: f.contact_number || emp?.mobile_number || "",
                    }))
                  }
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  This is an additional duty — the employee stays posted at their own bazaar.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Contact</label>
                <input
                  className="form-input w-full"
                  value={form.contact_number}
                  onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  className="form-input w-full"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.is_active ?? editing.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Active
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button onClick={() => setFormOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn btn-primary">
                {saving ? "Saving…" : editing ? "Save changes" : "Create region"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Remove {confirmDelete.region_name}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Its {confirmDelete.bazaar_count} bazaar(s) will be left without a regional incharge —
              their leave applications will go straight to Operations until someone else is assigned.
              The bazaars themselves are not affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={doDelete} className="btn btn-error">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionalInchargeList;
