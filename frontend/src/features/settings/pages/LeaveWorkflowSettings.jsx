import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';

// Leave Approval Workflow administration (per HR-approved mechanism):
//  - which locations each Regional Incharge account covers (stage 1)
//  - dynamic Director General stage rules (no hardcoded policy)
const LeaveWorkflowSettings = () => {
  const [loading, setLoading] = useState(true);
  const [riUsers, setRiUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [dg, setDg] = useState({ enabled: false, rules: [] });
  const [savingUser, setSavingUser] = useState(null);
  const [savingRules, setSavingRules] = useState(false);
  const [draftLocs, setDraftLocs] = useState({}); // userId -> Set(location_id)

  const load = async () => {
    try {
      setLoading(true);
      const [ri, locs, types, rules] = await Promise.all([
        axios.get('/leaves/workflow/regional-assignments'),
        axios.get('/attendance/locations'),
        axios.get('/leave-banks/types').catch(() => ({ data: { types: [] } })),
        axios.get('/leaves/workflow/dg-rules'),
      ]);
      setRiUsers(ri.data.users || []);
      setLocations((locs.data.locations || []).filter((l) => l.type !== 'HEAD_OFFICE'));
      setLeaveTypes(types.data.types || []);
      setDg({ enabled: !!rules.data.enabled, rules: rules.data.rules || [] });
      const drafts = {};
      for (const u of ri.data.users || []) drafts[u.id] = new Set(u.locations.map((l) => l.id));
      setDraftLocs(drafts);
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load workflow settings' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleLoc = (userId, locId) => {
    setDraftLocs((prev) => {
      const next = { ...prev };
      const set = new Set(next[userId] || []);
      if (set.has(locId)) set.delete(locId); else set.add(locId);
      next[userId] = set;
      return next;
    });
  };

  const saveUser = async (userId) => {
    try {
      setSavingUser(userId);
      await axios.put(`/leaves/workflow/regional-assignments/${userId}`, {
        location_ids: [...(draftLocs[userId] || [])],
      });
      toastBus.emit({ type: 'success', message: 'Coverage saved' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to save coverage' });
    } finally { setSavingUser(null); }
  };

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

  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading workflow settings..." /></div>;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-primary">Leave Approval Workflow</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Flow for location employees: Incharge put-up → Regional Incharge (recommend) → Operations Wing → Director General (when a rule below matches) → HR (Establishment) final approval.
        </p>
      </div>

      <div className="card-soft p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Regional Incharge coverage</h2>
          <p className="text-xs text-gray-500">Users with the "Regional Incharge" role and the locations whose leave applications they recommend. Create the accounts in Users first.</p>
        </div>
        {!riUsers.length && <div className="text-xs text-gray-500">No Regional Incharge users yet — create a user with the "Regional Incharge" role in the Users screen.</div>}
        {riUsers.map((u) => (
          <div key={u.id} className="border border-gray-200 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{u.name || u.email} <span className="text-xs text-gray-500">({u.email})</span> <span className="badge badge-blue ml-2">{(draftLocs[u.id] || new Set()).size} location(s)</span></div>
              <button className="btn btn-primary btn-sm text-xs" disabled={savingUser === u.id} onClick={() => saveUser(u.id)}>
                {savingUser === u.id ? 'Saving…' : 'Save coverage'}
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto custom-thin-scroll grid grid-cols-1 md:grid-cols-3 gap-1 text-xs">
              {locations.map((l) => (
                <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(draftLocs[u.id] || new Set()).has(l.id)} onChange={() => toggleLoc(u.id, l.id)} />
                  <span className="truncate" title={l.name}>{l.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
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
