import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import rosterService from "../services/rosterService";
import RosterEntriesEditor from "../components/RosterEntriesEditor";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import { blankDaySchedules, statusBadgeClass } from "../rosterUtils";

// Creator-only editing of PENDING / REJECTED rosters. Saving resubmits the
// roster for approval (approver is re-resolved server-side).
const EditRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [roster, setRoster] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [rosterType, setRosterType] = useState("MONTHLY");
  const [customRange, setCustomRange] = useState(true);
  const [month, setMonth] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [r, c] = await Promise.all([rosterService.get(id), rosterService.context()]);
        const ro = r.roster;
        setRoster(ro);
        setCtx(c);
        setTitle(ro.title || "");
        setRosterType(ro.roster_type || "MONTHLY");
        setValidFrom(ro.valid_from?.slice(0, 10) || "");
        setValidTo(ro.valid_to?.slice(0, 10) || "");
        setMonth(c.cycle?.month || "");

        // Entries: every currently-eligible employee, prefilled from the roster
        const byEmp = new Map((ro.entries || []).map((en) => [en.employee_id, en]));
        setEntries(
          (c.employees || []).map((e) => {
            const old = byEmp.get(e.id);
            return {
              employee_id: e.id,
              day_schedules: old?.day_schedules || blankDaySchedules(),
              remarks: old?.remarks || "",
            };
          })
        );
      } catch (e) {
        setError(e?.response?.data?.error || "Failed to load roster");
      }
    })();
  }, [id]);

  const isCreator = useMemo(
    () => roster && (roster.created_by_user_id ?? roster.createdBy?.id) === user?.id,
    [roster, user]
  );

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!roster || !ctx) return <LoadingSpinner text="Loading roster..." />;

  if (roster.status === "APPROVED") {
    return (
      <div className="p-6 card-soft m-6 text-sm text-gray-600">
        Approved rosters cannot be edited. Create a new roster for the same period to supersede this
        one.
      </div>
    );
  }
  if (!isCreator) {
    return <div className="p-6 text-red-600">Only the creator can edit this roster.</div>;
  }

  const isHq = ctx.scope === "HQ_DEPARTMENT";
  const scopeName = isHq ? ctx.department?.name : ctx.location?.name;

  const submit = async () => {
    const payload = { title: title || null, roster_type: rosterType, entries };
    if (rosterType === "PERMANENT") {
      payload.valid_from = validFrom;
    } else if (isHq && customRange) {
      payload.valid_from = validFrom;
      payload.valid_to = validTo;
    } else {
      payload.month = month;
    }
    setSaving(true);
    try {
      await rosterService.update(roster.id, payload);
      toastBus.emit({ type: "success", message: "Roster resubmitted for approval" });
      navigate("/rosters");
    } catch (e) {
      toastBus.emit({ type: "error", message: e?.response?.data?.error || "Failed to update roster" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Edit Duty Roster #{roster.id}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {isHq ? "HQ Department" : "Location"}: <span className="font-medium">{scopeName}</span>
            <span className={statusBadgeClass(roster.status)}>{roster.status}</span>
          </p>
        </div>
        <div className="actions-inline flex gap-2">
          <button onClick={() => navigate("/rosters")} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? "Saving..." : "Resubmit for Approval"}
          </button>
        </div>
      </div>

      {roster.status === "REJECTED" && (
        <div className="card-soft p-4 border-l-4 border-red-400">
          <div className="text-sm font-medium text-red-700">Rejected</div>
          <div className="text-sm text-gray-600 mt-1">
            {roster.rejection_reason || "No reason recorded"}
            {roster.rejectedBy && (
              <span className="text-gray-400">
                {" "}
                — {roster.rejectedBy.employee?.full_name || roster.rejectedBy.email}
                {roster.rejected_at ? `, ${new Date(roster.rejected_at).toLocaleString()}` : ""}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fix the issues below and resubmit — it will go back to the approver as Pending.
          </div>
        </div>
      )}

      <div className="card-soft p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        ) : isHq && customRange ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid From</label>
              <input
                type="date"
                className="form-input"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid To</label>
              <input
                type="date"
                className="form-input"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
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
          </div>
        )}

        {isHq && rosterType === "MONTHLY" && (
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

      <RosterEntriesEditor employees={ctx.employees || []} entries={entries} onChange={setEntries} />
    </div>
  );
};

export default EditRoster;
