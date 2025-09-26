import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../auth/authStore';
import { listPendingExpenseClaimApprovals, listAllExpenseClaimApprovals, decideExpenseClaim, exportExpenseClaimsToCsv, getTravelCapabilities } from '../../../services/travelService';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

export default function ManageExpenseClaimApprovals(){
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [viewTab, setViewTab] = useState('pending'); // pending | all
  const [allClaims, setAllClaims] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Auth / permission context
  const user = useAuthStore(s=>s.user);
  const can = useAuthStore(s=>s.can);
  const isSuper = user?.role?.name === 'Super Admin';
  // Fetch backend capability heuristics (includes legacy isOps / isDG / isHR flags)
  const [caps, setCaps] = useState(null);
  useEffect(()=>{ (async()=>{ try { const c = await getTravelCapabilities(); setCaps(c); } catch(_){ /* ignore */ } })(); },[]);
  const roleName = (user?.role?.name||'').toLowerCase();
  // Permission OR heuristic fallbacks mirroring backend travelRequestService
  const canOps = isSuper || can('travel.claim.approve.ops') || caps?.isOps;
  const canDG = isSuper || can('travel.claim.approve.dg') || caps?.isDG;
  const canHR = isSuper || can('travel.claim.approve.hr') || caps?.isHR || /(^hr$|human\s*resources)/i.test(roleName);
  const canAccounts = isSuper || can('travel.claim.approve.accounts') || /(accounts|finance|budget|payroll|reconciliation)/i.test(roleName);
  const hasAnyApprovalPerm = canOps || canDG || canHR || canAccounts;
  // If user has none, short-circuit action eligibility

  // Helper to compute dynamic eligibility replicating backend generalized logic
  const computeEligibility = (claim) => {
    if(!claim) return { canApprove:false, canReject:false, canClear:false };
    const status = claim.status;
    const entries = claim.statusEntries || [];
    const approvalsOrder = ['OPS_APPROVED','DG_APPROVED','HR_APPROVED','ACCOUNTS_APPROVED'];
    const rejectionActions = ['OPS_REJECTED','DG_REJECTED','HR_REJECTED','ACCOUNTS_REJECTED'];
    const lastApproval = [...entries].reverse().find(e=>approvalsOrder.includes(e.action));
    const lastEntry = entries[entries.length-1];
    const hasHRAppr = entries.some(e=>e.action==='HR_APPROVED');
    const hasAccountsAppr = entries.some(e=>e.action==='ACCOUNTS_APPROVED');
    const locType = claim.request?.applicant?.employmentRecords?.[0]?.location?.type || 'HEAD_OFFICE';

    // If rejected, allow undo (CLEAR) if last entry is a rejection by this user and they still have that stage permission
    if(status === 'REJECTED') {
      let canClear = false;
      if(lastEntry && rejectionActions.includes(lastEntry.action) && lastEntry.actor_employee_id === user?.employee_id){
        const stage = lastEntry.action.split('_')[0];
        if( (stage==='OPS' && canOps) || (stage==='DG' && canDG) || (stage==='HR' && canHR) || (stage==='ACCOUNTS' && canAccounts) ) {
          canClear = true;
        }
      }
      return { canApprove:false, canReject:false, canClear };
    }

    const nextStageHasActed = () => {
      if(!lastApproval) return false;
      if(lastApproval.action==='OPS_APPROVED' || lastApproval.action==='DG_APPROVED') return hasHRAppr || hasAccountsAppr;
      if(lastApproval.action==='HR_APPROVED') return hasAccountsAppr;
      if(lastApproval.action==='ACCOUNTS_APPROVED') return false; // final stage
      return false;
    };

    const lastApprovalIsMine = lastApproval && lastApproval.actor_employee_id === user?.employee_id;
    const userIsLastActor = lastApprovalIsMine && !nextStageHasActed();

    let canForwardApprove = false;
    if(status==='SUBMITTED'){
      if(locType==='BAZAAR' && canOps) canForwardApprove = true;
      if(locType==='HEAD_OFFICE' && canDG) canForwardApprove = true;
    } else if(status==='PENDING_APPROVAL'){
      if(canHR) canForwardApprove = true;
    } else if(status==='VERIFIED'){
      if(canAccounts) canForwardApprove = true;
    }

    // Final approved by accounts: allow last actor to clear or reject (but not re-approve)
    if(status==='APPROVED' && lastApprovalIsMine){
      return { canApprove:false, canReject:true, canClear:true };
    }
    // User was last stage actor and next stage has not acted: allow full modification
    if(userIsLastActor){
      return { canApprove:true, canReject:true, canClear:true };
    }
    // Forward stage normal approval path
    if(canForwardApprove){
      return { canApprove:true, canReject:true, canClear:false };
    }
    return { canApprove:false, canReject:false, canClear:false };
  };

  const load = async () => { setLoading(true); try { const rs = await listPendingExpenseClaimApprovals(); setList(rs); } finally { setLoading(false); } };
  useEffect(()=>{ load(); },[]);

  const open = (c) => { setSelected(c); setRemarks(''); };
  const close = () => setSelected(null);

  const act = async (action) => {
    if(!selected) return; if(!window.confirm(`Confirm ${action.toLowerCase()}?`)) return;
    setSubmitting(true);
    try { const upd = await decideExpenseClaim(selected.id, action, remarks); setSelected(upd); await load(); close(); }
    catch(e){ alert(e?.response?.data?.error || e.message); }
    finally { setSubmitting(false); }
  };

  const loadAll = async () => { setLoadingAll(true); try { const rs = await listAllExpenseClaimApprovals(); setAllClaims(rs); } finally { setLoadingAll(false);} };
  // extend initial load to fetch all in background
  useEffect(()=>{ load(); loadAll(); },[]);

  const filteredAll = useMemo(()=>{
    return (allClaims||[]).filter(c => {
      const q = search.trim().toLowerCase();
      if(q){
        const empName = (c.employee?.full_name||'').toLowerCase();
        const reqPurpose = (c.request?.purpose||c.request?.travel_purpose||'').toLowerCase();
        if(!(`${c.id}`.includes(q) || `${c.employee_id}`.includes(q) || empName.includes(q) || reqPurpose.includes(q))) return false;
      }
      if(statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [allClaims, search, statusFilter]);

  const exportCsv = () => {
    const csv = exportExpenseClaimsToCsv(filteredAll);
    if(!csv){ alert('Nothing to export'); return; }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='expense-claims.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500);
  };

  const currentEmployment = (emp) => emp?.employmentRecords?.[0];
  const formatMoney = (v) => (v||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Manage Expense Claim Approvals</h1>
      <div className="flex gap-4 text-sm">
        <button onClick={()=>setViewTab('pending')} className={viewTab==='pending'? 'pb-2 border-b-2 border-sky-600 text-sky-600 font-medium':'pb-2 text-slate-500'}>Pending Approvals</button>
        <button onClick={()=>{ setViewTab('all'); if(allClaims.length===0) loadAll(); }} className={viewTab==='all'? 'pb-2 border-b-2 border-sky-600 text-sky-600 font-medium':'pb-2 text-slate-500'}>All Claims</button>
      </div>
      {viewTab==='pending' && (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Pending Claims</h2>
            <button onClick={load} className="text-xs text-sky-600">Refresh</button>
          </div>
          <div className="divide-y">
            {loading && <div className="p-4 text-slate-500 text-sm">Loading...</div>}
            {!loading && list.length===0 && <div className="p-4 text-slate-500 text-sm">No pending claims</div>}
            {list.map(c => {
              const emp = c.employee; const empJob = currentEmployment(emp);
              const eligibility = computeEligibility(c);
              const onRowAction = async (claim, action) => {
                if(action==='') return;
                const labelMap = { APPROVE:'approve', REJECT:'reject', CLEAR:'clear approval of' };
                if(!window.confirm(`Confirm to ${labelMap[action]} claim #${claim.id}?`)) return;
                try { await decideExpenseClaim(claim.id, action, ''); await load(); } catch(e){ alert(e?.response?.data?.error || e.message); }
              };
              return (
                <div key={c.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-800">Claim #{c.id} • Req #{c.travel_request_id} • {emp?.full_name || 'Employee'} ({empJob?.designation?.title || '—'})</div>
                    <div className="text-slate-500">Distance {c.total_distance_km||0} km • Grand {formatMoney(c.grand_total)}</div>
                    <div className="flex flex-wrap gap-1">
                      {(c.statusEntries||[]).map(se => <span key={se.id} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]" title={new Date(se.createdAt).toLocaleString()}>{se.action}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>open(c)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50">View</button>
                    <select onChange={e=>{ const v=e.target.value; e.target.value=''; onRowAction(c,v); }} defaultValue="" className="border text-xs rounded px-2 py-1 bg-white">
                      <option value="" disabled>Action</option>
                      <option value="APPROVE" disabled={!eligibility.canApprove}>Approve</option>
                      <option value="REJECT" disabled={!eligibility.canReject}>Reject</option>
                      <option value="CLEAR" disabled={!eligibility.canClear}>Undo Decision</option>
                    </select>
                  </div>
                </div>
              );
            })}
           </div>
         </Card>
       )}
      {viewTab==='all' && (
        <Card>
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-800">All Claims</h2>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search id, emp, purpose" className="border rounded px-2 py-1 text-xs" />
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-xs">
                <option value="">All Statuses</option>
                {['DRAFT','SUBMITTED','PENDING_APPROVAL','VERIFIED','APPROVED','REJECTED'].map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={exportCsv} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Export CSV</button>
              <button onClick={loadAll} className="text-xs text-sky-600">Refresh</button>
            </div>
            <div className="text-[11px] text-slate-500">Showing {filteredAll.length} / {allClaims.length}</div>
          </div>
          <div className="divide-y max-h-[60vh] overflow-auto">
            {loadingAll && <div className="p-4 text-slate-500 text-sm">Loading...</div>}
            {!loadingAll && filteredAll.length===0 && <div className="p-4 text-slate-500 text-sm">No claims match filters.</div>}
            {filteredAll.map(c => {
              const emp = c.employee; const empJob = c.employee?.employmentRecords?.[0];
              const eligibility = computeEligibility(c);
              const onRowAction = async (claim, action) => {
                if(action==='') return;
                const labelMap = { APPROVE:'approve', REJECT:'reject', CLEAR:'clear approval of' };
                if(!window.confirm(`Confirm to ${labelMap[action]} claim #${claim.id}?`)) return;
                try { await decideExpenseClaim(claim.id, action, ''); await load(); await loadAll(); } catch(e){ alert(e?.response?.data?.error || e.message); }
              };
              return (
                <div key={c.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-800 flex flex-wrap items-center gap-1">Claim #{c.id} • Req #{c.travel_request_id} • {emp?.full_name || 'Employee'} <span className="text-slate-400">({empJob?.designation?.title || '—'})</span> <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border">{c.status}</span></div>
                    <div className="text-slate-500">Distance {c.total_distance_km||0} km • Grand {(c.grand_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    <div className="flex flex-wrap gap-1">
                      {(c.statusEntries||[]).map(se => <span key={se.id} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]" title={new Date(se.createdAt).toLocaleString()}>{se.action}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>open(c)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50">View</button>
                    <select onChange={e=>{ const v=e.target.value; e.target.value=''; onRowAction(c,v); }} defaultValue="" className="border text-xs rounded px-2 py-1 bg-white">
                      <option value="" disabled>Action</option>
                      <option value="APPROVE" disabled={!eligibility.canApprove}>Approve</option>
                      <option value="REJECT" disabled={!eligibility.canReject}>Reject</option>
                      <option value="CLEAR" disabled={!eligibility.canClear}>Undo Decision</option>
                    </select>
                  </div>
                </div>
              );
            })}
           </div>
         </Card>
       )}

      {selected && (() => { const emp = selected.employee; const empJob = currentEmployment(emp); return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 p-5 space-y-5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-800 text-lg">Expense Claim #{selected.id}</div>
                <div className="text-slate-500 text-xs">Created {new Date(selected.createdAt).toLocaleString()}</div>
              </div>
              <button onClick={close} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-500 text-[11px] uppercase">Employee</div>
                <div className="font-medium text-slate-800">{emp?.full_name || '—'} <span className="text-slate-400">#{selected.employee_id}</span></div>
                <div className="text-slate-500 text-xs">CNIC: {emp?.cnic || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px] uppercase">Designation</div>
                <div className="font-medium text-slate-800">{empJob?.designation?.title || '—'}</div>
                <div className="text-slate-500 text-xs">Dept: {empJob?.department?.title || empJob?.department?.name || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px] uppercase">Location</div>
                <div className="font-medium text-slate-800">{empJob?.location?.name || '—'}</div>
                <div className="text-slate-500 text-xs">Type: {empJob?.location?.type || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px] uppercase">Status</div>
                <div className="font-medium text-slate-800">{selected.status}</div>
                <div className="text-slate-500 text-xs">Segments: {(selected.segments||[]).length}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-3">
                <div className="text-[11px] uppercase text-slate-500 mb-1">Request</div>
                <div className="font-medium text-slate-800">#{selected.travel_request_id}</div>
                <div className="text-xs text-slate-600">{selected.request?.purpose || selected.request?.travel_purpose}</div>
                <div className="text-[11px] text-slate-500 mt-1">{selected.request?.origin} → {selected.request?.destination}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] uppercase text-slate-500 mb-1">Totals</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>Distance KM</div><div className="text-right font-medium">{selected.total_distance_km||0}</div>
                  <div>Per Diem Days</div><div className="text-right font-medium">{selected.per_diem_days||0}</div>
                  <div>Per Diem Rate</div><div className="text-right font-medium">{formatMoney(selected.per_diem_rate)}</div>
                  <div>Per Diem Total</div><div className="text-right font-medium">{formatMoney(selected.per_diem_total)}</div>
                  <div>Transport Total</div><div className="text-right font-medium">{formatMoney(selected.transport_total)}</div>
                  <div>Other Total</div><div className="text-right font-medium">{formatMoney(selected.other_total)}</div>
                  <div className="col-span-2 border-t pt-1"></div>
                  <div>Grand Total</div><div className="text-right font-semibold">{formatMoney(selected.grand_total)}</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] uppercase text-slate-500 mb-1">Documents</div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                  {(selected.documents||[]).map(d => {
                    let p = d.file_path || ''; p = p.replace(/^\\+|^\/+/, ''); const isAbsolute = /^https?:\/\//i.test(p);
                    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
                    const url = isAbsolute ? p : (p.startsWith('uploads/') ? `${base}/${p}` : `${base}/${p}`);
                    return <a key={d.id} href={url} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-slate-50">{d.category}:{p.split('/').pop()}</a>;
                  })}
                  {(!selected.documents||selected.documents.length===0) && <div className="text-[10px] text-slate-500">No documents</div>}
                </div>
              </Card>
            </div>

            <div>
              <div className="text-[11px] uppercase text-slate-500 mb-2">Segments</div>
              <div className="overflow-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Mode</th>
                      <th className="p-2 text-left font-medium">From</th>
                      <th className="p-2 text-left font-medium">To</th>
                      <th className="p-2 text-left font-medium">Distance KM</th>
                      <th className="p-2 text-left font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.segments||[]).map((s,i)=>(
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{i+1}</td>
                        <td className="p-2">{s.mode||'—'}</td>
                        <td className="p-2">{s.origin||'—'}</td>
                        <td className="p-2">{s.destination||'—'}</td>
                        <td className="p-2">{s.distance_km||0}</td>
                        <td className="p-2">{formatMoney(s.amount)}</td>
                      </tr>
                    ))}
                    {(!selected.segments || selected.segments.length===0) && <tr><td colSpan={6} className="p-2 text-center text-slate-500">No segments</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase text-slate-500 mb-2">Status History</div>
              <div className="space-y-1 max-h-48 overflow-auto pr-1">
                {(selected.statusEntries||[]).map(se => { const actorJob = currentEmployment(se.actor); return (
                  <div key={se.id} className="flex items-start gap-2 text-xs border rounded p-2 bg-slate-50">
                    <div className="font-mono text-[10px] px-1 py-0.5 bg-white rounded border">{se.action}</div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-700">{se.actor?.full_name || '—'} <span className="text-slate-400">#{se.actor_employee_id}</span> {actorJob?.designation?.title && <span className="text-slate-500">({actorJob.designation.title})</span>}</div>
                      <div className="text-slate-500">at {new Date(se.createdAt).toLocaleString()} {se.remarks && <span className="italic text-slate-600">— {se.remarks}</span>}</div>
                    </div>
                  </div>
                ); })}
                {(!selected.statusEntries||selected.statusEntries.length===0) && <div className="text-[11px] text-slate-500">No history</div>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500">Remarks (optional)</label>
              <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={3} className="w-full border rounded p-2 text-xs" placeholder="Add remarks for this decision" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              {(() => { const elig = computeEligibility(selected); return (
                <div className="flex gap-2">
                  <button type="button" onClick={()=>{ setRemarks(''); close(); }} className="px-3 py-1 rounded bg-slate-200 text-slate-700 text-xs">Close</button>
                  <select disabled={submitting} onChange={e=>{ const v=e.target.value; if(!v) return; if(v==='CLEAR'){ if(!window.confirm('Clear your last approval?')) { e.target.value=''; return;} } act(v); e.target.value=''; }} defaultValue="" className="border text-xs rounded px-2 py-1 bg-white">
                    <option value="" disabled>Action</option>
                    <option value="APPROVE" disabled={!elig.canApprove}>Approve</option>
                    <option value="REJECT" disabled={!elig.canReject}>Reject</option>
                    <option value="CLEAR" disabled={!elig.canClear}>Undo Decision</option>
                  </select>
                </div>
              ); })()}
              <button onClick={close} className="px-3 py-1 rounded bg-slate-200 text-slate-700 text-xs">Dismiss</button>
            </div>
           </div>
         </div>
      ); })()}
    </div>
  );
}
