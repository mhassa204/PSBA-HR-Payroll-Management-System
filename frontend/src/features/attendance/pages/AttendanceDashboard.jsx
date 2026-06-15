import React from "react";
import { Link } from "react-router-dom";

const AttendanceDashboard = () => {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Attendance
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Choose what to manage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Attendance by Location</h2>
            <p className="text-sm text-gray-600">
              View attendance grouped by each location and drill into details.
            </p>
          </div>
          <div className="mt-4">
            <Link to="/attendance/locations" className="btn btn-primary">
              Open Locations
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Leave Management</h2>
            <p className="text-sm text-gray-600">Manage employee leaves.</p>
          </div>
          <div className="mt-4">
            <Link to="/attendance/leaves" className="btn btn-secondary">
              Open Leave Management
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
