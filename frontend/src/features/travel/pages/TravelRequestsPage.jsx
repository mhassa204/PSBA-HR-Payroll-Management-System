import React, { useEffect, useMemo, useState } from 'react';
import { getMyTravelRequests, getTravelRequest, createTravelRequest, getTravelReportees, getTravelCapabilities } from '../../../services/travelService';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import { useAuthStore } from '../../auth/authStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EnhancedModal from '@/components/ui/EnhancedModal';

export default function TravelRequestsPage() {
  const can = useAuthStore(s => s.can);
  const authUser = useAuthStore(s => s.user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ purpose: '', destination: '', departure_date: '', departure_time: '', expected_return_date: '', total_days: '' });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // array of ids
  const [caps, setCaps] = useState({ isBps17Plus: false, canCreateOrOwn: false });

  // detail state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyTravelRequests();
      setList(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Load capabilities to decide UI rules
  useEffect(() => {
    (async () => {
      try {
        const c = await getTravelCapabilities();
        setCaps(c || {});
      } catch (_) {}
    })();
  }, []);

  // load reportees + self or department employees for selector
  useEffect(() => {
    (async () => {
      try {
        const emps = await getTravelReportees();
        setEmployeeOptions(emps.map(e => ({ value: e.id, label: `${e.full_name} — ${e.cnic || 'N/A'}` })));
        // Do not auto-add self to attendees; request is created on behalf automatically for BPS ≥ 17
      } catch (_) {}
    })();
  }, [caps.canCreateOrOwn, caps.isBps17Plus, authUser?.employee_id, authUser?.department_id]);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // compute days on client for preview
  const previewDays = useMemo(() => {
    if (!form.departure_date || !form.expected_return_date) return '';
    try {
      const dep = new Date(form.departure_date + (form.departure_time ? `T${form.departure_time}:00` : 'T00:00:00'));
      const ret = new Date(form.expected_return_date + 'T00:00:00');
      const ms = ret.getTime() - dep.getTime();
      const days = Math.ceil(ms / (24*60*60*1000));
      return String(Math.max(1, days));
    } catch { return ''; }
  }, [form.departure_date, form.departure_time, form.expected_return_date]);

  const onCreate = async () => {
    const payload = {
      purpose: form.purpose || null,
      destination: form.destination || null,
      departure_date: form.departure_date,
      departure_time: form.departure_time || null,
      expected_return_date: form.expected_return_date,
      total_days: previewDays ? Number(previewDays) : null,
      employee_ids: selectedEmployees
    };
    await createTravelRequest(payload);
    setForm({ purpose: '', destination: '', departure_date: '', departure_time: '', expected_return_date: '', total_days: '' });
    setSelectedEmployees([]);
    await load();
  };

  const openDetail = async (id) => {
    setOpen(true);
    setSelected(null);
    const full = await getTravelRequest(id);
    setSelected(full);
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await (await import('../../../services/travelService')).deleteTravelRequest(id);
      await load();
    } catch (e) { console.error(e); }
  };

  const labelAction = (a) => a === 'RECOMMENDED' ? 'Recommended' : a;
  const extractEmail = (remarks, fallback) => {
    const r = String(remarks||'');
    const m = r.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : (remarks || fallback || '—');
  };

  // Determine account type

  // For department-based account: server already excludes HoD from options
  const filteredEmployeeOptions = useMemo(() => employeeOptions, [employeeOptions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TADA Requests</h1>
        {!loading && (
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        )}
      </div>

      {can('travel.create') && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>New TADA Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Always allow adding attendees (optional) */}
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Employees (multi-select, optional)</label>
                <div className="flex flex-wrap gap-2 mb-2 mt-1">
                  {selectedEmployees.map(id => {
                    const opt = filteredEmployeeOptions.find(o => String(o.value) === String(id));
                    return (
                      <Badge key={id} variant="outline" className="gap-2">
                        {opt?.label}
                        <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => setSelectedEmployees(prev => prev.filter(x => x!==id))}>×</button>
                      </Badge>
                    );
                  })}
                </div>
                <SearchableSelect
                  options={filteredEmployeeOptions}
                  value=""
                  onChange={(val) => {
                    const id = Number(val);
                    if (!id) return;
                    setSelectedEmployees(prev => prev.includes(id) ? prev : [...prev, id]);
                  }}
                  placeholder={'Type to search employees...'}
                  allowClear
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Departure Date</label>
                <Input type="date" name="departure_date" value={form.departure_date} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Departure Time</label>
                <Input type="time" name="departure_time" value={form.departure_time} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Expected Return Date</label>
                <Input type="date" name="expected_return_date" value={form.expected_return_date} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Purpose of Travel</label>
                <Input name="purpose" value={form.purpose} onChange={onChange} placeholder="e.g., Market visit" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Destination</label>
                <Input name="destination" value={form.destination} onChange={onChange} placeholder="e.g., Lahore, Karachi" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Total Days of Travel</label>
                <Input name="total_days" value={previewDays} readOnly placeholder="Auto-calculated" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t justify-end">
            <Button onClick={onCreate}>Create</Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>My TADA Requests</CardTitle>
        </CardHeader>
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
                  {r.status === 'CREATED' && !(r.statusEntries||[]).some(se=>['RECOMMENDED','RECOMMENDED_REJECTED','APPROVED','REJECTED'].includes(se.action)) && (
                    <Button variant="destructive" size="sm" onClick={()=>onDelete(r.id)}>Delete</Button>
                  )}
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
              </div>

              <div className="pt-2">
                <div className="font-medium mb-2">Status History</div>
                <div className="rounded-lg border divide-y">
                  {(selected.statusEntries||[]).length === 0 && <div className="p-3 text-muted-foreground">No history</div>}
                  {(selected.statusEntries||[]).map(s => (
                    <div key={s.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{labelAction(s.action)}</div>
                        <div className="text-xs text-muted-foreground">by {extractEmail(s.remarks, s.actor?.full_name)} at {new Date(s.createdAt).toLocaleString()}</div>
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
