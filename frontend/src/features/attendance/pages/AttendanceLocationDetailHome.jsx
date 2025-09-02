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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to={`${base}/fmo${q}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-md border">
          <h2 className="text-lg font-semibold mb-2">Attendance FMO</h2>
          <p className="text-sm text-gray-600">Monthly grid per employee with day-wise Present/Absent and totals.</p>
        </Link>
        <Link to={`${base}/roster${q}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-md border">
          <h2 className="text-lg font-semibold mb-2">Attendance against Duty Roster</h2>
          <p className="text-sm text-gray-600">Daily rows comparing first IN/last OUT with roster timings.</p>
        </Link>
      </div>
    </div>
  );
};

export default AttendanceLocationDetailHome;
