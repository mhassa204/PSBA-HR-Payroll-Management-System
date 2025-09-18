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
    <div className="max-w-6xl mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary" style={{ color: 'var(--color-primary-700)' }}>Location Attendance</h1>
        <p className="text-sm text-gray-600">Choose a view:</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to={`${base}/fmo${q}`} className="group card-soft hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="card-soft-header flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-primary">Attendance FMO</h2>
            <span className="badge badge-blue">Monthly</span>
          </div>
          <div className="p-4 text-sm text-gray-600 leading-relaxed">
            Monthly grid per employee (21st to 20th cycle).
          </div>
        </Link>
        <Link to={`${base}/roster${q}`} className="group card-soft hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="card-soft-header flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-primary">Attendance vs Duty Roster</h2>
            <span className="badge badge-amber">Daily</span>
          </div>
          <div className="p-4 text-sm text-gray-600 leading-relaxed">
            Daily comparison against scheduled timings.
          </div>
        </Link>
        <Link to={`${base}/lsr${q}`} className="group card-soft hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="card-soft-header flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-primary">LSR (Roster + Leave Bank)</h2>
            <span className="badge badge-green">Report</span>
          </div>
          <div className="p-4 text-sm text-gray-600 leading-relaxed">
            Leave status report integrating attendance, roster weekly offs & leave bank.
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AttendanceLocationDetailHome;
