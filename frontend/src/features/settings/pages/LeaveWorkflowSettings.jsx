import React, { useEffect, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';

// Leave Approval Workflow administration (per HR-approved mechanism):
//  - which locations each Regional Incharge account covers (stage 1)
//  - dynamic Director General stage rules (no hardcoded policy)
const LeaveWorkflowSettings = () => {
  const [loading, setLoading] = useState(true);
  const [riUsers, setRiUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [dg, setDg] = useState({ enabled: false, rules: [] });
  const [savingRules, setSavingRules] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [ri, types, rules] = await Promise.all([
        axios.get('/leaves/workflow/regional-assignments'),
        axios.get('/leave-banks/types').catch(() => ({ data: { types: [] } })),
        axios.get('/leaves/workflow/dg-rules'),
      ]);
      setRiUsers(ri.data.users || []);
      setLeaveTypes(types.data.types || []);
      setDg({ enabled: !!rules.data.enabled, rules: rules.data.rules || [] });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load workflow settings' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveRules = async () => {
    try {
      setSavingRules(true);
      await axios.put('/leaves/workflow/dg-rules', dg);
      toastBus.emit({ type: 'success', message: 'DG rules saved' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to save rules' });
    } finally { setSavingRules(false); }
  };

  const setRule = (idx, patch) => setDg((d) => ({ ...d, rules: d.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading workflow settings..." /></div>;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-primary">Leave Approval Workflow</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Flow for location employees: Incharge put-up → Regional Incharge (recommend) → Operations Wing → Director General (when a rule below matches) → HR (Establishment) final approval.
        </p>
      </div>

      {/* Coverage is owned by the Regional Incharges module now — this is a
          read-only summary so the workflow can be understood from one screen. */}
      <div className="card-soft p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Regional Incharge coverage</h2>
            <p className="text-xs text-gray-500">
              Which bazaars each regional incharge recommends leave for. Edit this in the Regional
              Incharges module — a bazaar has exactly one incharge there.
            </p>
          </div>
          <a href="/regional-incharges" className="btn btn-outline btn-sm text-xs">
            Open Regional Incharges
          </a>
        </div>
        {!riUsers.length ? (
          <div className="text-xs text-gray-500">
            No regions defined yet — add them in Regional Incharges.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {riUsers.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {r.region_name}
                    <span className="text-xs text-gray-500 ml-2">{r.name || "—"}</span>
                  </div>
                  <span className="badge badge-blue">{r.locations?.length || 0} bazaars</span>
                </div>
                {!r.has_account && (
                  <div className="text-[11px] text-amber-700">
                    No login for this incharge — leave will skip the recommendation stage and go
                    straight to Operations.
                  </div>
                )}
                {!r.is_active && <span className="badge badge-gray">INACTIVE</span>}
                <div className="text-[11px] text-gray-500 truncate" title={(r.locations || []).map((l) => l.name).join(", ")}>
                  {(r.locations || []).map((l) => l.name).join(", ") || "no bazaars assigned"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-soft p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Director General stage rules</h2>
            <p className="text-xs text-gray-500">When any rule matches a leave, the DG stage is inserted before HR after Operations allows. All conditions inside a rule must match; empty condition = any.</p>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={dg.enabled} onChange={(e) => setDg((d) => ({ ...d, enabled: e.target.checked }))} />
            Enabled
          </label>
        </div>
        {dg.rules.map((r, idx) => (
          <div key={idx} className="border border-gray-200 rounded p-3 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <div className="text-gray-500 mb-1">Leave types (empty = any)</div>
              <select multiple className="form-input !w-56 h-20" value={r.leave_types || []}
                onChange={(e) => setRule(idx, { leave_types: [...e.target.selectedOptions].map((o) => o.value) })}>
                {leaveTypes.map((t) => (<option key={t.id} value={t.name}>{t.name}</option>))}
              </select>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Minimum days</div>
              <input type="number" min="1" className="form-input !w-24" value={r.min_days ?? ''} placeholder="any"
                onChange={(e) => setRule(idx, { min_days: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div>
              <div className="text-gray-500 mb-1">Without pay</div>
              <select className="form-input !w-28" value={r.without_pay == null ? '' : r.without_pay ? 'yes' : 'no'}
                onChange={(e) => setRule(idx, { without_pay: e.target.value === '' ? null : e.target.value === 'yes' })}>
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <button className="btn btn-error-soft btn-sm text-xs" onClick={() => setDg((d) => ({ ...d, rules: d.rules.filter((_, i) => i !== idx) }))}>Remove</button>
          </div>
        ))}
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm text-xs" onClick={() => setDg((d) => ({ ...d, rules: [...d.rules, { leave_types: [], min_days: null, without_pay: null }] }))}>Add rule</button>
          <button className="btn btn-primary btn-sm text-xs" disabled={savingRules} onClick={saveRules}>{savingRules ? 'Saving…' : 'Save rules'}</button>
        </div>
      </div>
    </div>
  );
};

export default LeaveWorkflowSettings;
