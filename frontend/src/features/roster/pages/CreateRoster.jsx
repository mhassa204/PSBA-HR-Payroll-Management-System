import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import rosterService from "../services/rosterService";
import RosterEntriesEditor from "../components/RosterEntriesEditor";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { blankDaySchedules, findIncompleteDay, cycleEndFor } from "../rosterUtils";

const CreateRoster = () => {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [rosterType, setRosterType] = useState("MONTHLY");
  const [month, setMonth] = useState("");
  const [customRange, setCustomRange] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await rosterService.context();
        setCtx(res);
        setMonth(res.cycle?.month || "");
        setEntries(
          (res.employees || []).map((e) => ({
            employee_id: e.id,
            day_schedules: blankDaySchedules(),
            remarks: "",
          }))
        );
      } catch (e) {
        setError(e?.response?.data?.error || "You are not authorized to create a roster.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const prefillFromLast = () => {
    const last = ctx?.lastRoster;
    if (!last?.entries?.length) return;
    const byEmp = new Map(last.entries.map((en) => [en.employee_id, en]));
    setEntries((prev) =>
      prev.map((en) => {
        const old = byEmp.get(en.employee_id);
        return old
          ? { ...en, day_schedules: old.day_schedules || en.day_schedules, remarks: old.remarks || "" }
          : en;
      })
    );
    toastBus.emit({ type: "info", message: "Prefilled from your last roster" });
  };

  const submit = async () => {
    // Block submission if any employee has an incomplete day selection
    for (const en of entries) {
      const badDay = findIncompleteDay(en.day_schedules);
      if (badDay) {
        const emp = ctx.employees.find((e) => e.id === en.employee_id);
        toastBus.emit({
          type: "error",
          message:
            `${emp?.full_name || "An employee"} has no schedule set for ${badDay}. ` +
            `Every day must be Time (with both times), Offsite (with a location), or Weekly off.`,
        });
        return;
      }
    }

    const payload = { title: title || null, roster_type: rosterType, entries };
    if (rosterType === "PERMANENT") {
      payload.valid_from = validFrom;
    } else if (customRange) {
      payload.valid_from = validFrom;
      payload.valid_to = validTo;
    } else {
      payload.month = month;
    }
    setSaving(true);
    try {
      const res = await rosterService.create(payload);
      if (res?.warning) toastBus.emit({ type: "warning", message: res.warning });
      toastBus.emit({
        type: "success",
        message: `Roster submitted for approval${ctx?.approver?.email ? ` to ${ctx.approver.email}` : ""}`,
      });
      navigate("/rosters");
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to create roster" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading roster context..." />;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const isHq = ctx.scope === "HQ_DEPARTMENT";
  const scopeName = isHq ? ctx.department?.name : ctx.location?.name;
  const approverInfo = ctx.approver?.error
    ? null
    : ctx.approver?.mode === "ROLE"
    ? "Operations (operations department)"
    : `${ctx.approver?.name || ""} ${ctx.approver?.email ? `(${ctx.approver.email})` : ""}`.trim();

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Create Duty Roster</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isHq ? "HQ Department" : "Location"}: <span className="font-medium">{scopeName}</span>
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          {ctx.lastRoster && (
            <button onClick={prefillFromLast} className="btn btn-outline">
              Start from last roster
            </button>
          )}
          <button onClick={() => navigate("/rosters")} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !!ctx.approver?.error} className="btn btn-primary">
            {saving ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </div>

      {/* Routing banner */}
      {ctx.approver?.error ? (
        <div className="card-soft p-4 border-l-4 border-red-400 text-sm text-red-700">
          {ctx.approver.error}
        </div>
      ) : (
        <div className="card-soft p-4 border-l-4 border-blue-400 text-sm text-gray-600">
          On submit, this roster will be sent to <span className="font-medium">{approverInfo}</span> for
          approval.
        </div>
      )}

      {/* Period settings */}
      <div className="card-soft p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${scopeName} — ${ctx.cycle?.label || "Roster"}`}
          />
        </div>

        {isHq && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Roster Type</label>
            <select
              className="form-input"
              value={rosterType}
              onChange={(e) => setRosterType(e.target.value)}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="PERMANENT">Permanent (no end date)</option>
            </select>
          </div>
        )}

        {rosterType === "PERMANENT" ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
            <input
              type="date"
              className="form-input"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
        ) : customRange ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid From</label>
              <input
                type="date"
                className="form-input"
                value={validFrom}
                onChange={(e) => {
                  const from = e.target.value;
                  setValidFrom(from);
                  // The cycle always closes on the 20th, so the end date follows
                  // from the start and is not a free choice.
                  setValidTo(cycleEndFor(from));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid To</label>
              <input
                type="date"
                className="form-input"
                value={validTo}
                disabled={!validFrom}
                min={validFrom || undefined}
                max={cycleEndFor(validFrom) || undefined}
                onChange={(e) => {
                  // Keep it inside the cycle even if a date is typed rather
                  // than picked — the browser only enforces min/max in the picker.
                  const limit = cycleEndFor(validFrom);
                  let next = e.target.value;
                  if (next && validFrom && next < validFrom) next = validFrom;
                  if (next && limit && next > limit) next = limit;
                  setValidTo(next);
                }}
                title="Any date from the start date up to the end of that cycle"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {validFrom
                  ? `Between ${validFrom} and ${cycleEndFor(validFrom)} (cycle ends on the 20th)`
                  : "Pick a start date first"}
              </p>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cycle Month (21st → 20th)
            </label>
            <input
              type="month"
              className="form-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              e.g. {ctx.cycle?.label}: {ctx.cycle?.start} → {ctx.cycle?.end}
            </p>
          </div>
        )}

        {rosterType === "MONTHLY" && (
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={customRange}
                onChange={(e) => setCustomRange(e.target.checked)}
              />
              Use custom date range
            </label>
          </div>
        )}
      </div>

      {/* Entries */}
      {ctx.employees?.length ? (
        <RosterEntriesEditor employees={ctx.employees} entries={entries} onChange={setEntries} />
      ) : (
        <div className="card-soft p-6 text-sm text-gray-500">
          No active employees found for {scopeName}.
        </div>
      )}
    </div>
  );
};

export default CreateRoster;
