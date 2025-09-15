import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { attendanceService } from '../services/attendanceService';
import { useAuthStore } from '../../auth/authStore';

const AttendanceLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToastContext();
  const can = useAuthStore(s=>s.can);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const list = await attendanceService.listLocations();
      setLocations(list);
    } catch (e) {
      showError(e?.response?.data?.error || e.message || 'Failed to load locations');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading locations..." /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Attendance by Location</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Select a location to view attendance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Optional actions can be added here later */}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map(loc => (
              <tr key={loc.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loc.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loc.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(loc.district && loc.district.name) || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(loc.city && loc.city.name) || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button className="btn btn-primary" onClick={()=>navigate(`/attendance/locations/${loc.id}`)}>View Attendance</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length===0 && <div className="text-center py-10 text-gray-500">No locations found.</div>}
      </div>
    </div>
  );
};

export default AttendanceLocations;
