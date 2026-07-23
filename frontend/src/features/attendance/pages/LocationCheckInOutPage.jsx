import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';
import PayrollRangeControl, { getDefaultPayrollRange } from '../components/PayrollRangeControl';
import ExportMenu from '../components/ExportMenu';

// Simple punch log: one row per employee per day, only check-in / check-out.
const LocationCheckInOutPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  const [fName, setFName] = useState(() => searchParams.get('fname') || '');
  const [fCnic, setFCnic] = useState(() => searchParams.get('fcnic') || '');
  const [fDesignation, setFDesignation] = useState(() => searchParams.get('fdesig') || '');
  const [fCostCenter, setFCostCenter] = useState(() => searchParams.get('fcc') || '');
  const [fDate, setFDate] = useState(() => searchParams.get('fdate') || '');
  const [fStatus, setFStatus] = useState(() => searchParams.get('fstatus') || ''); // '', 'complete', 'single'

  // default period: current payroll cycle
  useEffect(() => {
    if (start && end) return;
    const def = getDefaultPayrollRange();
    const np = new URLSearchParams(searchParams);
    np.set('start', def.start); np.set('end', def.end);
    setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  // keep filters in URL
  useEffect(() => {
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fname', fName);
    setOrDelete('fcnic', fCnic);
    setOrDelete('fdesig', fDesignation);
    setOrDelete('fcc', fCostCenter);
    setOrDelete('fdate', fDate);
    setOrDelete('fstatus', fStatus);
    if (np.toString() !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fName, fCnic, fDesignation, fCostCenter, fDate, fStatus]);

  useEffect(() => {
    if (!start || !end) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/attendance/locations/${id}/checkinout`, { params: { start, end } });
        setData(data);
      } catch (e) {
        toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load check in/out log' });
      } finally { setLoading(false); }
    })();
  }, [id, start, end]);

  const rows = data?.rows || [];

  const filteredRows = useMemo(() => {
    const inc = (v, f) => String(v || '').toLowerCase().includes(String(f || '').toLowerCase());
    return rows.filter(r =>
      inc(r.name, fName) &&
      inc(r.cnic, fCnic) &&
      inc(r.designation, fDesignation) &&
      inc(r.costCenter, fCostCenter) &&
      inc(r.date, fDate) &&
      (fStatus === '' || (fStatus === 'single' ? r.singleMark : !r.singleMark))
    );
  }, [rows, fName, fCnic, fDesignation, fCostCenter, fDate, fStatus]);

  const titleText = `Check In / Check Out - ${data?.location?.name || ''} (${data?.range?.start} to ${data?.range?.end})`;

  const EXPORT_COLUMNS = ['EmployeeID', 'CNIC', 'Name', 'Designation', 'CostCenter', 'Date', 'Day', 'Check In', 'Check Out', 'Punches', 'Status'];
  const mapForExport = (list) => list.map(r => ({
    EmployeeID: r.employeeId ?? '',
    CNIC: r.cnic ?? '',
    Name: r.name ?? '',
    Designation: r.designation ?? '',
    CostCenter: r.costCenter ?? '',
    Date: r.date ?? '',
    Day: r.day ?? '',
    'Check In': r.checkIn ?? '',
    'Check Out': r.checkOut ?? '',
    Punches: r.punches ?? '',
    Status: r.singleMark ? 'Single Mark' : 'Complete',
  }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading check in/out log..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[97vw] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">Check In / Check Out - {data.location?.name}</h1>
          <p className="text-xs text-gray-500">{data.range.start} to {data.range.end} · {filteredRows.length} of {rows.length} row(s)</p>
        </div>
        <div className="actions-inline">
          <PayrollRangeControl
            start={start}
            end={end}
            onChange={({ start: s, end: e }) => {
              const np = new URLSearchParams(searchParams);
              np.set('start', s); np.set('end', e);
              setSearchParams(np, { replace: true });
            }}
          />
          <ExportMenu
            columns={EXPORT_COLUMNS}
            getRows={(scope) => mapForExport(scope === 'filtered' ? filteredRows : rows)}
            filenameBase={`CheckInOut_${data?.location?.name || 'Location'}_${start}_to_${end}`}
            sheetName="Check In-Out"
            title={titleText}
            counts={{ filtered: filteredRows.length, all: rows.length }}
          />
          <Link to={`/attendance/locations/${id}`} className="btn btn-outline text-xs">Back</Link>
        </div>
      </div>

      <div className="report-title-bar">{titleText}</div>

      <div className="card-soft p-4 space-y-3">
        <div className="filter-panel compact">
          <input className="form-input" placeholder="Name" value={fName} onChange={e => setFName(e.target.value)} />
          <input className="form-input" placeholder="CNIC No." value={fCnic} onChange={e => setFCnic(e.target.value)} />
          <input className="form-input" placeholder="Designation" value={fDesignation} onChange={e => setFDesignation(e.target.value)} />
          <input className="form-input" placeholder="Cost Center" value={fCostCenter} onChange={e => setFCostCenter(e.target.value)} />
          <input className="form-input" placeholder="Date (YYYY-MM-DD)" value={fDate} onChange={e => setFDate(e.target.value)} />
          <select className="form-input" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Status (Any)</option>
            <option value="complete">Complete (In + Out)</option>
            <option value="single">Single Mark</option>
          </select>
        </div>
      </div>

      <div className="table-shell card-soft p-0 custom-thin-scroll table-fixed-viewport">
        <table className="table-enhanced table-no-wrap" style={{ tableLayout: 'auto', minWidth: '100%' }}>
          <thead>
            <tr>
              <th>Employ ID</th>
              <th>CNIC No.</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Cost Center</th>
              <th>Date</th>
              <th>Day</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Punches</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={`${r.employeeId}-${r.date}-${i}`}>
                <td>{r.employeeId}</td>
                <td>{r.cnic || '-'}</td>
                <td className="text-left">{r.name}</td>
                <td className="text-left">{r.designation || '-'}</td>
                <td className="text-left">{r.costCenter || '-'}</td>
                <td>{r.date}</td>
                <td>{r.day}</td>
                <td className="font-medium">{r.checkIn || '-'}</td>
                <td className="font-medium">{r.checkOut || '-'}</td>
                <td>{r.punches}</td>
                <td>
                  {r.singleMark
                    ? <span className="badge badge-amber">Single Mark</span>
                    : <span className="badge badge-green">Complete</span>}
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={11} className="text-center py-6 text-gray-500 text-xs">
                  {rows.length ? 'No records match the filters' : 'No punches recorded in this period'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationCheckInOutPage;
