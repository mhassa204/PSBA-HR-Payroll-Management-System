import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { attendanceService } from '../services/attendanceService';

const TYPE_CHIPS = [
  { value: 'ALL', label: 'All' },
  { value: 'BAZAAR', label: 'Bazaars' },
  { value: 'MOBILE_BAZAAR', label: 'Mobile (On the GO)' },
  { value: 'SPECIAL_UNIT', label: 'Special Units' },
  { value: 'HEAD_OFFICE', label: 'Head Office' },
];

const TYPE_BADGE = {
  BAZAAR: 'badge badge-blue',
  MOBILE_BAZAAR: 'badge badge-amber',
  SPECIAL_UNIT: 'badge badge-gray',
  HEAD_OFFICE: 'badge badge-green',
};

const typeLabel = (t) =>
  ({ BAZAAR: 'Bazaar', MOBILE_BAZAAR: 'On the GO', SPECIAL_UNIT: 'Special Unit', HEAD_OFFICE: 'Head Office' }[t] || t);

const AttendanceLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToastContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'ALL';
  const district = searchParams.get('district') || '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await attendanceService.listLocations();
        setLocations(list);
      } catch (e) {
        showError(e?.response?.data?.error || e.message || 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const districts = useMemo(
    () => [...new Set(locations.map((l) => l.district?.name).filter(Boolean))].sort(),
    [locations]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return locations.filter((l) => {
      if (type !== 'ALL' && l.type !== type) return false;
      if (district && l.district?.name !== district) return false;
      if (needle) {
        const hay = `${l.name} ${l.district?.name || ''} ${l.city?.name || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [locations, q, type, district]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading locations..." />
      </div>
    );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Attendance by Location</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered.length} of {locations.length} locations
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card-soft p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="form-input md:max-w-md"
            placeholder="Search by name, city or district…"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
          />
          <select
            className="form-input md:w-56"
            value={district}
            onChange={(e) => setParam('district', e.target.value)}
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => setParam('type', c.value)}
              className={`btn btn-sm ${type === c.value ? 'btn-primary' : 'btn-outline'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!filtered.length ? (
        <div className="card-soft p-8 text-center text-sm text-gray-500">
          No locations match your search.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">District</th>
                  <th className="text-left">City</th>
                  <th>Employees</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr
                    key={loc.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/attendance/locations/${loc.id}`)}
                  >
                    <td className="text-left font-medium">{loc.name}</td>
                    <td className="text-left">
                      <span className={TYPE_BADGE[loc.type] || 'badge badge-gray'}>{typeLabel(loc.type)}</span>
                    </td>
                    <td className="text-left">{loc.district?.name || '—'}</td>
                    <td className="text-left">{loc.city?.name || '—'}</td>
                    <td>{loc.active_employees ?? '—'}</td>
                    <td className="text-left">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/attendance/locations/${loc.id}`);
                        }}
                      >
                        View Attendance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                className="card-soft p-4 w-full text-left"
                onClick={() => navigate(`/attendance/locations/${loc.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-gray-800">{loc.name}</div>
                  <span className={TYPE_BADGE[loc.type] || 'badge badge-gray'}>{typeLabel(loc.type)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {[loc.city?.name, loc.district?.name].filter(Boolean).join(', ') || '—'} ·{' '}
                  {loc.active_employees ?? 0} employees
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceLocations;
