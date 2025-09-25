import React, { useEffect, useState } from 'react';
import { getTravelRequest, updateTravelRequestStatus } from '../../../services/travelService';
import api from '../../../lib/axios';

export default function TravelApprovalsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/travel/requests/pending-approvals');
      setList(res.data?.requests || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    setOpen(true);
    setSelected(null);
    const full = await getTravelRequest(id);
    setSelected(full);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Travel Approvals</h1>
        <button onClick={load} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border">Refresh</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Pending Approvals</h2>
        </div>
        <div className="divide-y">
          {loading && <div className="p-4 text-slate-500">Loading...</div>}
          {!loading && list.length === 0 && <div className="p-6 text-slate-500">No pending requests</div>}
          {list.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-800">{r.purpose || '—'}</div>
                <div className="text-slate-500">{r.destination ? `${r.destination} · ` : ''}{String(r.departure_date).slice(0,10)} {r.departure_time ? `at ${r.departure_time}`:''} → {String(r.expected_return_date).slice(0,10)} · {r.total_days ? `${r.total_days} day(s)` : '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>openDetail(r.id)} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border">View</button>
                <select
                  disabled={submitting}
                  value={r.status}
                  onChange={async (e)=>{
                    const val = e.target.value;
                    setSubmitting(true);
                    try {
                      await updateTravelRequestStatus(r.id, val);
                      await load();
                    } catch(err){
                      alert(err?.response?.data?.error || 'Update failed');
                    } finally { setSubmitting(false); }
                  }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value="CREATED">CREATED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-slate-800">TADA Request Details</div>
              <button onClick={()=>setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {!selected && <div className="text-slate-500">Loading...</div>}
              {selected && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-500">Submission Date</div>
                      <div className="font-medium text-slate-800">{String(selected.submission_date).slice(0,10)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Purpose</div>
                      <div className="font-medium text-slate-800">{selected.purpose || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Destination</div>
                      <div className="font-medium text-slate-800">{selected.destination || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Departure</div>
                      <div className="font-medium text-slate-800">{String(selected.departure_date).slice(0,10)} {selected.departure_time ? `at ${selected.departure_time}`: ''}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Expected Return</div>
                      <div className="font-medium text-slate-800">{String(selected.expected_return_date).slice(0,10)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Total Days</div>
                      <div className="font-medium text-slate-800">{selected.total_days || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Employees</div>
                      <div className="font-medium text-slate-800 space-y-1">
                        {(selected.attendees||[]).length
                          ? (selected.attendees||[]).map(a => (
                              <div key={a.id}>{a.employee.full_name} — {a.employee.cnic || 'N/A'}</div>
                            ))
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="font-medium text-slate-800 mb-2">Status History</div>
                    <div className="rounded-lg border border-slate-200 divide-y">
                      {(selected.statusEntries||[]).length === 0 && <div className="p-3 text-slate-500">No history</div>}
                      {(selected.statusEntries||[]).map(s => (
                        <div key={s.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-800">{s.action}</div>
                            <div className="text-slate-500 text-xs">by {s.actor?.full_name || '—'} at {new Date(s.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
