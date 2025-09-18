import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

const AttendanceLocationDetailHome = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  const base = `/attendance/locations/${id}`;
  const q = (start || end) ? `?${new URLSearchParams({ ...(start?{start}:{}) , ...(end?{end}:{}) }).toString()}` : '';

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Location Attendance</h1>
      <p className="text-sm text-gray-600">Choose a view:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to={`${base}/fmo${q}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-md border">
          <h2 className="text-lg font-semibold mb-2">Attendance FMO</h2>
          <p className="text-sm text-gray-600">Monthly grid per employee (21st to 20th cycle).</p>
        </Link>
        <Link to={`${base}/roster${q}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-md border">
          <h2 className="text-lg font-semibold mb-2">Attendance vs Duty Roster</h2>
          <p className="text-sm text-gray-600">Daily comparison against scheduled timings.</p>
        </Link>
        <Link to={`${base}/lsr${q}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-md border">
          <h2 className="text-lg font-semibold mb-2">LSR (Roster + Leave Bank)</h2>
          <p className="text-sm text-gray-600">Leave status report integrating attendance, roster weekly offs & leave bank.</p>
        </Link>
      </div>
    </div>
  );
};

export default AttendanceLocationDetailHome;
