import React, { useEffect, useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { useAuthStore } from '../../auth/authStore';
import AssignDeviceUserDialog from '../components/AssignDeviceUserDialog';
import { Link, useNavigate } from 'react-router-dom';

const AttendanceDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const { showError, showSuccess } = useToastContext();
  const can = useAuthStore(s=>s.can);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const list = await attendanceService.listDevices();
      setDevices(list);
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to load devices');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const fetchForDevice = async (id) => {
    try {
      setFetchingId(id);
      const res = await attendanceService.fetchForDevice(id);
      showSuccess(`Fetched ${res.fetched || 0}, saved ${res.saved || 0}`);
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to fetch attendance');
    } finally { setFetchingId(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading..." /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Attendance</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Choose what to manage</p>
        </div>
        <div className="flex items-center gap-3">
          {can('attendance.read') && (
            <button onClick={()=>setAssignOpen(true)} className="btn btn-secondary">Assign Device User IDs</button>
          )}
          {can('attendance.fetch') && (
            <button onClick={async()=>{ const res = await attendanceService.fetchAll().catch(()=>null); if(res) showSuccess(`Fetched ${res.totalFetched}, saved ${res.totalSaved}`)}} className="btn btn-primary">Fetch All</button>
          )}
        </div>
      </div>

      {/* Cards to navigate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Attendance by Location</h2>
            <p className="text-sm text-gray-600">View attendance grouped by each location and drill into details.</p>
          </div>
          <div className="mt-4">
            <Link to="/attendance/locations" className="btn btn-primary">Open Locations</Link>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Devices</h2>
            <p className="text-sm text-gray-600">Manage devices and pull check-ins/outs.</p>
          </div>
          <div className="mt-4">
            <Link to="/attendance/devices" className="btn btn-secondary">Open Devices</Link>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Leave Management</h2>
            <p className="text-sm text-gray-600">Manage employee leaves.</p>
          </div>
          <div className="mt-4">
            <Link to="/attendance/leaves" className="btn btn-tertiary">Open Leave Management</Link>
          </div>
        </div>
      </div>

      {/* Keep a compact devices table preview here for quick actions (optional) */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold">Recent Devices</h3>
          <Link to="/attendance/devices" className="text-blue-600 hover:underline text-sm">View all</Link>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {devices.map(d => (
              <tr key={d.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.ip_address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.port_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.location?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button disabled={!can('attendance.fetch') || fetchingId===d.id} onClick={()=>fetchForDevice(d.id)} className="btn btn-secondary">
                    {fetchingId===d.id ? 'Fetching...' : 'Fetch & Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {devices.length===0 && <div className="text-center py-6 text-gray-500">No devices found.</div>}
      </div>

      <AssignDeviceUserDialog open={assignOpen} onClose={()=>setAssignOpen(false)} />
    </div>
  );
};

export default AttendanceDashboard;
