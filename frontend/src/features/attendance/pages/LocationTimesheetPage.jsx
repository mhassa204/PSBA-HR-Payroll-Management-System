import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { exportToCSV, exportToExcelMultiSheet } from '../../../lib/exportUtils';
import { toastBus } from '../../../utils/toastBus';

// Biometric Timesheet — late check-in report in the official format:
//   "Late Check IN" sheet: one row per late check-in day (roster columns)
//   "Pivot" sheet: per-employee count of late check-in days
// Built from the same rows as Attendance vs Duty Roster (timeInStatus === 'Late').

function getPayrollRangeForMonth(year, month /* 0-based */) {
  const start = new Date(Date.UTC(year, month, 21));
  const end = new Date(Date.UTC(year, month + 1, 20));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
function getDefaultPayrollMonth() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (utcNow.getUTCDate() >= 21) return { year: utcNow.getUTCFullYear(), month: utcNow.getUTCMonth() };
  const d = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() - 1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

const DETAIL_HEADERS = [
  'Employ ID', 'Biometric Name', 'CNIC No.', 'Name', 'Designation', 'Actual Cost Center',
  'Biometric Cost Center', 'Biometrc Date', 'Date', 'Time-1', 'Time-2',
  'Duty Roster\nTime-In\n(hhh:mm:ss)', 'Duty Roster\nTime-Out\n(hhh:mm:ss)', 'Duty Roster\nTimings\n(hhh:mm:ss)',
  'Actual Duty Performed\n(hhh:mm:ss)', 'Actual Duty Performed Status\n(hhh:mm:ss)',
  'Time In Late', 'Time In\nStatus Late', 'Single Mark', 'Time Out\nEarly / Late', 'Time Out Status\nEarly / Late',
];

function fmtBiometricDate(ymd) {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(/ /g, '-');
}

const LocationTimesheetPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'pivot' ? 'pivot' : 'detail');

  const [fName, setFName] = useState(() => searchParams.get('fname') || '');
  const [fCnic, setFCnic] = useState(() => searchParams.get('fcnic') || '');
  const [fDesignation, setFDesignation] = useState(() => searchParams.get('fdesig') || '');
  const [fCostCenter, setFCostCenter] = useState(() => searchParams.get('fcc') || '');
  const [fMinLateDays, setFMinLateDays] = useState(() => searchParams.get('fmin') || '');

  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const initialMonth = useMemo(() => {
    if (start && end) {
      const d = new Date(start + 'T00:00:00Z');
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    }
    return getDefaultPayrollMonth();
  }, [start, end]);
  const [selYear, setSelYear] = useState(initialMonth.year);
  const [selMonth, setSelMonth] = useState(initialMonth.month);

  useEffect(() => {
    const { start: s, end: e } = getPayrollRangeForMonth(selYear, selMonth);
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    np.set('start', s); np.set('end', e);
    np.set('tab', tab);
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fname', fName);
    setOrDelete('fcnic', fCnic);
    setOrDelete('fdesig', fDesignation);
    setOrDelete('fcc', fCostCenter);
    setOrDelete('fmin', fMinLateDays);
    if (np.toString() !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMonth, tab, fName, fCnic, fDesignation, fCostCenter, fMinLateDays]);

  useEffect(() => {
    if (!start || !end) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/attendance/locations/${id}/roster`, { params: { start, end } });
        setData(data);
      } catch (e) {
        toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load timesheet' });
      } finally { setLoading(false); }
    })();
  }, [id, start, end]);

  // Late check-in rows only
  const lateRows = useMemo(
    () => (data?.rows || []).filter(r => r.timeInStatus === 'Late'),
    [data]
  );

  const inc = (v, f) => String(v || '').toLowerCase().includes(String(f || '').toLowerCase());

  const filteredLate = useMemo(
    () => lateRows.filter(r =>
      inc(r.name, fName) && inc(r.cnic, fCnic) && inc(r.designation, fDesignation) && inc(r.actualCostCenter, fCostCenter)
    ),
    [lateRows, fName, fCnic, fDesignation, fCostCenter]
  );

  // Pivot: late-day counts per employee
  const pivot = useMemo(() => {
    const m = new Map();
    for (const r of filteredLate) {
      const key = r.employeeId;
      if (!m.has(key)) m.set(key, { cnic: r.cnic || '', name: r.name, days: 0 });
      m.get(key).days++;
    }
    let list = [...m.values()].sort((a, b) => b.days - a.days);
    const min = parseInt(fMinLateDays, 10);
    if (!Number.isNaN(min) && min > 0) list = list.filter(p => p.days >= min);
    return list;
  }, [filteredLate, fMinLateDays]);

  const monthOptions = [];
  const now = new Date();
  const baseD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(baseD.getUTCFullYear(), baseD.getUTCMonth() - i, 1));
    monthOptions.push({ value: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
  }

  const cycleLabel = useMemo(() => {
    if (!end) return '';
    const d = new Date(end + 'T00:00:00Z');
    return `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}-${String(d.getUTCFullYear()).slice(2)}`;
  }, [end]);
  const titleText = `Biometric Late C/IN Details FMO ${cycleLabel}`;

  const mapDetail = (rows) => rows.map(r => ({
    'Employ ID': r.employeeId ?? '',
    'Biometric Name': r.name ?? '',
    'CNIC No.': r.cnic ?? '',
    'Name': r.name ?? '',
    'Designation': r.designation ?? '',
    'Actual Cost Center': r.actualCostCenter ?? '',
    'Biometric Cost Center': r.biometricCostCenter ?? '',
    'Biometrc Date': fmtBiometricDate(r.date),
    'Date': r.date ?? '',
    'Time-1': r.time1 ?? '',
    'Time-2': r.time2 ?? '',
    'Duty Roster\nTime-In\n(hhh:mm:ss)': r.dutyIn ?? '',
    'Duty Roster\nTime-Out\n(hhh:mm:ss)': r.dutyOut ?? '',
    'Duty Roster\nTimings\n(hhh:mm:ss)': r.dutyTimings ?? '',
    'Actual Duty Performed\n(hhh:mm:ss)': r.actualPerformed ?? '',
    'Actual Duty Performed Status\n(hhh:mm:ss)': r.performedStatus ?? '',
    'Time In Late': r.timeInLate ?? '',
    'Time In\nStatus Late': r.timeInStatus ?? '',
    'Single Mark': r.singleMark ? 'Yes' : '',
    'Time Out\nEarly / Late': r.timeOutEarlyLate ?? '',
    'Time Out Status\nEarly / Late': r.timeOutStatus ?? '',
  }));

  const PIVOT_HEADERS = ['CNIC No.', 'Name', 'No. of Days Late Check/IN'];
  const mapPivot = (rows) => rows.map(p => ({
    'CNIC No.': p.cnic,
    'Name': p.name,
    'No. of Days Late Check/IN': p.days,
  }));

  const handleExport = (type) => {
    if (!filteredLate.length) {
      toastBus.emit({ type: 'info', message: 'No late check-ins to export for this period.' });
      return;
    }
    const base = `Biometric_Timesheet_${data?.location?.name || 'Location'}_${start}_to_${end}`;
    if (type === 'xlsx') {
      exportToExcelMultiSheet(`${base}.xlsx`, [
        { name: 'Pivot', rows: mapPivot(pivot), headerOrder: PIVOT_HEADERS, title: titleText },
        { name: 'Late Check IN', rows: mapDetail(filteredLate), headerOrder: DETAIL_HEADERS },
      ]);
    } else if (tab === 'pivot') {
      exportToCSV(`${base}_pivot.csv`, mapPivot(pivot), PIVOT_HEADERS, titleText);
    } else {
      exportToCSV(`${base}_late_checkin.csv`, mapDetail(filteredLate), DETAIL_HEADERS, titleText);
    }
    toastBus.emit({ type: 'success', message: `Exported ${type === 'xlsx' ? 'workbook (Pivot + Late Check IN)' : 'CSV'}.` });
  };

  const exportRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading timesheet..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[97vw] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">Biometric Timesheet — {data.location?.name}</h1>
          <p className="text-xs text-gray-500">{data.range.start} to {data.range.end} · {lateRows.length} late check-in(s) · {pivot.length} employee(s)</p>
        </div>
        <div className="actions-inline">
          <select className="form-input dense-input !w-auto text-xs" value={`${selYear}-${selMonth}`} onChange={(e) => { const [y, m] = e.target.value.split('-').map(n => parseInt(n, 10)); setSelYear(y); setSelMonth(m); }}>
            {monthOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
          <div className="relative" ref={exportRef}>
            <button type="button" className="btn btn-secondary text-xs" onClick={() => setExportOpen(o => !o)}>Export ▾</button>
            {exportOpen && (
              <div className="menu-surface absolute right-0 mt-1 z-30 flex flex-col" role="menu">
                <button className="menu-item" onClick={() => { handleExport('xlsx'); setExportOpen(false); }}>Excel (official format)</button>
                <button className="menu-item" onClick={() => { handleExport('csv'); setExportOpen(false); }}>CSV (current tab)</button>
              </div>
            )}
          </div>
          <Link to={`/attendance/locations/${id}`} className="btn btn-outline text-xs">Back</Link>
        </div>
      </div>

      <div className="report-title-bar">{titleText}</div>

      {/* Tabs + filters */}
      <div className="card-soft p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab('detail')} className={`btn btn-sm ${tab === 'detail' ? 'btn-primary' : 'btn-outline'}`}>Late Check IN ({filteredLate.length})</button>
          <button onClick={() => setTab('pivot')} className={`btn btn-sm ${tab === 'pivot' ? 'btn-primary' : 'btn-outline'}`}>Pivot — Days Late ({pivot.length})</button>
        </div>
        <div className="filter-panel compact">
          <input className="form-input" placeholder="Name" value={fName} onChange={e => setFName(e.target.value)} />
          <input className="form-input" placeholder="CNIC No." value={fCnic} onChange={e => setFCnic(e.target.value)} />
          <input className="form-input" placeholder="Designation" value={fDesignation} onChange={e => setFDesignation(e.target.value)} />
          <input className="form-input" placeholder="Cost Center" value={fCostCenter} onChange={e => setFCostCenter(e.target.value)} />
          {tab === 'pivot' && (
            <input className="form-input" type="number" min="1" placeholder="Min. late days" value={fMinLateDays} onChange={e => setFMinLateDays(e.target.value)} />
          )}
        </div>
      </div>

      {tab === 'detail' ? (
        <div className="table-shell card-soft p-0 custom-thin-scroll table-fixed-viewport">
          <table className="table-enhanced table-no-wrap" style={{ tableLayout: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                <th>Employ ID</th><th>CNIC No.</th><th>Name</th><th>Designation</th>
                <th>Actual Cost Center</th><th>Date</th><th>Time-1</th><th>Time-2</th>
                <th>Duty In</th><th>Duty Out</th><th>Duty Timings</th>
                <th>Actual Performed</th><th>Performed Status</th>
                <th>Time In Late</th><th>Single Mark</th><th>Time Out Early/Late</th><th>Time Out Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLate.map((r, i) => (
                <tr key={`${r.employeeId}-${r.date}-${i}`}>
                  <td>{r.employeeId}</td><td>{r.cnic || '-'}</td><td className="text-left">{r.name}</td><td className="text-left">{r.designation || '-'}</td>
                  <td className="text-left">{r.actualCostCenter || '-'}</td><td>{r.date}</td><td>{r.time1}</td><td>{r.time2}</td>
                  <td>{r.dutyIn}</td><td>{r.dutyOut}</td><td>{r.dutyTimings}</td>
                  <td>{r.actualPerformed}</td><td>{r.performedStatus}</td>
                  <td className="font-medium text-red-600">{r.timeInLate}</td>
                  <td>{r.singleMark ? 'Yes' : ''}</td><td>{r.timeOutEarlyLate}</td><td>{r.timeOutStatus}</td>
                </tr>
              ))}
              {!filteredLate.length && <tr><td colSpan={17} className="text-center py-6 text-gray-500 text-xs">No late check-ins in this period 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-shell card-soft p-0 custom-thin-scroll overflow-x-auto max-w-2xl">
          <table className="table-enhanced min-w-full">
            <thead>
              <tr><th className="text-left">CNIC No.</th><th className="text-left">Name</th><th>No. of Days Late Check/IN</th></tr>
            </thead>
            <tbody>
              {pivot.map((p) => (
                <tr key={`${p.cnic}-${p.name}`}>
                  <td className="text-left">{p.cnic || '-'}</td>
                  <td className="text-left">{p.name}</td>
                  <td className="font-medium">{p.days}</td>
                </tr>
              ))}
              {!pivot.length && <tr><td colSpan={3} className="text-center py-6 text-gray-500 text-xs">No late check-ins in this period 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LocationTimesheetPage;
