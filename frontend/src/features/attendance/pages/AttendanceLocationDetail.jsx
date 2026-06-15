import React from 'react';
import { useParams, Link } from 'react-router-dom';

// Placeholder page for now; will implement details next
const AttendanceLocationDetail = () => {
  const { id } = useParams();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Location Attendance</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Location ID: {id}</p>
        </div>
        <Link to="/attendance/locations" className="btn btn-secondary">Back to Locations</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">This screen will show the attendance detail for the selected location. You will guide the requirements in the next step.</p>
      </div>
    </div>
  );
};

export default AttendanceLocationDetail;
