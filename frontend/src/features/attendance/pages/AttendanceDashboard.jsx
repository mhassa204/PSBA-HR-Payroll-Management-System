import React, { useEffect, useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { useAuthStore } from '../../auth/authStore';

const AttendanceDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState(null);
  const { showError, showSuccess } = useToastContext();
  const can = useAuthStore(s=>s.can);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading devices..." /></div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Attendance</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Fetch and save daily check-ins/outs from devices</p>
        </div>
        {can('attendance.fetch') && (
          <button onClick={async()=>{ const res = await attendanceService.fetchAll().catch(()=>null); if(res) showSuccess(`Fetched ${res.totalFetched}, saved ${res.totalSaved}`)}} className="btn btn-primary">Fetch All</button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
        {devices.length===0 && <div className="text-center py-10 text-gray-500">No devices found.</div>}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
