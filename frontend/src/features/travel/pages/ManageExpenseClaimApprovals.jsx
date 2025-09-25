import React, { useEffect, useState } from 'react';
import { listPendingExpenseClaimApprovals, decideExpenseClaim } from '../../../services/travelService';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

export default function ManageExpenseClaimApprovals(){
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');

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

  const currentEmployment = (emp) => emp?.employmentRecords?.[0];
  const formatMoney = (v) => (v||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Manage Expense Claim Approvals</h1>
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
            const lastActions = (c.statusEntries||[]).map(s=>s.action);
            const canClear = ['ACCOUNTS_APPROVED','HR_APPROVED','OPS_APPROVED','DG_APPROVED'].some(a=> lastActions.includes(a)) && !['REJECTED'].includes(c.status);
            const onRowAction = async (claim, action) => {
              if(action==='VIEW') return open(claim);
              if(action==='') return;
              const labelMap = { APPROVE:'approve', REJECT:'reject', CLEAR:'clear approval' };
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
                  <select onChange={e=>{ const v=e.target.value; e.target.value=''; onRowAction(c,v); }} defaultValue="" className="border text-xs rounded px-2 py-1 bg-white">
                    <option value="" disabled>Action</option>
                    <option value="VIEW">View</option>
                    <option value="APPROVE" disabled={c.status==='APPROVED'||c.status==='REJECTED'}>Approve</option>
                    <option value="REJECT" disabled={c.status==='APPROVED'||c.status==='REJECTED'}>Reject</option>
                    <option value="CLEAR" disabled={!canClear}>Clear Approval</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
              <select disabled={submitting} onChange={e=>{ const v=e.target.value; if(!v) return; act(v); e.target.value=''; }} defaultValue="" className="border text-xs rounded px-2 py-1 bg-white">
                <option value="" disabled>Action</option>
                <option value="APPROVE" disabled={selected.status==='APPROVED'||selected.status==='REJECTED'}>Approve</option>
                <option value="REJECT" disabled={selected.status==='APPROVED'||selected.status==='REJECTED'}>Reject</option>
                <option value="CLEAR" disabled={selected.status==='DRAFT'||selected.status==='SUBMITTED'}>Clear Approval</option>
              </select>
              <button onClick={close} className="px-3 py-1 rounded bg-slate-200 text-slate-700 text-xs">Close</button>
            </div>
          </div>
        </div>
      ); })()}
    </div>
  );
}
