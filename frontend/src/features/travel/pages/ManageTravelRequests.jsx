import React, { useEffect, useState } from 'react';
import { getTravelRequests, getTravelRequest, updateTravelRequestStatus, getTravelCapabilities, recommendTravelRequest, clearTravelRecommendation, recommendDecisionTravelRequest } from '../../../services/travelService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedModal from '@/components/ui/EnhancedModal';
import { useAuthStore } from '../../auth/authStore';

export default function ManageTravelRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [caps, setCaps] = useState({ isDG: false, isOps: false });
  const meEmpId = useAuthStore(s=>s.user?.employee_id);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTravelRequests();
      setList(data);
    } finally { setLoading(false); }
  };
  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    (async () => {
      try { const c = await getTravelCapabilities(); setCaps(c || {}); } catch(_) {}
    })();
  }, []);

  const openDetail = async (id) => {
    setOpen(true);
    setSelected(null);
    const full = await getTravelRequest(id);
    setSelected(full);
  };

  const onDecision = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this request?`)) return;
    setSubmitting(true);
    try {
      const updated = await updateTravelRequestStatus(id, action);
      setSelected(updated);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const hasRecommended = (r) => (r?.statusEntries||[]).some(se => se.action==='RECOMMENDED');
  const lastEntry = (r) => (r?.statusEntries||[])[(r?.statusEntries||[]).length-1];
  const canUndoRecommendation = (r) => {
    const last = lastEntry(r);
    return r?.status==='CREATED' && last && last.action==='RECOMMENDED' && String(last.actor_employee_id)===String(meEmpId);
  };

  const doAction = async (r, action) => {
    if(!r) return; if(!window.confirm(`Confirm to ${action.toLowerCase().replace('_',' ')} request #${r.id}?`)) return;
    setSubmitting(true);
    try {
      if(action==='RECOMMEND') await recommendTravelRequest(r.id);
      else if(action==='UNDO_RECOMMEND') await clearTravelRecommendation(r.id);
      else if(action==='RECOMMENDER_REJECT') await recommendDecisionTravelRequest(r.id, 'REJECT');
      else if(action==='APPROVE') await updateTravelRequestStatus(r.id, 'APPROVED');
      else if(action==='REJECT') await updateTravelRequestStatus(r.id, 'REJECTED');
      const full = await getTravelRequest(r.id); setSelected(full);
      await load();
    } catch(err){ alert(err?.response?.data?.error || 'Action failed'); }
    finally { setSubmitting(false); }
  };

  const labelAction = (a) => a === 'RECOMMENDED' ? 'Recommended' : a;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage TADA Requests</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>All TADA Requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading && <div className="p-4 text-muted-foreground">Loading...</div>}
            {!loading && list.length === 0 && <div className="p-6 text-muted-foreground">No requests found</div>}
            {list.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <div className="font-medium">{r.purpose || '—'}</div>
                  <div className="text-muted-foreground">{r.destination ? `${r.destination} · ` : ''}{String(r.departure_date).slice(0,10)} {r.departure_time ? `at ${r.departure_time}`:''} → {String(r.expected_return_date).slice(0,10)} · {r.total_days ? `${r.total_days} day(s)` : '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.status || 'CREATED'}</Badge>
                  <Button variant="outline" size="sm" onClick={()=>openDetail(r.id)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EnhancedModal isOpen={open} onClose={()=>setOpen(false)} title="TADA Request Details" size="lg">
        <div className="p-4 space-y-4 text-sm">
          {!selected && <div className="text-muted-foreground">Loading...</div>}
          {selected && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground">Submission Date</div>
                  <div className="font-medium">{String(selected.submission_date).slice(0,10)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Purpose</div>
                  <div className="font-medium">{selected.purpose || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Destination</div>
                  <div className="font-medium">{selected.destination || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Departure</div>
                  <div className="font-medium">{String(selected.departure_date).slice(0,10)} {selected.departure_time ? `at ${selected.departure_time}`: ''}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Expected Return</div>
                  <div className="font-medium">{String(selected.expected_return_date).slice(0,10)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Days</div>
                  <div className="font-medium">{selected.total_days || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Employees</div>
                  <div className="font-medium space-y-1">
                    {(selected.attendees||[]).length
                      ? (selected.attendees||[]).map(a => (
                          <div key={a.id}>{a.employee.full_name} — {a.employee.cnic || 'N/A'}</div>
                        ))
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline">Status: {selected.status}</Badge>
                <div className="flex items-center gap-1">
                  {canUndoRecommendation(selected) && (
                    <Button disabled={submitting} size="sm" variant="secondary" onClick={()=>doAction(selected,'UNDO_RECOMMEND')}>Undo</Button>
                  )}
                  {!hasRecommended(selected) && (
                    <>
                      {/* Recommender actions generally not exposed here; backend will enforce */}
                      {/* <Button disabled={submitting} size="sm" onClick={()=>doAction(selected,'RECOMMEND')}>Recommend</Button>
                      <Button disabled={submitting} size="sm" variant="destructive" onClick={()=>doAction(selected,'RECOMMENDER_REJECT')}>Reject</Button> */}
                    </>
                  )}
                  {hasRecommended(selected) && (caps.isDG || caps.isOps) && (
                    <>
                      <Button disabled={submitting} size="sm" onClick={()=>doAction(selected,'APPROVE')}>Approve</Button>
                      <Button disabled={submitting} size="sm" variant="destructive" onClick={()=>doAction(selected,'REJECT')}>Reject</Button>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <div className="font-medium mb-2">Status History</div>
                <div className="rounded-lg border divide-y">
                  {(selected.statusEntries||[]).length === 0 && <div className="p-3 text-muted-foreground">No history</div>}
                  {(selected.statusEntries||[]).map(s => (
                    <div key={s.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{labelAction(s.action)}</div>
                        <div className="text-xs text-muted-foreground">by {s.actor?.full_name || '—'} at {new Date(s.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </div>
  );
}
