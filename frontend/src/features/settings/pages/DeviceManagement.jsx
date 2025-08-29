import React, { useEffect, useMemo, useState } from 'react';
import { deviceService } from '../services/deviceService';
import locationService from '../services/locationService';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/authStore';

const DeviceForm = ({ initial, onSubmit, onCancel, isSubmitting }) => {
  const [form, setForm] = useState({ ip_address: '', port_number: 4370, location_id: '' });
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const { showError } = useToastContext();

  useEffect(() => {
    if (initial) {
      setForm({
        ip_address: initial.ip_address || '',
        port_number: initial.port_number || 4370,
        location_id: initial.location?.id || ''
      });
    }
  }, [initial]);

  useEffect(() => {
    const load = async () => {
      setLoadingLocs(true);
      try {
        const res = await locationService.getAllLocations();
        const options = (res.locations || []).map((l) => ({ value: l.id, label: `${l.name}${l.city ? ' — ' + l.city : ''}` }));
        setLocations(options);
      } catch (e) {
        console.error('Failed to load locations', e);
        showError('Failed to load locations');
      } finally {
        setLoadingLocs(false);
      }
    };
    load();
  }, []);

  const onSubmitForm = (e) => {
    e.preventDefault();
    if (!form.ip_address.trim()) return showError('IP address is required');
    if (!form.port_number) return showError('Port is required');
    const payload = {
      ip_address: form.ip_address.trim(),
      port_number: Number(form.port_number),
      location_id: form.location_id ? Number(form.location_id) : null
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={onSubmitForm} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label required mb-1 block">IP Address</label>
          <input className="form-input w-full" value={form.ip_address} onChange={(e)=>setForm((p)=>({ ...p, ip_address: e.target.value }))} placeholder="e.g. 192.168.1.201" />
        </div>
        <div>
          <label className="form-label required mb-1 block">Port</label>
          <input type="number" className="form-input w-full" value={form.port_number} onChange={(e)=>setForm((p)=>({ ...p, port_number: e.target.value }))} placeholder="4370" />
        </div>
        <div className="md:col-span-2">
          <label className="form-label mb-1 block">Location</label>
          <div className="mt-1">
            <SearchableSelect
              options={locations}
              value={form.location_id}
              onChange={(v)=>setForm((p)=>({ ...p, location_id: v }))}
              placeholder={loadingLocs ? 'Loading locations...' : 'Select a location (optional)'}
              required={false}
              name="location_id"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Locations are fetched from the Locations table. A location can be assigned to multiple devices.</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (initial ? 'Update Device' : 'Create Device')}</button>
      </div>
    </form>
  );
};

const DeviceManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToastContext();
  const { showConfirmation } = useConfirmationContext();
  const navigate = useNavigate();
  const can = useAuthStore((s)=>s.can);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await deviceService.list();
      setItems(res);
    } catch (e) {
      console.error('Failed to fetch devices', e);
      showError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onCreate = async (payload) => {
    try {
      setSubmitting(true);
      await deviceService.create(payload);
      showSuccess('Device created successfully');
      setShowForm(false);
      setEditing(null);
      fetchData();
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to create device');
    } finally { setSubmitting(false); }
  };

  const onUpdate = async (payload) => {
    try {
      setSubmitting(true);
      await deviceService.update(editing.id, payload);
      showSuccess('Device updated successfully');
      setShowForm(false);
      setEditing(null);
      fetchData();
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to update device');
    } finally { setSubmitting(false); }
  };

  const onDelete = (item) => {
    showConfirmation({
      title: 'Delete Device',
      message: `Are you sure you want to delete ${item.ip_address}:${item.port_number}?`,
      onConfirm: async () => {
        try { await deviceService.remove(item.id); showSuccess('Device deleted'); fetchData(); }
        catch (e) { showError(e?.response?.data?.error || e.message || 'Failed to delete device'); }
      }
    });
  };

  const handleSubmit = (payload) => { if (editing) onUpdate(payload); else onCreate(payload); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading devices..." /></div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Device Management</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Manage attendance devices (IP/Port) and assign to Locations</p>
            </div>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Add Device
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Devices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.ip_address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.port_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.location?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => { setEditing(d); setShowForm(true); }} className="text-blue-600 hover:text-blue-900">Edit</button>
                        <button onClick={() => onDelete(d)} className="text-red-600 hover:text-red-900">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="text-center py-12"><p className="text-gray-500">No devices found. Create your first device.</p></div>
            )}
          </div>
        </div>
      </div>

      <EnhancedModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Device' : 'Add New Device'} size="sm">
        <div className="p-6">
          <DeviceForm initial={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isSubmitting={submitting} />
        </div>
      </EnhancedModal>
    </div>
  );
};

export default DeviceManagement;
