import React, { useEffect, useMemo, useState } from 'react';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { attendanceService } from '../services/attendanceService';
import { useAuthStore } from '../../auth/authStore';

const Row = ({ emp, pendingValue, onChange, onSave, saving, canEdit }) => {
  const value = pendingValue ?? (emp.deviceUserId || '');
  const isNew = !emp.deviceUserId;
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">{emp.full_name}</div>
        <div className="text-xs text-gray-500 truncate">{emp.cnic ? `CNIC: ${emp.cnic}` : ''}</div>
      </div>
      <input
        className="w-36 md:w-48 lg:w-56 px-3 py-2 rounded border focus:outline-none focus:ring-2"
        style={{ borderColor: 'var(--color-border-light)' }}
        placeholder="Device User ID"
        value={value}
        onChange={(e)=>onChange(emp.id, e.target.value)}
        disabled={!canEdit}
      />
      <button
        className={`btn ${isNew ? 'btn-primary' : 'btn-secondary'}`}
        onClick={()=>onSave(emp.id, value)}
        disabled={saving || !canEdit}
        title={!canEdit ? 'You do not have permission to update' : ''}
      >
        {saving ? 'Saving...' : (isNew ? 'Save' : 'Update')}
      </button>
    </div>
  );
};

const AssignDeviceUserDialog = ({ open, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState({});
  const [savingId, setSavingId] = useState(null);
  const { showError, showSuccess } = useToastContext();
  const can = useAuthStore(s=>s.can);
  const canEdit = !!can('attendance.map');

  const load = async (q='') => {
    try {
      setLoading(true);
      const list = await attendanceService.listEmployees(q);
      setEmployees(list);
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to load employees');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if (open) load(search); }, [open]);

  const onChange = (id, value) => setPending(p=>({ ...p, [id]: value }));

  const onSave = async (id, value) => {
    try {
      setSavingId(id);
      const trimmed = (value || '').trim();
      const res = await attendanceService.setEmployeeDeviceUserId(id, trimmed || null);
      showSuccess('Saved');
      // update local state
      setEmployees(list => list.map(e => e.id===id ? { ...e, deviceUserId: res?.deviceUserId || null } : e));
      setPending(p => ({ ...p, [id]: undefined }));
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to save');
    } finally { setSavingId(null); }
  };

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.cnic || '').toLowerCase().includes(q) ||
      (e.deviceUserId || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <EnhancedModal isOpen={open} onClose={onClose} title="Assign Device User ID" size="xl" maxHeight="85vh">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border-light)' }}
            placeholder="Search by name, CNIC or device user id"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={()=>load(search)} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
          <button className="btn" onClick={()=>{ setSearch(''); load(''); }}>Reset</button>
        </div>

        {!canEdit && (
          <div className="px-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md">You have read-only access. Contact admin to get update permission.</div>
        )}

        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-light)' }}>
          <div className="grid grid-cols-1">
            <div className="bg-gray-50 px-4 py-3 text-sm text-gray-600 flex items-center justify-between">
              <span>Total: {filtered.length}</span>
              <span className="hidden md:block">Tip: leave blank and click Update to clear mapping</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
              {filtered.map(emp => (
                <Row key={emp.id}
                  emp={emp}
                  pendingValue={pending[emp.id]}
                  onChange={onChange}
                  onSave={onSave}
                  saving={savingId===emp.id}
                  canEdit={canEdit}
                />
              ))}
              {filtered.length===0 && (
                <div className="p-6 text-center text-gray-500">No employees found</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default AssignDeviceUserDialog;
