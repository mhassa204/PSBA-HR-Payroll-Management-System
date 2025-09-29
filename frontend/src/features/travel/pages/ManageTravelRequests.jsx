import React, { useEffect, useState } from 'react';
import { getTravelRequests, getTravelRequest, updateTravelRequestStatus, getTravelCapabilities } from '../../../services/travelService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedModal from '@/components/ui/EnhancedModal';

export default function ManageTravelRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [caps, setCaps] = useState({ isDG: false, isOps: false });

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

  const canDecide = (req) => {
    if (!req) return false;
    if (!(caps.isDG || caps.isOps)) return false; // HR excluded
    // Frontend soft check; backend enforces eligibility
    return true;
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
                {canDecide(selected) && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select
                      disabled={submitting}
                      value={selected.status}
                      onChange={async (e)=>{
                        const val = e.target.value;
                        setSubmitting(true);
                        try {
                          const upd = await updateTravelRequestStatus(selected.id, val);
                          setSelected(upd);
                          await load();
                        } catch(err){
                          alert(err?.response?.data?.error || 'Update failed');
                        } finally { setSubmitting(false); }
                      }}
                      className="border rounded-md px-2 py-1 text-sm bg-background"
                    >
                      <option value="CREATED">CREATED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                )}
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
