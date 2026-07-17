import React, { useEffect, useMemo, useRef, useState } from "react";
import { toastBus } from "../../../utils/toastBus";
import { createTransfer, getLocations, getFormOptions } from "../services/transferService";

const todayYMD = () => new Date().toISOString().slice(0, 10);

const locationLabel = (loc) => (loc?.city?.name ? `${loc.name} — ${loc.city.name}` : loc?.name || "");

const TYPE_LABELS = {
  HEAD_OFFICE: "Head Office",
  BAZAAR: "Bazaars",
  MOBILE_BAZAAR: "Mobile Bazaars",
  SPECIAL_UNIT: "Special Units",
};

// Lightweight searchable location select (input filters a menu-surface list).
const LocationSelect = ({ locations, value, onChange, disabledIds = [], inactiveDisabled, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = locations.find((l) => l.id === value);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = locations.filter(
      (l) => !q || l.name.toLowerCase().includes(q) || (l.city?.name || "").toLowerCase().includes(q)
    );
    const byType = new Map();
    for (const loc of filtered) {
      const key = TYPE_LABELS[loc.type] || loc.type || "Other";
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key).push(loc);
    }
    return [...byType.entries()];
  }, [locations, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="form-input w-full text-left flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "" : "text-gray-400"}>
          {selected ? locationLabel(selected) : placeholder}
        </span>
        <span className="text-gray-400 text-xs ml-2">▾</span>
      </button>
      {open && (
        <div className="menu-surface absolute left-0 right-0 mt-1 z-40 max-h-64 overflow-y-auto custom-thin-scroll p-1">
          <input
            className="form-input w-full mb-1 sticky top-0"
            placeholder="Search locations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {!groups.length && <p className="px-3 py-2 text-xs text-gray-500">No locations match.</p>}
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{group}</p>
              {items.map((loc) => {
                const disabled = disabledIds.includes(loc.id) || (inactiveDisabled && !loc.is_active);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    disabled={disabled}
                    className={`menu-item w-full text-left ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${loc.id === value ? "bg-blue-50" : ""}`}
                    onClick={() => { if (!disabled) { onChange(loc.id); setOpen(false); setQuery(""); } }}
                  >
                    {locationLabel(loc)}
                    {!loc.is_active && <span className="text-[10px] text-gray-400 ml-1">(inactive)</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Two-step transfer modal: form -> confirmation. TRANSFER mode moves the
// current posting; RECORD_ONLY only writes a historical entry.
const NewTransferModal = ({ employment, employeeName, latestTransferAt, onClose, onSaved, onStale }) => {
  const [mode, setMode] = useState("TRANSFER");
  const [locations, setLocations] = useState([]);
  const [options, setOptions] = useState({ departments: [], designations: [] });
  const [toLocationId, setToLocationId] = useState(null);
  const [fromLocationId, setFromLocationId] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(todayYMD());
  const [showExtra, setShowExtra] = useState(false);
  const [deptId, setDeptId] = useState("");
  const [desigId, setDesigId] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getLocations();
        setLocations((data.locations || []).filter((l) => !l.is_deleted));
      } catch { setLocations([]); }
      try {
        const data = await getFormOptions();
        setOptions({ departments: data.departments || [], designations: data.designations || [] });
      } catch { /* optional extras — form works without them */ }
    })();
  }, []);

  const currentLocation = employment?.location || null;
  const toLocation = locations.find((l) => l.id === toLocationId);
  const fromLocation = locations.find((l) => l.id === fromLocationId);

  const warnings = useMemo(() => {
    const list = [];
    if (!employment?.is_current) list.push("You are editing a non-current employment record.");
    if (mode === "TRANSFER" && effectiveDate && latestTransferAt) {
      const latest = new Date(latestTransferAt).toISOString().slice(0, 10);
      if (effectiveDate < latest) {
        list.push(`Effective date is earlier than the latest recorded transfer (${latest}). The current posting will still be updated.`);
      }
    }
    if (effectiveDate && employment?.effective_from) {
      const from = new Date(employment.effective_from).toISOString().slice(0, 10);
      if (effectiveDate < from) list.push(`Effective date is before this employment started (${from}).`);
    }
    return list;
  }, [employment, mode, effectiveDate, latestTransferAt]);

  const validate = () => {
    if (!toLocationId) return "Select a target location.";
    if (!effectiveDate) return "Select an effective date.";
    if (effectiveDate > todayYMD()) return "Effective date cannot be in the future.";
    if (mode === "TRANSFER" && toLocationId === employment?.location_id) return "Employee is already posted at this location.";
    if (mode === "RECORD_ONLY" && fromLocationId && fromLocationId === toLocationId) return "Previous and target locations are the same.";
    return "";
  };

  const goToConfirm = () => {
    const err = validate();
    setFormError(err);
    if (!err) setStep(2);
  };

  const submit = async () => {
    try {
      setSaving(true);
      const payload = {
        mode,
        to_location_id: toLocationId,
        effective_date: effectiveDate,
        remarks: remarks || undefined,
        order_reference: orderRef || undefined,
      };
      if (mode === "TRANSFER") {
        payload.expected_current_location_id = employment?.location_id ?? null;
        if (deptId) payload.to_department_id = parseInt(deptId);
        if (desigId) payload.to_designation_id = parseInt(desigId);
      } else if (fromLocationId) {
        payload.from_location_id = fromLocationId;
      }
      await createTransfer(employment.id, payload);
      toastBus.emit({ type: "success", message: mode === "TRANSFER" ? "Transfer recorded and posting updated." : "Past transfer recorded." });
      onSaved();
    } catch (e) {
      // The axios interceptor already surfaces the server message as a toast.
      if (e?.response?.data?.code === "STALE_STATE") onStale();
      else setStep(1);
    } finally {
      setSaving(false);
    }
  };

  const deptDesignations = options.designations.filter(
    (d) => !deptId || d.department_id === parseInt(deptId)
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-lg max-h-[92vh] overflow-y-auto custom-thin-scroll p-6">
        {step === 1 ? (
          <>
            <h3 className="text-lg font-semibold mb-1">New Transfer</h3>
            <p className="text-xs text-gray-500 mb-4">{employeeName} · {employment?.organization}</p>

            {/* Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {[
                { key: "TRANSFER", title: "Transfer now", help: "Moves the current posting and records it in history." },
                { key: "RECORD_ONLY", title: "Record past transfer", help: "Adds a historical entry only — current posting is unchanged." },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMode(opt.key)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    mode === opt.key ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <span className="text-sm font-medium block">{opt.title}</span>
                  <span className="text-[11px] text-gray-500">{opt.help}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* From */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                {mode === "TRANSFER" ? (
                  <div className="form-input bg-gray-50 text-gray-600 cursor-default">
                    {currentLocation ? locationLabel(currentLocation) : "Not assigned"}
                  </div>
                ) : (
                  <LocationSelect
                    locations={locations}
                    value={fromLocationId}
                    onChange={setFromLocationId}
                    placeholder="Previous location (optional)"
                  />
                )}
              </div>

              {/* To */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To location *</label>
                <LocationSelect
                  locations={locations}
                  value={toLocationId}
                  onChange={setToLocationId}
                  disabledIds={mode === "TRANSFER" && employment?.location_id ? [employment.location_id] : []}
                  inactiveDisabled={mode === "TRANSFER"}
                  placeholder="Select target location"
                />
              </div>

              {/* Effective date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Effective date *</label>
                <input
                  type="date"
                  className="form-input w-full"
                  value={effectiveDate}
                  max={todayYMD()}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>

              {/* Optional dept/desig (TRANSFER only) */}
              {mode === "TRANSFER" && (
                <div>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setShowExtra((s) => !s)}>
                    {showExtra ? "▾" : "▸"} Also update department / designation
                  </button>
                  {showExtra && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <select className="form-input" value={deptId} onChange={(e) => { setDeptId(e.target.value); setDesigId(""); }}>
                        <option value="">Keep department</option>
                        {options.departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <select className="form-input" value={desigId} onChange={(e) => setDesigId(e.target.value)}>
                        <option value="">Keep designation</option>
                        {deptDesignations.map((d) => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Order reference</label>
                  <input className="form-input w-full" placeholder="e.g. PSBA/HR/2026/123" value={orderRef} maxLength={200} onChange={(e) => setOrderRef(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                  <input className="form-input w-full" placeholder="Optional notes" value={remarks} maxLength={1000} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>

              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{w}</p>
              ))}
              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={goToConfirm}>Continue</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3">Confirm transfer</h3>
            <div className="card-soft bg-gray-50 p-4 text-sm space-y-1.5">
              <p><span className="text-gray-500">Employee:</span> <span className="font-medium">{employeeName}</span></p>
              <p><span className="text-gray-500">Employment:</span> {employment?.organization}</p>
              <p>
                <span className="text-gray-500">From:</span>{" "}
                {mode === "TRANSFER" ? (currentLocation ? locationLabel(currentLocation) : "Not assigned") : (fromLocation ? locationLabel(fromLocation) : "—")}
                <span className="mx-1 text-gray-400">→</span>
                <span className="font-medium">{toLocation ? locationLabel(toLocation) : ""}</span>
              </p>
              <p><span className="text-gray-500">Effective:</span> {effectiveDate}</p>
              <p>
                <span className="text-gray-500">Mode:</span>{" "}
                {mode === "TRANSFER" ? "Transfer now — current posting will be updated" : "Past record only — current posting unchanged"}
              </p>
              {mode === "TRANSFER" && deptId && (
                <p><span className="text-gray-500">New department:</span> {options.departments.find((d) => d.id === parseInt(deptId))?.name}</p>
              )}
              {mode === "TRANSFER" && desigId && (
                <p><span className="text-gray-500">New designation:</span> {options.designations.find((d) => d.id === parseInt(desigId))?.title}</p>
              )}
              {orderRef && <p><span className="text-gray-500">Order ref:</span> {orderRef}</p>}
              {remarks && <p><span className="text-gray-500">Remarks:</span> {remarks}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={saving}>Back</button>
              <button className="btn btn-success" onClick={submit} disabled={saving}>
                {saving ? "Saving..." : "Confirm Transfer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewTransferModal;
