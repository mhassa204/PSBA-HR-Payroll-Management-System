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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow w-full max-w-2xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Leave Types</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
        <form className="flex gap-2 mb-4" onSubmit={add}>
          <input className="border rounded px-2 py-1" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} />
          <input className="border rounded px-2 py-1" placeholder="Code (optional)" value={form.code} onChange={e=>setForm(f=>({...f, code: e.target.value}))} />
          <button className="px-3 py-1 border rounded">Add</button>
        </form>
        {loading ? <div className="py-10 flex items-center justify-center"><LoadingSpinner /></div> : (
          <div className="border rounded overflow-auto max-h-[60vh]">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600 sticky top-0">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2"><input className="border rounded px-2 py-1" value={t.name} onChange={e=>update(t.id, { name: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className="border rounded px-2 py-1" value={t.code || ''} onChange={e=>update(t.id, { code: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <select className="border rounded px-2 py-1" value={t.is_active ? '1':'0'} onChange={e=>update(t.id, { is_active: e.target.value==='1' })}>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </td>
                    <td className="px-3 py-2"><button className="px-2 py-1 border rounded text-red-600" onClick={()=>remove(t.id)}>Delete</button></td>
                  </tr>
                ))}
                {!types.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">No leave types</td></tr>}
              </tbody>
            </table>
          </div>
        )}
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow w-full max-w-6xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Edit Leave Allocations - {bank.title || '#'+bank.id}</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
        <div className="flex gap-2 mb-3">
          <input className="border rounded px-2 py-1" placeholder="Search by CNIC/Name/Emp ID" value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="px-3 py-1 border rounded" onClick={load}>Search</button>
        </div>
        {loading ? <div className="py-10 flex items-center justify-center"><LoadingSpinner /></div> : (
          <div className="overflow-auto border rounded">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600 sticky top-0">
                  <th className="px-3 py-2 text-left">Employee</th>
                  {types.map(t => (<th key={t.id} className="px-3 py-2 text-left">{t.name}</th>))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-t">
                    <td className="px-3 py-2 text-sm">{emp.full_name} ({emp.employee_id || '-'}) - {emp.cnic || '-'}</td>
                    {types.map(t => (
                      <td key={t.id} className="px-3 py-2">
                        <input type="number" min={0} className="border rounded px-2 py-1 w-24" value={getEmpAlloc(emp.id, t.id)} onChange={e=>setEmpAlloc(emp.id, t.id, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!employees.length && <tr><td colSpan={1 + types.length} className="px-3 py-6 text-center text-sm text-gray-500">No employees</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <button className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={save}>Save</button>
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow w-full max-w-3xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Edit Leave Bank</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600">Title</label>
            <input className="border rounded px-2 py-1 w-full" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600">From</label>
              <input type="date" className="border rounded px-2 py-1 w-full" value={form.start} onChange={e=>setForm(f=>({...f, start: e.target.value}))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600">To</label>
              <input type="date" className="border rounded px-2 py-1 w-full" value={form.end} onChange={e=>setForm(f=>({...f, end: e.target.value}))} />
            </div>
          </div>

          <div className="mt-4 border rounded p-3">
            <div className="font-medium mb-2">Default days per leave type</div>
            <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
              {types.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <label className="w-40 text-sm">{t.name}</label>
                  <input type="number" min={0} className="border rounded px-2 py-1 w-28" value={defaults[t.id] ?? ''} onChange={e=>setDefaults(prev=>({ ...prev, [t.id]: e.target.value }))} />
                </div>
              ))}
              {!types.length && <div className="text-sm text-gray-500">No leave types</div>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={save}>Save</button>
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Leave Bank</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={() => setShowTypes(true)}>Leave Types</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Create Leave Bank</h2>
        <div className="flex flex-wrap items-end gap-3">
          <input className="border rounded px-2 py-1" placeholder="Title (optional)" value={createForm.title} onChange={e=>setCreateForm(f=>({...f, title: e.target.value}))} />
          <div>
            <label className="block text-xs text-gray-600">From</label>
            <input type="date" className="border rounded px-2 py-1" value={createForm.start} onChange={e=>setCreateForm(f=>({...f, start: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">To</label>
            <input type="date" className="border rounded px-2 py-1" value={createForm.end} onChange={e=>setCreateForm(f=>({...f, end: e.target.value}))} />
          </div>
        </div>
        <div className="mt-4 border rounded p-3">
          <div className="font-medium mb-2">Default days per leave type</div>
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
            {types.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <label className="w-40 text-sm">{t.name}</label>
                <input type="number" min={0} className="border rounded px-2 py-1 w-28" value={defaultDays[t.id] || ''} onChange={e=>toggleDefault(t.id, e.target.value)} />
              </div>
            ))}
            {!types.length && <div className="text-sm text-gray-500">No leave types. Add some using the button above.</div>}
          </div>
          <div className="mt-3">
            <button className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={createBank}>Create Leave Bank</button>
          </div>
        </div>
      </div>

      <div className="overflow-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Period</th>
              <th className="px-3 py-2 text-left">Defaults</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banks.map(b => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2 text-sm">{b.title || '-'}</td>
                <td className="px-3 py-2 text-sm">{b.period_start?.slice(0,10)} to {b.period_end?.slice(0,10)}</td>
                <td className="px-3 py-2 text-sm">
                  {(b.defaults || []).map(d => (
                    <div key={d.id} className="text-xs text-gray-700">{d.leaveType?.name}: {d.days}</div>
                  ))}
                  {!b.defaults?.length && <span className="text-xs text-gray-500">No defaults</span>}
                </td>
                <td className="px-3 py-2 text-sm space-x-2">
                  <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => { setActiveBank(b); setShowAlloc(true); }}>Edit Allocations</button>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => { setActiveBank(b); setShowEdit(true); }}>Edit</button>
                  <button className="px-3 py-1 border rounded text-red-600 hover:bg-red-50" onClick={() => deleteBank(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!banks.length && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">No leave banks</td></tr>
            )}
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
