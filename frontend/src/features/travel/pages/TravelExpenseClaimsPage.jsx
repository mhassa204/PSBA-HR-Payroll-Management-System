import React, { useEffect, useState } from 'react';
import { 
  getEligibleExpenseClaimRequests,
  listExpenseClaims,
  createExpenseClaim,
  getExpenseClaim,
  updateExpenseClaim,
  addExpenseClaimSegment,
  updateExpenseClaimSegment,
  deleteExpenseClaimSegment,
  uploadExpenseClaimDocuments,
  deleteExpenseClaimDocument,
  deleteExpenseClaim,
  submitExpenseClaim,
  computeExpenseClaimTotals
} from '../../../services/travelService';
import { useAuthStore } from '../../auth/authStore';

const Input = (p) => <input {...p} className={`border rounded px-2 py-1 text-sm w-full ${p.className||''}`} />;
const Select = (p) => <select {...p} className={`border rounded px-2 py-1 text-sm w-full ${p.className||''}`} />;

export default function TravelExpenseClaimsPage(){
  const can = useAuthStore(s=>s.can);
  const [eligible, setEligible] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [tab, setTab] = useState('eligible'); // eligible | existing
  const [step, setStep] = useState(1); // 1=list,2=select attendee,3=form
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [claim, setClaim] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingCreationAttendee, setPendingCreationAttendee] = useState(null); // holds attendee until user confirms creation

  // Form core fields
  const [form, setForm] = useState({
    from_date: '',
    to_date: '',
    overnight_stay: false,
    rate_per_km: '',
    toll_tax_total: '',
    per_diem_days: '',
    per_diem_rate: ''
  });

  const [segmentsDraft, setSegmentsDraft] = useState([]); // local unsaved until added

  const loadEligible = async () => {
    setLoadingEligible(true);
    try { const rs = await getEligibleExpenseClaimRequests(); setEligible(rs); } finally { setLoadingEligible(false);} };
  const loadClaims = async () => { setLoadingClaims(true); try { const rs = await listExpenseClaims(); setClaims(rs); } finally { setLoadingClaims(false);} };
  useEffect(()=>{ loadEligible(); loadClaims(); },[]);

  const startClaim = (req) => { setSelectedRequest(req); setStep(2);} ;
  const chooseAttendee = (att) => { setSelectedAttendee(att); setPendingCreationAttendee(att); };
  const reqId = () => selectedRequest?.id;

  const confirmCreateClaim = async () => {
    if(!pendingCreationAttendee || !selectedRequest) return;
    try {
      setSaving(true);
      const c = await createExpenseClaim({ travel_request_id: selectedRequest.id, employee_id: pendingCreationAttendee.employee_id });
      setClaim(c);
      setForm(prev => ({...prev, from_date: c.from_date?.slice(0,10)||'', to_date: c.to_date?.slice(0,10)||'', rate_per_km: c.rate_per_km||0, per_diem_rate: c.per_diem_rate||0 }));
      setStep(3);
      setPendingCreationAttendee(null);
      loadEligible();
      loadClaims();
    } finally { setSaving(false);} };

  const cancelCreateFlow = () => { setPendingCreationAttendee(null); setSelectedAttendee(null); };

  const refreshClaim = async () => { if(!claim) return; const full = await getExpenseClaim(claim.id); setClaim(full); setForm(f=>({...f, rate_per_km: full.rate_per_km||0, per_diem_rate: full.per_diem_rate||0 })); };

  const persistCore = async () => {
    if(!claim) return;
    setSaving(true);
    try {
      const payload = {
        from_date: form.from_date || null,
        to_date: form.to_date || null,
        overnight_stay: !!form.overnight_stay,
        rate_per_km: Number(form.rate_per_km||0),
        // remove manual per diem rate input usage
        per_diem_rate: Number(form.per_diem_rate||0)
      };
      const updated = await updateExpenseClaim(claim.id, payload);
      setClaim(updated);
      loadClaims();
    } finally { setSaving(false);} };

  const handleDeleteClaim = async () => {
    if(!claim) return;
    if(!window.confirm('Delete this claim?')) return;
    try { await deleteExpenseClaim(claim.id); setClaim(null); setStep(1); setSelectedRequest(null); setSelectedAttendee(null); loadEligible(); loadClaims(); } catch(e){ alert(e.message); }
  };

  const addSegment = async (seg) => { if(!claim) return; const updated = await addExpenseClaimSegment(claim.id, seg); setClaim(updated); loadClaims(); };
  const updateSegmentRow = async (seg) => { if(!claim) return; const updated = await updateExpenseClaimSegment(claim.id, seg.id, seg); setClaim(updated); loadClaims(); };
  const removeSegment = async (id) => { if(!claim) return; const updated = await deleteExpenseClaimSegment(claim.id, id); setClaim(updated); loadClaims(); };

  const totals = computeExpenseClaimTotals(claim||{...form, total_distance_km: (claim?.segments||[]).reduce((s,a)=>s+Number(a.distance_km||0),0) });

  const handleDocUpload = async (category, files) => { if(!claim||!files?.length) return; const updated = await uploadExpenseClaimDocuments(claim.id, category, files); setClaim(updated); loadClaims(); };
  const handleDocDelete = async (docId) => { if(!claim) return; const updated = await deleteExpenseClaimDocument(claim.id, docId); setClaim(updated); loadClaims(); };

  const attendeeAlreadyClaimed = (req, empId) => (req.claims||[]).some(c=>c.employee_id===empId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Travel Expense Claims</h1>

      {step===1 && (
        <div className="bg-white rounded shadow border">
          <div className="px-4 pt-4 flex gap-4 border-b text-sm font-medium">
            <button className={tab==='eligible'? 'text-sky-600 border-b-2 border-sky-600 pb-2':'pb-2 text-slate-500'} onClick={()=>setTab('eligible')}>Create New (Eligible Requests)</button>
            <button className={tab==='existing'? 'text-sky-600 border-b-2 border-sky-600 pb-2':'pb-2 text-slate-500'} onClick={()=>setTab('existing')}>Existing Claims</button>
          </div>
          {tab==='eligible' && (
            <>
              <div className="p-4 font-semibold">Eligible Approved Requests (last 15 days)</div>
              {loadingEligible && <div className="p-4 text-sm text-slate-500">Loading...</div>}
              {!loadingEligible && eligible.length===0 && <div className="p-6 text-sm text-slate-500">No approved recent requests.</div>}
              <div className="divide-y">
              {eligible.map(r=> (
                <div key={r.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-800">Request #{r.id} · {r.destination||'Destination'} · {r.status}</div>
                    <div className="text-slate-500">Departure {String(r.departure_date).slice(0,10)} → Return {String(r.expected_return_date).slice(0,10)}</div>
                  </div>
                  <button disabled={!can('travel.claim.create')} onClick={()=>startClaim(r)} className="px-3 py-2 rounded bg-sky-600 disabled:opacity-40 text-white">Start</button>
                </div>
              ))}
              </div>
            </>
          )}
          {tab==='existing' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Existing Claims</div>
                <button onClick={loadClaims} className="text-xs text-sky-600">Refresh</button>
              </div>
              {loadingClaims && <div className="text-xs text-slate-500">Loading claims...</div>}
              {!loadingClaims && claims.length===0 && <div className="text-xs text-slate-400">No claims yet.</div>}
              <div className="divide-y">
                {claims.map(c => (
                  <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-700">Claim #{c.id} • Req #{c.travel_request_id} • Emp #{c.employee_id}</div>
                      <div className="text-slate-500">Distance {c.total_distance_km||0} km • Grand {c.grand_total||0}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{ setClaim(null); setSelectedRequest(null); setSelectedAttendee(null); setStep(3); getExpenseClaim(c.id).then(full=> setClaim(full)); }} className="px-2 py-1 bg-slate-700 text-white rounded">Open</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step===2 && selectedRequest && (
        <div className="bg-white rounded shadow border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Select Attendee For Claim (Request #{selectedRequest.id})</div>
            <button onClick={()=>{setStep(1); setSelectedRequest(null);}} className="text-slate-500 hover:underline text-sm">Back</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {selectedRequest.attendees.map(a=> (
              <button key={a.id} disabled={attendeeAlreadyClaimed(selectedRequest, a.employee_id)} onClick={()=>chooseAttendee(a)} className={`p-3 border rounded text-left hover:bg-slate-50 disabled:opacity-40 ${attendeeAlreadyClaimed(selectedRequest, a.employee_id)?'cursor-not-allowed':'cursor-pointer'}`}>
                <div className="font-medium">{a.employee?.full_name||'Employee'} (#{a.employee_id})</div>
                {attendeeAlreadyClaimed(selectedRequest, a.employee_id) && <div className="text-xs text-amber-600">Claim already created</div>}
              </button>
            ))}
          </div>
          {pendingCreationAttendee && (
            <div className="p-3 border rounded bg-sky-50 text-xs flex items-center justify-between">
              <div>Proceed creating claim for employee #{pendingCreationAttendee.employee_id}?</div>
              <div className="flex gap-2">
                <button onClick={confirmCreateClaim} className="px-2 py-1 bg-emerald-600 text-white rounded">Yes</button>
                <button onClick={cancelCreateFlow} className="px-2 py-1 bg-red-600 text-white rounded">No</button>
              </div>
            </div>
          )}
        </div>
      )}

      {step===3 && claim && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Expense Claim #{claim.id} (Request #{claim.travel_request_id})</div>
            <div className="flex gap-3 items-center">
              {claim.status==='DRAFT' && <button onClick={handleDeleteClaim} className="text-xs text-red-600 border border-red-600 rounded px-2 py-1">Delete</button>}
              {claim.status==='DRAFT' && <button onClick={async ()=>{ if(!(claim.documents||[]).some(d=>d.category==='REPORT')) { alert('Upload REPORT before submitting'); return; } try { const updated = await submitExpenseClaim(claim.id); setClaim(updated); loadClaims(); alert('Submitted'); } catch(e){ alert(e.message); } }} className="text-xs text-sky-600 border border-sky-600 rounded px-2 py-1">Submit</button>}
              <button onClick={()=>{ setStep(1); setClaim(null); setSelectedRequest(null); setSelectedAttendee(null); loadEligible(); loadClaims(); }} className="text-slate-500 hover:underline text-sm">Close</button>
            </div>
          </div>

          {/* Core Fields */}
          <div className="bg-white border rounded shadow-sm p-4 grid md:grid-cols-7 gap-4 text-sm">
            <div>
              <label className="text-xs text-slate-500">From Date</label>
              <Input type="date" value={form.from_date} onChange={e=>setForm(p=>({...p,from_date:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">To Date</label>
              <Input type="date" value={form.to_date} onChange={e=>setForm(p=>({...p,to_date:e.target.value}))} />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={form.overnight_stay} onChange={e=>setForm(p=>({...p,overnight_stay:e.target.checked}))} />
              <span className="text-xs">Overnight Stay</span>
            </div>
            <div>
              <label className="text-xs text-slate-500">Rate / Km (B)</label>
              <div className="text-sm font-medium pt-2">{form.rate_per_km || 0}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Toll Tax Total (D)</label>
              <Input value={form.toll_tax_total} onChange={e=>setForm(p=>({...p,toll_tax_total:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Per Diem Days</label>
              <Input value={form.per_diem_days} onChange={e=>setForm(p=>({...p,per_diem_days:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Per Diem Rate</label>
              <div className="text-sm font-medium pt-2">{form.per_diem_rate || 0}</div>
            </div>
            <div className="md:col-span-7 flex justify-end">
              <button disabled={saving} onClick={persistCore} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-40">Save Core</button>
            </div>
          </div>

          {/* Segments table */}
          <div className="bg-white border rounded shadow-sm p-4 text-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Travel Segments</div>
              <button onClick={()=>setSegmentsDraft(d=>[...d,{ departure_from:'', departure_to:'', depart_time:'', arrive_time:'', mode:'', distance_km:'' }])} className="px-3 py-1 text-xs rounded bg-slate-700 text-white">Add Row</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Departure From</th>
                    <th className="p-2 text-left">Departure To</th>
                    <th className="p-2 text-left">Time of Departure</th>
                    <th className="p-2 text-left">Time of Arrival</th>
                    <th className="p-2 text-left">Mode</th>
                    <th className="p-2 text-left">Distance (KM)</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {segmentsDraft.map((r,idx)=> (
                    <tr key={idx} className="border-b">
                      <td className="p-1"><Input value={r.departure_from} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,departure_from:e.target.value}:x))} /></td>
                      <td className="p-1"><Input value={r.departure_to} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,departure_to:e.target.value}:x))} /></td>
                      <td className="p-1"><Input type="time" value={r.depart_time} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,depart_time:e.target.value}:x))} /></td>
                      <td className="p-1"><Input type="time" value={r.arrive_time} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,arrive_time:e.target.value}:x))} /></td>
                      <td className="p-1"><Input value={r.mode} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,mode:e.target.value}:x))} /></td>
                      <td className="p-1"><Input value={r.distance_km} onChange={e=>setSegmentsDraft(d=>d.map((x,i)=>i===idx?{...x,distance_km:e.target.value}:x))} /></td>
                      <td className="p-1 text-right space-x-2">
                        <button className="text-emerald-600" onClick={()=>{ const seg = segmentsDraft[idx]; addSegment({ ...seg, distance_km: Number(seg.distance_km||0) }); setSegmentsDraft(d=>d.filter((_,i)=>i!==idx)); }}>✔</button>
                        <button className="text-red-600" onClick={()=>setSegmentsDraft(d=>d.filter((_,i)=>i!==idx))}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {(claim.segments||[]).map(seg => (
                    <tr key={seg.id} className="border-b bg-emerald-50/40">
                      <td className="p-1"><Input defaultValue={seg.departure_from} onBlur={e=>updateSegmentRow({...seg,departure_from:e.target.value})} /></td>
                      <td className="p-1"><Input defaultValue={seg.departure_to} onBlur={e=>updateSegmentRow({...seg,departure_to:e.target.value})} /></td>
                      <td className="p-1"><Input type="time" defaultValue={seg.depart_time||''} onBlur={e=>updateSegmentRow({...seg,depart_time:e.target.value})} /></td>
                      <td className="p-1"><Input type="time" defaultValue={seg.arrive_time||''} onBlur={e=>updateSegmentRow({...seg,arrive_time:e.target.value})} /></td>
                      <td className="p-1"><Input defaultValue={seg.mode||''} onBlur={e=>updateSegmentRow({...seg,mode:e.target.value})} /></td>
                      <td className="p-1"><Input defaultValue={seg.distance_km||''} onBlur={e=>updateSegmentRow({...seg,distance_km:Number(e.target.value||0)})} /></td>
                      <td className="p-1 text-right space-x-2">
                        <button className="text-red-600" onClick={()=>removeSegment(seg.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-white border rounded shadow-sm p-4 text-sm grid md:grid-cols-7 gap-4">
            <div><div className="text-xs text-slate-500">A Total Distance (KM)</div><div className="font-medium">{totals.A}</div></div>
            <div><div className="text-xs text-slate-500">B Rate / KM</div><div className="font-medium">{totals.B}</div></div>
            <div><div className="text-xs text-slate-500">C A x B</div><div className="font-medium">{totals.C}</div></div>
            <div><div className="text-xs text-slate-500">D Toll Tax</div><div className="font-medium">{totals.D}</div></div>
            <div><div className="text-xs text-slate-500">E Travel Total (C + D)</div><div className="font-medium">{totals.E}</div></div>
            <div><div className="text-xs text-slate-500">F Per Diem Amount</div><div className="font-medium">{totals.F}</div></div>
            <div><div className="text-xs text-slate-500">G Grand Total</div><div className="font-semibold text-emerald-700">{totals.G}</div></div>
          </div>

          {/* Documents */}
          <div className="bg-white border rounded shadow-sm p-4 text-sm space-y-4">
            <div className="font-medium">Documents</div>
            {['FUEL','TOLL','PICTURE','REPORT'].map(cat => {
              const docs = (claim.documents||[]).filter(d=>d.category===cat);
              const isReport = cat==='REPORT';
              return (
                <div key={cat} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-xs">{cat} {isReport && <span className="text-rose-600">(Required single file)</span>}</div>
                    <label className="text-xs px-2 py-1 bg-slate-700 text-white rounded cursor-pointer">Upload
                      <input type="file" className="hidden" multiple={!isReport} onChange={e=>{ if(e.target.files?.length){ handleDocUpload(cat, e.target.files); e.target.value=''; } }} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {docs.length===0 && <div className="text-slate-500 text-xs">No files</div>}
                    {docs.map(d => (
                      <div key={d.id} className="relative">
                        {(() => {
                          let p = d.file_path || '';
                          // Normalize slashes and strip leading ./ or /\
                          p = p.replace(/^\\+|^\/+/, '');
                          const isAbsolute = /^https?:\/\//i.test(p);
                          const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
                          const url = isAbsolute ? p : (p.startsWith('uploads/') ? `${base}/${p}` : `${base}/${p}`);
                          return (
                            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1 text-xs border rounded bg-white hover:bg-slate-50 max-w-[160px] truncate">{p.split('/').pop()}</a>
                          );
                        })()}
                        {(!isReport || docs.length>0) && (
                          <button onClick={()=>handleDocDelete(d.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
