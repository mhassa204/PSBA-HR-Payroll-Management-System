import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';

const LeaveTypesDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });

  const load = async () => {
    try { setLoading(true); const { data } = await axios.get('/leave-banks/types'); setTypes(data.types || []); }
    catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open]);

  const add = async (e) => { e.preventDefault(); if (!form.name) return; try { await axios.post('/leave-banks/types', form); setForm({ name: '', code: '' }); await load(); toastBus.emit({ type: 'success', message: 'Leave type added' }); } catch(e){ toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' }); } };
  const update = async (id, patch) => { try { await axios.put(`/leave-banks/types/${id}`, patch); await load(); } catch(e){ toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' }); } };
  const remove = async (id) => { try { await axios.delete(`/leave-banks/types/${id}`); await load(); } catch(e){ toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' }); } };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">Leave Types</h2>
          <button onClick={onClose} className="btn btn-outline text-xs">Close</button>
        </div>
        <div className="p-4 space-y-4">
          <form className="flex flex-wrap gap-2" onSubmit={add}>
            <input className="form-input !w-48 !py-1 !px-2 text-xs" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} />
            <input className="form-input !w-40 !py-1 !px-2 text-xs" placeholder="Code (optional)" value={form.code} onChange={e=>setForm(f=>({...f, code: e.target.value}))} />
            <button className="btn btn-success text-xs">Add</button>
          </form>
          {loading ? <div className="py-10 flex items-center justify-center"><LoadingSpinner /></div> : (
            <div className="table-shell border rounded overflow-hidden">
              <div className="overflow-auto max-h-[55vh] custom-thin-scroll">
                <table className="table-enhanced">
                  <thead><tr><th>Name</th><th>Code</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {types.map(t => (
                      <tr key={t.id}>
                        <td><input className="form-input !py-1 !px-2 text-xs" value={t.name} onChange={e=>update(t.id, { name: e.target.value })} /></td>
                        <td><input className="form-input !py-1 !px-2 text-xs" value={t.code || ''} onChange={e=>update(t.id, { code: e.target.value })} /></td>
                        <td>
                          <select className="form-input !py-1 !px-2 text-xs" value={t.is_active ? '1':'0'} onChange={e=>update(t.id, { is_active: e.target.value==='1' })}>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                          </select>
                        </td>
                        <td><button className="btn btn-error-soft text-[11px]" onClick={()=>remove(t.id)}>Delete</button></td>
                      </tr>
                    ))}
                    {!types.length && <tr><td colSpan={4} className="text-center py-6 text-xs text-gray-500">No leave types</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditAllocationsDialog = ({ open, onClose, bank }) => {
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: t }, { data: a }] = await Promise.all([
        axios.get('/leave-banks/types'),
        axios.get(`/leave-banks/${bank.id}/allocations`, { params: { search } })
      ]);
      setTypes(t.types || []);
      setEmployees(a.employees || []);
      setAllocs(a.allocations || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { if (open && bank?.id) load(); }, [open, bank?.id]);

  const getEmpAlloc = (empId, typeId) => allocs.find(x => x.employee_id === empId && x.leave_type_id === typeId)?.days || 0;
  const setEmpAlloc = (empId, typeId, days) => {
    setAllocs(prev => {
      const idx = prev.findIndex(x => x.employee_id === empId && x.leave_type_id === typeId);
      const next = [...prev];
      if (idx >= 0) next[idx] = { ...next[idx], days };
      else next.push({ leave_bank_id: bank.id, employee_id: empId, leave_type_id: typeId, days });
      return next;
    });
  };

  const save = async () => {
    try {
      const items = allocs.map(a => ({ employee_id: a.employee_id, leave_type_id: a.leave_type_id, days: Number(a.days||0) }));
      await axios.post(`/leave-banks/${bank.id}/allocations`, { items });
      toastBus.emit({ type: 'success', message: 'Allocations saved' });
      onClose();
    } catch(e){ toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' }); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-2 md:p-4">
      <div className="modal-surface w-full max-w-6xl max-h-[92vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">Edit Leave Allocations - {bank.title || '#'+bank.id}</h2>
          <button onClick={onClose} className="btn btn-outline text-xs">Close</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input className="form-input !w-64 !py-1 !px-2 text-xs" placeholder="Search by CNIC/Name/Emp ID" value={search} onChange={e=>setSearch(e.target.value)} />
            <button className="btn btn-secondary text-xs" onClick={load}>Search</button>
          </div>
          {loading ? <div className="py-10 flex items-center justify-center"><LoadingSpinner /></div> : (
            <div className="table-shell border rounded overflow-hidden">
              <div className="overflow-auto max-h-[55vh] custom-thin-scroll">
                <table className="table-enhanced">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      {types.map(t => (<th key={t.id}>{t.name}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td className="whitespace-nowrap text-xs">{emp.full_name} ({emp.employee_id || '-'}) - {emp.cnic || '-'}</td>
                        {types.map(t => (
                          <td key={t.id}><input type="number" min={0} className="form-input !py-1 !px-2 w-24 text-xs" value={getEmpAlloc(emp.id, t.id)} onChange={e=>setEmpAlloc(emp.id, t.id, e.target.value)} /></td>
                        ))}
                      </tr>
                    ))}
                    {!employees.length && <tr><td colSpan={1+types.length} className="text-center text-xs text-gray-500 py-6">No employees</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div>
            <button className="btn btn-success text-xs" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditBankDialog = ({ open, onClose, bank }) => {
  const [form, setForm] = useState({ title: '', start: '', end: '' });
  const [types, setTypes] = useState([]);
  const [defaults, setDefaults] = useState({}); // typeId -> days

  const load = async () => {
    try {
      const [{ data: t }, { data: d }] = await Promise.all([
        axios.get('/leave-banks/types'),
        axios.get(`/leave-banks/${bank.id}/defaults`)
      ]);
      setTypes(t.types || []);
      const map = {};
      (d.defaults || []).forEach(it => { map[it.leave_type_id] = it.days; });
      setDefaults(map);
    } catch {}
  };

  useEffect(() => {
    if (open && bank) {
      setForm({ title: bank.title || '', start: (bank.period_start || '').slice(0,10), end: (bank.period_end || '').slice(0,10) });
      load();
    }
  }, [open, bank]);

  const save = async () => {
    try {
      await axios.put(`/leave-banks/${bank.id}`, { title: form.title, period_start: form.start, period_end: form.end });
      const items = Object.entries(defaults).map(([leave_type_id, days]) => ({ leave_type_id: Number(leave_type_id), days: Number(days || 0) }));
      if (items.length) await axios.post(`/leave-banks/${bank.id}/defaults`, { items });
      toastBus.emit({ type: 'success', message: 'Leave bank updated' });
      onClose();
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-fade z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">Edit Leave Bank</h2>
          <button onClick={onClose} className="btn btn-outline text-xs">Close</button>
        </div>
        <div className="p-4 space-y-5">
          <div className="space-y-3">
            <div>
              <label className="form-label text-[11px] mb-1">Title</label>
              <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px]">
                <label className="form-label text-[11px] mb-1">From</label>
                <input type="date" className="form-input" value={form.start} onChange={e=>setForm(f=>({...f, start: e.target.value}))} />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="form-label text-[11px] mb-1">To</label>
                <input type="date" className="form-input" value={form.end} onChange={e=>setForm(f=>({...f, end: e.target.value}))} />
              </div>
            </div>
            <div className="card-soft p-4 space-y-3">
              <div className="text-xs font-semibold text-gray-600">Default days per leave type</div>
              <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
                {types.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <label className="w-40 text-[11px] text-gray-700">{t.name}</label>
                    <input type="number" min={0} className="form-input !py-1 !px-2 w-24 text-xs" value={defaults[t.id] ?? ''} onChange={e=>setDefaults(prev=>({ ...prev, [t.id]: e.target.value }))} />
                  </div>
                ))}
                {!types.length && <div className="text-xs text-gray-500">No leave types</div>}
              </div>
            </div>
          </div>
          <div>
            <button className="btn btn-success text-xs" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaveBankPage = () => {
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [types, setTypes] = useState([]);
  const [showTypes, setShowTypes] = useState(false);
  const [showAlloc, setShowAlloc] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeBank, setActiveBank] = useState(null);
  const [createForm, setCreateForm] = useState({ title: '', start: '', end: '' });
  const [defaultDays, setDefaultDays] = useState({}); // { typeId: days }

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: b }, { data: t }] = await Promise.all([
        axios.get('/leave-banks'),
        axios.get('/leave-banks/types')
      ]);
      setBanks(b.banks || []);
      setTypes(t.types || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleDefault = (typeId, days) => setDefaultDays(prev => ({ ...prev, [typeId]: days }));

  const createBank = async () => {
    try {
      if (!createForm.start || !createForm.end) return;
      const defaults = Object.entries(defaultDays).map(([leave_type_id, days]) => ({ leave_type_id, days: Number(days||0) }));
      const { data } = await axios.post('/leave-banks', { title: createForm.title, period_start: createForm.start, period_end: createForm.end, defaults });
      toastBus.emit({ type: 'success', message: 'Leave bank created' });
      setCreateForm({ title: '', start: '', end: '' });
      setDefaultDays({});
      await load();
    } catch(e){ toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' }); }
  };

  const deleteBank = async (id) => {
    if (!window.confirm('Delete this leave bank? This will hide it from lists.')) return;
    try {
      await axios.delete(`/leave-banks/${id}`);
      toastBus.emit({ type: 'success', message: 'Leave bank deleted' });
      await load();
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Leave Bank</h1>
        <div className="actions-inline">
          <button className="btn btn-outline text-xs" onClick={() => setShowTypes(true)}>Leave Types</button>
        </div>
      </div>

      <div className="card-soft p-5 space-y-5">
        <h2 className="section-header">Create Leave Bank</h2>
        <div className="flex flex-wrap items-end gap-4">
          <input className="form-input !w-56 !py-1 !px-2 text-xs" placeholder="Title (optional)" value={createForm.title} onChange={e=>setCreateForm(f=>({...f, title: e.target.value}))} />
          <div>
            <label className="form-label text-[11px] mb-1">From</label>
            <input type="date" className="form-input !py-1 !px-2 text-xs" value={createForm.start} onChange={e=>setCreateForm(f=>({...f, start: e.target.value}))} />
          </div>
          <div>
            <label className="form-label text-[11px] mb-1">To</label>
            <input type="date" className="form-input !py-1 !px-2 text-xs" value={createForm.end} onChange={e=>setCreateForm(f=>({...f, end: e.target.value}))} />
          </div>
        </div>
        <div className="card-soft p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-600">Default days per leave type</div>
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
            {types.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <label className="w-40 text-[11px] text-gray-700">{t.name}</label>
                <input type="number" min={0} className="form-input !py-1 !px-2 w-24 text-xs" value={defaultDays[t.id] || ''} onChange={e=>toggleDefault(t.id, e.target.value)} />
              </div>
            ))}
            {!types.length && <div className="text-xs text-gray-500">No leave types. Add some using the button above.</div>}
          </div>
          <div>
            <button className="btn btn-success text-xs" onClick={createBank}>Create Leave Bank</button>
          </div>
        </div>
      </div>

      <div className="table-shell card-soft p-0 overflow-auto custom-thin-scroll">
        <table className="table-enhanced">
          <thead>
            <tr>
              <th>Title</th>
              <th>Period</th>
              <th>Defaults</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {banks.map(b => (
              <tr key={b.id}>
                <td className="px-3 py-2 text-sm">{b.title || '-'}</td>
                <td className="px-3 py-2 text-sm">{b.period_start?.slice(0,10)} to {b.period_end?.slice(0,10)}</td>
                <td className="px-3 py-2 text-sm text-left">
                  {(b.defaults || []).map(d => (
                    <div key={d.id} className="text-[10px] text-gray-700">{d.leaveType?.name}: {d.days}</div>
                  ))}
                  {!b.defaults?.length && <span className="text-[10px] text-gray-500">No defaults</span>}
                </td>
                <td className="space-x-1">
                  <button className="btn btn-secondary text-[11px]" onClick={() => { setActiveBank(b); setShowAlloc(true); }}>Allocations</button>
                  <button className="btn btn-outline text-[11px]" onClick={() => { setActiveBank(b); setShowEdit(true); }}>Edit</button>
                  <button className="btn btn-error-soft text-[11px]" onClick={() => deleteBank(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!banks.length && <tr><td colSpan={4} className="text-center py-6 text-xs text-gray-500">No leave banks</td></tr>}
          </tbody>
        </table>
      </div>

      <LeaveTypesDialog open={showTypes} onClose={() => { setShowTypes(false); load(); }} />
      {activeBank && <EditAllocationsDialog open={showAlloc} onClose={() => { setShowAlloc(false); setActiveBank(null); load(); }} bank={activeBank} />}
      {activeBank && <EditBankDialog open={showEdit} onClose={() => { setShowEdit(false); setActiveBank(null); load(); }} bank={activeBank} />}
    </div>
  );
};

export default LeaveBankPage;
