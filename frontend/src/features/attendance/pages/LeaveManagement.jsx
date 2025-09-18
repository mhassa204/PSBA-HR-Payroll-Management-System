import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';
import { useNavigate } from 'react-router-dom';

const LeaveDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ date: '', type: '', remarks: '' });
  const [canStatus, setCanStatus] = useState(false);
  const [mode, setMode] = useState('single'); // 'single' | 'range' | 'multi'
  const [range, setRange] = useState({ start: '', end: '' });
  const [multiDates, setMultiDates] = useState(['']);

  useEffect(() => {
    if (!open || !employee) return;
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        const me = await axios.get('/me');
        const perms = me?.data?.user?.permissions || [];
        setCanStatus(perms.includes('*') || perms.includes('leaves.status'));
        const [{ data: leavesRes }, { data: typesRes }] = await Promise.all([
          axios.get(`/leaves/${employee.id}`),
          axios.get('/leave-banks/types')
        ]);
        if (ignore) return;
        setLeaves(leavesRes.leaves || []);
        setSummary(leavesRes.summary || null);
        setTypes(typesRes.types || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
    return () => { ignore = true; };
  }, [open, employee?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.type) return;
    const body = { type: form.type, remarks: form.remarks };
    if (mode === 'single') {
      if (!form.date) return;
      body.date = form.date;
    } else if (mode === 'range') {
      if (!range.start || !range.end) return;
      body.start = range.start; body.end = range.end;
    } else if (mode === 'multi') {
      const dates = multiDates.filter(Boolean);
      if (!dates.length) return;
      body.dates = dates;
    }

    try {
      await axios.post(`/leaves/${employee.id}`, body);
      setForm({ date: '', type: '', remarks: '' });
      setRange({ start: '', end: '' });
      setMultiDates(['']);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: 'success', message: 'Leaves added' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to add leaves' });
    }
  };

  const update = async (leaveId, patch) => {
    try {
      await axios.put(`/leaves/${leaveId}`, patch);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: 'success', message: 'Leave updated' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to update leave' });
    }
  };

  const updateStatus = async (leaveId, status) => {
    try {
      await axios.patch(`/leaves/${leaveId}/status`, { status });
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: 'success', message: 'Leave status updated' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to update status' });
    }
  };

  const remove = async (leaveId) => {
    try {
      await axios.delete(`/leaves/${leaveId}`);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: 'success', message: 'Leave deleted' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to delete leave' });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">Manage Leaves - {employee.full_name}</h2>
          <button onClick={onClose} className="btn btn-outline btn-sm text-xs">Close</button>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="p-4 space-y-6">
            {summary && (
              <div className="card-soft p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-700">Current Leave Bank: {summary.title || `#${summary.bankId}`} ({String(summary.period_start).slice(0,10)} to {String(summary.period_end).slice(0,10)})</div>
                <div className="grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-3">
                  {(summary.items || []).map(it => (
                    <div key={it.typeId} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">{it.typeName}</div>
                      <div className="flex flex-col gap-0.5 text-[10px] text-gray-600">
                        <span>Allocated: {it.allocated}</span>
                        <span className="text-green-700">Approved: {it.approvedUsed}</span>
                        <span className="text-amber-700">Pending: {it.pending}</span>
                        <span className="text-blue-700 font-medium">Available: {it.available}</span>
                      </div>
                    </div>
                  ))}
                  {!summary.items?.length && <div className="text-xs text-gray-500">No types configured</div>}
                </div>
              </div>
            )}

            <form className="card-soft p-4 space-y-4" onSubmit={submit}>
              <div className="filter-panel compact">
                <div>
                  <label className="form-label text-[11px] mb-1">Type</label>
                  <select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f, type: e.target.value}))}>
                    <option value="">Select type</option>
                    {types.map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label text-[11px] mb-1">Remarks</label>
                  <input className="form-input" placeholder="Optional" value={form.remarks} onChange={e=>setForm(f=>({...f, remarks: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">Mode</label>
                  <select className="form-input" value={mode} onChange={e=>setMode(e.target.value)}>
                    <option value="single">Single Date</option>
                    <option value="range">Date Range</option>
                    <option value="multi">Multiple Dates</option>
                  </select>
                </div>
              </div>

              {mode === 'single' && (
                <div>
                  <label className="form-label text-[11px] mb-1">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e=>setForm(f=>({...f, date: e.target.value}))} />
                </div>
              )}

              {mode === 'range' && (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="form-label text-[11px] mb-1">Start</label>
                    <input type="date" className="form-input" value={range.start} onChange={e=>setRange(r=>({...r, start: e.target.value}))} />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="form-label text-[11px] mb-1">End</label>
                    <input type="date" className="form-input" value={range.end} onChange={e=>setRange(r=>({...r, end: e.target.value}))} />
                  </div>
                </div>
              )}

              {mode === 'multi' && (
                <div className="space-y-2">
                  <label className="form-label text-[11px] mb-1">Dates</label>
                  {multiDates.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="date" className="form-input !py-1 !px-2" value={d} onChange={e=>setMultiDates(arr=>{ const c=[...arr]; c[idx]=e.target.value; return c; })} />
                      <button type="button" className="btn btn-error-soft text-[11px]" onClick={()=>setMultiDates(arr=>arr.filter((_,i)=>i!==idx))}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline text-[11px]" onClick={()=>setMultiDates(arr=>[...arr, ''])}>Add another date</button>
                </div>
              )}

              <div>
                <button type="submit" className="btn btn-success text-xs">Save</button>
              </div>
            </form>

            <div className="card-soft p-0 overflow-hidden">
              <div className="table-shell overflow-auto max-h-[55vh] custom-thin-scroll">
                <table className="table-enhanced">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Remarks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l.id}>
                        <td><input type="date" className="form-input !py-1 !px-2" value={l.date?.slice(0,10)} onChange={e=>update(l.id, { date: e.target.value })} /></td>
                        <td>
                          <select className="form-input !py-1 !px-2" value={l.type} onChange={e=>update(l.id, { type: e.target.value })}>
                            {types.map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
                            {!types.length && <option value={l.type}>{l.type}</option>}
                          </select>
                        </td>
                        <td>
                          {canStatus ? (
                            <select className="form-input !py-1 !px-2" value={l.status} onChange={e=>updateStatus(l.id, e.target.value)}>
                              <option value="PENDING">PENDING</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          ) : (
                            <span className="badge badge-gray">{l.status}</span>
                          )}
                        </td>
                        <td><input className="form-input !py-1 !px-2" value={l.remarks || ''} onChange={e=>update(l.id, { remarks: e.target.value })} /></td>
                        <td><button className="btn btn-error-soft text-[11px]" onClick={()=>remove(l.id)}>Delete</button></td>
                      </tr>
                    ))}
                    {!leaves.length && <tr><td colSpan={5} className="text-center py-6 text-xs text-gray-500">No leaves</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main page reskin
const LeaveManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [cnicFilter, setCnicFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/leaves/employees', { params: { search } });
      setEmployees(data.employees || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const norm = (s) => (s || '').toString().toLowerCase();
    const normDigits = (s) => (s || '').toString().replace(/\D/g, '');
    const cnicTerm = normDigits(cnicFilter);
    return employees.filter(emp => {
      if (!cnicTerm) return true;
      const empCnicDigits = normDigits(emp.cnic);
      return empCnicDigits.includes(cnicTerm);
    });
  }, [employees, cnicFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Leave Management</h1>
        <div className="actions-inline">
          <button className="btn btn-outline text-xs" onClick={() => navigate('/attendance/leave-bank')}>Leave Bank</button>
          <input className="form-input !py-1 !px-2 text-xs w-48" placeholder="Search employees" value={search} onChange={e=>setSearch(e.target.value)} />
          <input className="form-input !py-1 !px-2 text-xs w-40" placeholder="Filter CNIC" value={cnicFilter} onChange={e=>setCnicFilter(e.target.value)} />
          <button className="btn btn-secondary text-xs" onClick={load}>Search</button>
        </div>
      </div>
      {loading ? (
        <div className="py-20 flex items-center justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="table-shell card-soft p-0 overflow-auto custom-thin-scroll">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>CNIC</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Current Leave Bank</th>
                <th>Recent Leaves</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.employee_id || '-'}</td>
                  <td>{emp.cnic || '-'}</td>
                  <td className="text-left">{emp.full_name}</td>
                  <td className="text-left">{emp.employmentRecords?.[0]?.designation?.title || '-'}</td>
                  <td className="text-left">
                    {emp.currentLeaveBankSummary ? (
                      <div className="space-y-1 text-[10px]">
                        <div className="font-semibold text-gray-700">{emp.currentLeaveBankSummary.title || `#${emp.currentLeaveBankSummary.bankId}`}</div>
                        <div className="text-gray-500">{String(emp.currentLeaveBankSummary.period_start).slice(0,10)} to {String(emp.currentLeaveBankSummary.period_end).slice(0,10)}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(emp.currentLeaveBankSummary.items || []).map(it => (
                            <span key={it.typeId} className="badge badge-blue">{it.typeName}: {it.approvedUsed}/{it.allocated}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-500">No active leave bank</span>
                    )}
                  </td>
                  <td>
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1 custom-thin-scroll text-[10px]">
                      {(emp.leaves || []).map(l => (
                        <div key={l.id} className="text-gray-700">{l.date?.slice(0,10)} - {l.type} ({l.status})</div>
                      ))}
                      {!emp.leaves?.length && <span className="text-gray-400">No leaves</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-secondary text-[11px]" onClick={()=>setSelected(emp)}>Manage</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="text-center py-6 text-xs text-gray-500">No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <LeaveDialog open={!!selected} employee={selected} onClose={() => { setSelected(null); load(); }} />
    </div>
  );
};

export default LeaveManagement;
