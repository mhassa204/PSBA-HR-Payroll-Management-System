import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { attendanceService } from '../services/attendanceService';
import axios from '../../../lib/axios';
import PayrollRangeControl, { getDefaultPayrollRange } from '../components/PayrollRangeControl';
import ExportMenu from '../components/ExportMenu';

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

  // ---- Multi-location export (Check In/Out, FMO, LSR, Roster) ---------
  const [range, setRange] = useState(() => getDefaultPayrollRange());
  const [report, setReport] = useState('checkinout');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const exportCache = useRef(new Map()); // key: report|start|end|locId (or |bulk) -> rows
  const MAX_LOCATIONS = 100; // per-location reports fetch one request per bazaar

  const toggleSelected = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  const toggleAllFiltered = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allFilteredSelected) filtered.forEach((l) => next.delete(l.id));
    else filtered.forEach((l) => next.add(l.id));
    return next;
  });

  // FMO day columns are derived from the chosen range (matches the FMO page)
  const fmoDayCols = useMemo(() => {
    const cols = [];
    if (!range.start || !range.end) return cols;
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let d = new Date(range.start + 'T00:00:00Z');
    const end = new Date(range.end + 'T00:00:00Z');
    while (d <= end && cols.length < 400) {
      cols.push(`${DOW[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}`);
      d = new Date(d.getTime() + 86400000);
    }
    return cols;
  }, [range.start, range.end]);

  const REPORTS = {
    checkinout: {
      label: 'Check In / Check Out',
      sheet: 'Check In-Out',
      columns: ['Location', 'Location Type', 'EmployeeID', 'CNIC', 'Name', 'Designation', 'CostCenter', 'Date', 'Day', 'Check In', 'Check Out', 'Punches', 'Status'],
    },
    fmo: {
      label: 'Attendance FMO',
      sheet: 'FMO',
      columns: ['Location', 'SrNo', 'CNIC', 'Name', 'Designation', 'CostCenter', ...fmoDayCols, 'TotalDays', 'Present', 'NotMark', 'Absent'],
    },
    roster: {
      label: 'Attendance vs Duty Roster',
      sheet: 'Roster',
      columns: ['Location', 'EmployeeID', 'CNIC', 'Name', 'Designation', 'ActualCostCenter', 'BiometricCostCenter', 'Date', 'Check In', 'Check Out', 'DutyIn', 'DutyOut', 'DutyTimings', 'Source', 'ActualPerformed', 'PerformedStatus', 'TimeInLate', 'TimeInStatus', 'SingleMark', 'TimeOutEarlyLate', 'TimeOutStatus'],
    },
    lsr: {
      label: 'LSR (Leave Status Report)',
      sheet: 'LSR',
      columns: ['BazaarName', 'EmployeeName', 'Designation', 'CNIC', 'AccountHolderName', 'BranchCode', 'AccountNumber', 'TotalWorkingDays', 'PresentDays', 'Absents', 'HolidaysWeeklyOff', 'WeeklyOffDates', 'FullDayLeavesApproved', 'ApprovedLeaveDates', 'UnapprovedLeaves', 'Remarks'],
    },
  };

  const cached = async (key, fetcher) => {
    if (!exportCache.current.has(key)) exportCache.current.set(key, await fetcher());
    return exportCache.current.get(key);
  };

  const mapCheckInOut = (r) => ({
    Location: r.locationName ?? '', 'Location Type': typeLabel(r.locationType), EmployeeID: r.employeeId ?? '', CNIC: r.cnic ?? '',
    Name: r.name ?? '', Designation: r.designation ?? '', CostCenter: r.costCenter ?? '', Date: r.date ?? '', Day: r.day ?? '',
    'Check In': r.checkIn ?? '', 'Check Out': r.checkOut ?? '', Punches: r.punches ?? '', Status: r.singleMark ? 'Single Mark' : 'Complete',
  });
  const mapFmo = (locName, data) => (data.rows || []).map((r) => {
    const row = { Location: locName, SrNo: r.sr, CNIC: r.cnic ?? '', Name: r.name ?? '', Designation: r.designation ?? '', CostCenter: r.roleTag ?? '' };
    (data.days || []).forEach((d, i) => { row[`${d.dow} ${d.label}`] = r.marks?.[i] ?? ''; });
    row.TotalDays = r.totals?.totalDays ?? ''; row.Present = r.totals?.present ?? ''; row.NotMark = r.totals?.notMark ?? ''; row.Absent = r.totals?.absent ?? '';
    return row;
  });
  const mapRoster = (locName, data) => (data.rows || []).map((r) => ({
    Location: locName, EmployeeID: r.employeeId ?? '', CNIC: r.cnic ?? '', Name: r.name ?? '', Designation: r.designation ?? '',
    ActualCostCenter: r.actualCostCenter ?? '', BiometricCostCenter: r.biometricCostCenter ?? '', Date: r.date ?? '',
    'Check In': r.time1 ?? '', 'Check Out': r.time2 ?? '', DutyIn: r.dutyIn ?? '', DutyOut: r.dutyOut ?? '', DutyTimings: r.dutyTimings ?? '',
    Source: r.scheduleSource === 'HQ_DEFAULT' ? 'HQ Default' : r.scheduleSource === 'ROSTER' ? 'Roster' : '',
    ActualPerformed: r.actualPerformed ?? '', PerformedStatus: r.performedStatus ?? '', TimeInLate: r.timeInLate ?? '', TimeInStatus: r.timeInStatus ?? '',
    SingleMark: r.singleMark ? 'Yes' : '', TimeOutEarlyLate: r.timeOutEarlyLate ?? '', TimeOutStatus: r.timeOutStatus ?? '',
  }));
  const mapLsr = (data) => (data.employees || []).map((r) => ({
    BazaarName: r.bazaarName ?? '', EmployeeName: r.name ?? '', Designation: r.designation ?? '', CNIC: r.cnic ?? '',
    AccountHolderName: r.bank?.accountHolderName ?? '', BranchCode: r.bank?.branchCode ?? '', AccountNumber: r.bank?.accountNumber ?? '',
    TotalWorkingDays: r.totals?.workingDays ?? '', PresentDays: r.totals?.presentDays ?? '', Absents: r.totals?.absents ?? '',
    HolidaysWeeklyOff: r.totals?.holidays ?? '', WeeklyOffDates: r.weeklyOffDisplay ?? '', FullDayLeavesApproved: r.totals?.fullDayLeaves ?? '',
    ApprovedLeaveDates: r.approvedLeaveDisplay ?? '', UnapprovedLeaves: r.totals?.unapprovedLeaves ?? '', Remarks: r.remarks ?? '',
  }));

  const getExportRows = async (scope) => {
    const scopeLocs = scope === 'selected'
      ? locations.filter((l) => selectedIds.has(l.id))
      : scope === 'filtered' ? filtered : locations;
    if (report === 'checkinout') {
      const rows = await cached(`checkinout|${range.start}|${range.end}|bulk`, async () => {
        const { data } = await axios.get('/attendance/locations/export', { params: { start: range.start, end: range.end } });
        return data.rows || [];
      });
      const ids = new Set(scopeLocs.map((l) => l.id));
      return rows.filter((r) => ids.has(r.locationId)).map(mapCheckInOut);
    }
    // Per-location reports: one request per bazaar
    if (scopeLocs.length > MAX_LOCATIONS) {
      throw { response: { data: { error: `${scopeLocs.length} locations — too many for a ${REPORTS[report].label} export. Select up to ${MAX_LOCATIONS} (use the checkboxes or filters).` } } };
    }
    const out = [];
    const endpoint = report === 'fmo' ? 'fmo' : report === 'roster' ? 'roster' : 'lsr';
    for (const loc of scopeLocs) {
      const rows = await cached(`${report}|${range.start}|${range.end}|${loc.id}`, async () => {
        const { data } = await axios.get(`/attendance/locations/${loc.id}/${endpoint}`, { params: { start: range.start, end: range.end } });
        if (report === 'fmo') return mapFmo(loc.name, data);
        if (report === 'roster') return mapRoster(loc.name, data);
        return mapLsr(data);
      });
      out.push(...rows);
    }
    return out;
  };

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
            {selectedIds.size > 0 && (
              <>
                {' · '}<span className="font-medium text-primary">{selectedIds.size} selected for export</span>
                {' · '}
                <button className="underline" onClick={() => setSelectedIds(new Set())}>clear</button>
              </>
            )}
          </p>
        </div>
        <div className="actions-inline">
          <PayrollRangeControl start={range.start} end={range.end} onChange={setRange} />
          <ExportMenu
            columns={REPORTS[report].columns}
            getRows={getExportRows}
            filenameBase={`${REPORTS[report].sheet}_${report === 'checkinout' ? 'Locations' : 'Multi_Location'}_${range.start}_to_${range.end}`}
            sheetName={REPORTS[report].sheet}
            title={`${REPORTS[report].label} — ${range.start} to ${range.end}`}
            scopes={[
              { key: 'selected', label: `Selected locations (${selectedIds.size})`, disabled: !selectedIds.size },
              { key: 'filtered', label: `Filtered locations (${filtered.length})` },
              { key: 'all', label: `All locations (${locations.length})` },
            ]}
            header={
              <div className="space-y-1">
                <div className="font-semibold text-gray-700">Report</div>
                <select className="form-input text-xs w-full" value={report} onChange={(e) => setReport(e.target.value)}>
                  {Object.entries(REPORTS).map(([k, r]) => (<option key={k} value={k}>{r.label}</option>))}
                </select>
              </div>
            }
          />
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
                  <th>
                    <input
                      type="checkbox"
                      title="Select all filtered locations for export"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                    />
                  </th>
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(loc.id)}
                        onChange={() => toggleSelected(loc.id)}
                      />
                    </td>
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
