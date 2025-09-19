import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';

const ApplyDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ date: '', type: '', remarks: '' });
  const [mode, setMode] = useState('single');
  const [range, setRange] = useState({ start: '', end: '' });
  const [multiDates, setMultiDates] = useState(['']);

  useEffect(() => {
    if (!open || !employee) return;
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: leavesRes }, { data: typesRes }] = await Promise.all([
          axios.get(`/leaves/${employee.id}`),
          axios.get('/leave-banks/types')
        ]);
        if (ignore) return;
        setLeaves(leavesRes.leaves || []);
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
      if (!form.date) return; body.date = form.date;
    } else if (mode === 'range') {
      if (!range.start || !range.end) return; body.start = range.start; body.end = range.end;
    } else if (mode === 'multi') {
      const dates = multiDates.filter(Boolean); if (!dates.length) return; body.dates = dates;
    }

    try {
      await axios.post(`/leaves/${employee.id}`, body);
      setForm({ date: '', type: '', remarks: '' });
      setRange({ start: '', end: '' });
      setMultiDates(['']);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      toastBus.emit({ type: 'success', message: 'Leave(s) applied' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to apply leave' });
    }
  };

  const onDelete = async (leaveId) => {
    try {
      if (!window.confirm('Delete this pending leave?')) return;
      await axios.delete(`/leaves/${leaveId}`);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      toastBus.emit({ type: 'success', message: 'Leave deleted' });
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Delete failed' });
    }
  };

  return !open ? null : (
    <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">Apply Leave - {employee.full_name}</h2>
          <button onClick={onClose} className="btn btn-outline btn-sm text-xs">Close</button>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="p-4 space-y-6">
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
                <button type="submit" className="btn btn-success text-xs">Apply</button>
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l.id}>
                        <td>{l.date?.slice(0,10)}</td>
                        <td>{l.type}</td>
                        <td><span className="badge badge-gray">{l.status}</span></td>
                        <td>{l.remarks || '-'}</td>
                        <td className="text-right">
                          {l.status === 'PENDING' && (
                            <button className="btn btn-error-soft text-[11px]" onClick={()=>onDelete(l.id)}>Delete</button>
                          )}
                        </td>
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

const LeaveApply = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/leaves/apply/employees', { params: { search } });
      setEmployees(data.employees || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Apply Leave</h1>
        <div className="actions-inline">
          <input className="form-input !py-1 !px-2 text-xs w-48" placeholder="Search employees" value={search} onChange={e=>setSearch(e.target.value)} />
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
                <th>Recent Leaves</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.employee_id || '-'}</td>
                  <td>{emp.cnic || '-'}</td>
                  <td className="text-left">{emp.full_name}</td>
                  <td className="text-left">{emp.employmentRecords?.[0]?.designation?.title || '-'}</td>
                  <td>
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1 custom-thin-scroll text-[10px]">
                      {(emp.leaves || []).map(l => (
                        <div key={l.id} className="text-gray-700">{l.date?.slice(0,10)} - {l.type} ({l.status})</div>
                      ))}
                      {!emp.leaves?.length && <span className="text-gray-400">No leaves</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-secondary text-[11px]" onClick={()=>setSelected(emp)}>Apply</button>
                  </td>
                </tr>
              ))}
              {!employees.length && <tr><td colSpan={6} className="text-center py-6 text-xs text-gray-500">No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <ApplyDialog open={!!selected} employee={selected} onClose={() => { setSelected(null); load(); }} />
    </div>
  );
};

export default LeaveApply;
