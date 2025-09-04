import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';

const LeaveDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
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
        const { data } = await axios.get(`/leaves/${employee.id}`);
        if (!ignore) setLeaves(data.leaves || []);
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
      toastBus.emit({ type: 'success', message: 'Leave deleted' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to delete leave' });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow w-full max-w-3xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Manage Leaves - {employee.full_name}</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
        {loading ? (
          <div className="py-10 flex items-center justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-4">
            <form className="flex flex-col gap-3" onSubmit={submit}>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs text-gray-600">Type</label>
                  <input type="text" className="border rounded px-2 py-1" placeholder="Sick, Casual, Maternity, etc" value={form.type} onChange={e=>setForm(f=>({...f, type: e.target.value}))} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">Remarks</label>
                  <input type="text" className="border rounded px-2 py-1 w-full" placeholder="Optional" value={form.remarks} onChange={e=>setForm(f=>({...f, remarks: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Mode</label>
                  <select className="border rounded px-2 py-1" value={mode} onChange={e=>setMode(e.target.value)}>
                    <option value="single">Single Date</option>
                    <option value="range">Date Range</option>
                    <option value="multi">Multiple Dates</option>
                  </select>
                </div>
              </div>

              {mode === 'single' && (
                <div>
                  <label className="block text-xs text-gray-600">Date</label>
                  <input type="date" className="border rounded px-2 py-1" value={form.date} onChange={e=>setForm(f=>({...f, date: e.target.value}))} />
                </div>
              )}

              {mode === 'range' && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs text-gray-600">Start</label>
                    <input type="date" className="border rounded px-2 py-1" value={range.start} onChange={e=>setRange(r=>({...r, start: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">End</label>
                    <input type="date" className="border rounded px-2 py-1" value={range.end} onChange={e=>setRange(r=>({...r, end: e.target.value}))} />
                  </div>
                </div>
              )}

              {mode === 'multi' && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-600">Dates</label>
                  {multiDates.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="date" className="border rounded px-2 py-1" value={d} onChange={e=>setMultiDates(arr=>{ const c=[...arr]; c[idx]=e.target.value; return c; })} />
                      <button type="button" className="px-2 py-1 border rounded" onClick={()=>setMultiDates(arr=>arr.filter((_,i)=>i!==idx))}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="px-2 py-1 border rounded" onClick={()=>setMultiDates(arr=>[...arr, ''])}>Add another date</button>
                </div>
              )}

              <div>
                <button type="submit" className="px-3 py-2 bg-emerald-600 text-white rounded">Save</button>
              </div>
            </form>

            <div className="border rounded max-h-[60vh] overflow-y-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-600 sticky top-0 z-10">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Remarks</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2">
                        <input type="date" className="border rounded px-2 py-1" value={l.date?.slice(0,10)} onChange={e=>update(l.id, { date: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" className="border rounded px-2 py-1" value={l.type} onChange={e=>update(l.id, { type: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        {canStatus ? (
                          <select className="border rounded px-2 py-1" value={l.status} onChange={e=>updateStatus(l.id, e.target.value)}>
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        ) : (
                          <span className="text-sm">{l.status}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" className="border rounded px-2 py-1 w-full" value={l.remarks || ''} onChange={e=>update(l.id, { remarks: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <button className="px-2 py-1 border rounded text-red-600" onClick={()=>remove(l.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!leaves.length && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">No leaves</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LeaveManagement = () => {
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Leave Management</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <input className="border rounded px-2 py-1" placeholder="Search employees" value={search} onChange={e=>setSearch(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Filter CNIC" value={cnicFilter} onChange={e=>setCnicFilter(e.target.value)} />
          <button className="px-3 py-1 border rounded" onClick={load}>Search</button>
        </div>
      </div>
      {loading ? (
        <div className="py-20 flex items-center justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-auto bg-white rounded shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Employee ID</th>
                <th className="px-3 py-2 text-left">CNIC</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Designation</th>
                <th className="px-3 py-2 text-left">Recent Leaves</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{emp.employee_id || '-'}</td>
                  <td className="px-3 py-2 text-sm">{emp.cnic || '-'}</td>
                  <td className="px-3 py-2 text-sm">{emp.full_name}</td>
                  <td className="px-3 py-2 text-sm">{emp.employmentRecords?.[0]?.designation?.title || '-'}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1">
                      {(emp.leaves || []).map(l => (
                        <div key={l.id} className="text-xs text-gray-700">{l.date?.slice(0,10)} - {l.type} ({l.status})</div>
                      ))}
                      {!emp.leaves?.length && <span className="text-xs text-gray-500">No leaves</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={()=>setSelected(emp)}>Manage</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ensure list refreshes after closing dialog */}
      <LeaveDialog open={!!selected} employee={selected} onClose={() => { setSelected(null); load(); }} />
    </div>
  );
};

export default LeaveManagement;
