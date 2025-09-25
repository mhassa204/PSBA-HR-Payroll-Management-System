import React, { useEffect, useMemo, useState } from 'react';
import { getMyTravelRequests, getTravelRequest, createTravelRequest, getTravelReportees } from '../../../services/travelService';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import { useAuthStore } from '../../auth/authStore';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Header = ({ title, actions }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    <div className="flex gap-2">{actions}</div>
  </div>
);

const Input = (props) => (
  <input {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${props.className||''}`} />
);

export default function TravelRequestsPage() {
  const can = useAuthStore(s => s.can);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ purpose: '', destination: '', departure_date: '', departure_time: '', expected_return_date: '', total_days: '' });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // array of ids

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

  // load reportees + self for selector
  useEffect(() => {
    (async () => {
      try {
        const emps = await getTravelReportees();
        setEmployeeOptions(emps.map(e => ({ value: e.id, label: `${e.full_name} — ${e.cnic || 'N/A'}` })));
      } catch (_) {}
    })();
  }, []);

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
      employee_ids: selectedEmployees,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">TADA Requests</h1>
      </div>

      {can('travel.create') && (
        <Card>
          <Header title="New TADA Request" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600">Employees (multi-select)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedEmployees.map(id => {
                  const opt = employeeOptions.find(o => String(o.value) === String(id));
                  return <span key={id} className="inline-flex items-center px-2 py-1 bg-slate-100 border rounded text-xs">{opt?.label} <button className="ml-1 text-slate-500" onClick={() => setSelectedEmployees(prev => prev.filter(x => x!==id))}>×</button></span>
                })}
              </div>
              <SearchableSelect
                options={employeeOptions}
                value=""
                onChange={(val) => {
                  const id = Number(val);
                  if (!id) return;
                  setSelectedEmployees(prev => prev.includes(id) ? prev : [...prev, id]);
                }}
                placeholder="Type to search employees..."
                allowClear
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Departure Date</label>
              <Input type="date" name="departure_date" value={form.departure_date} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Departure Time</label>
              <Input type="time" name="departure_time" value={form.departure_time} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Expected Return Date</label>
              <Input type="date" name="expected_return_date" value={form.expected_return_date} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Purpose of Travel</label>
              <Input name="purpose" value={form.purpose} onChange={onChange} placeholder="e.g., Market visit" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Destination</label>
              <Input name="destination" value={form.destination} onChange={onChange} placeholder="e.g., Lahore, Karachi" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Total Days of Travel</label>
              <Input name="total_days" value={previewDays} readOnly placeholder="Auto-calculated" />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end">
            <button onClick={onCreate} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">Create</button>
          </div>
        </Card>
      )}

      <Card>
        <Header title="My TADA Requests" />
        <div className="divide-y">
          {loading && <div className="p-4 text-slate-500">Loading...</div>}
          {!loading && list.length === 0 && <div className="p-6 text-slate-500">No requests found</div>}
          {list.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-800">{r.purpose || '—'}</div>
                <div className="text-slate-500">{r.destination ? `${r.destination} · ` : ''}{String(r.departure_date).slice(0,10)} {r.departure_time ? `at ${r.departure_time}`:''} → {String(r.expected_return_date).slice(0,10)} · {r.total_days ? `${r.total_days} day(s)` : '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">{r.status || 'CREATED'}</span>
                <button onClick={()=>openDetail(r.id)} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border">View</button>
                {r.status === 'CREATED' && (
                  <button onClick={()=>onDelete(r.id)} className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

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

                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">Status: {selected.status}</span>
                    {false && selected.status === 'CREATED' && (
                      <div className="flex items-center gap-2">
                        {/* Decision buttons removed as per new requirements (handled via Manage/Approvals with dropdown) */}
                      </div>
                    )}
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
