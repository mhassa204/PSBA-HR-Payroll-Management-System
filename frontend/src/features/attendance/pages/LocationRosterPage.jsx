import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { exportToCSV, exportToExcel } from '../../../lib/exportUtils';
import { toastBus } from '../../../utils/toastBus';

function getPayrollRangeForMonth(year, month /* 0-based */) {
  const start = new Date(Date.UTC(year, month, 21));
  const end = new Date(Date.UTC(year, month + 1, 20));
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
}
function getDefaultPayrollMonth() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (utcNow.getUTCDate() >= 21) return { year: utcNow.getUTCFullYear(), month: utcNow.getUTCMonth() };
  const d = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth()-1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

const LocationRosterPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // filters (initialize from URL)
  const [fBiometricId, setFBiometricId] = useState(() => searchParams.get('fbio') || '');
  const [fCnic, setFCnic] = useState(() => searchParams.get('fcnic') || '');
  const [fName, setFName] = useState(() => searchParams.get('fname') || '');
  const [fDesignation, setFDesignation] = useState(() => searchParams.get('fdesig') || '');
  const [fActualCC, setFActualCC] = useState(() => searchParams.get('facc') || '');
  const [fBioCC, setFBioCC] = useState(() => searchParams.get('fbcc') || '');
  const [fDate, setFDate] = useState(() => searchParams.get('fdate') || '');
  const [fPerformedStatus, setFPerformedStatus] = useState(() => searchParams.get('fperf') || '');
  const [fTimeInStatus, setFTimeInStatus] = useState(() => searchParams.get('ftin') || '');
  const [fSingleMark, setFSingleMark] = useState(() => searchParams.get('fsingle') || ''); // '', 'Yes', 'No'
  const [fTimeOutStatus, setFTimeOutStatus] = useState(() => searchParams.get('ftout') || '');

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

  // Sync month (start/end) into URL, only if changed
  useEffect(() => {
    const { start: s, end: e } = getPayrollRangeForMonth(selYear, selMonth);
    const np = new URLSearchParams(searchParams);
    let changed = false;
    if (np.get('start') !== s) { np.set('start', s); changed = true; }
    if (np.get('end') !== e) { np.set('end', e); changed = true; }
    if (changed) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMonth]);

  // keep filters in URL (only update if something changed)
  useEffect(() => {
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fbio', fBiometricId);
    setOrDelete('fcnic', fCnic);
    setOrDelete('fname', fName);
    setOrDelete('fdesig', fDesignation);
    setOrDelete('facc', fActualCC);
    setOrDelete('fbcc', fBioCC);
    setOrDelete('fdate', fDate);
    setOrDelete('fperf', fPerformedStatus);
    setOrDelete('ftin', fTimeInStatus);
    setOrDelete('fsingle', fSingleMark);
    setOrDelete('ftout', fTimeOutStatus);
    const after = np.toString();
    if (after !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fBiometricId, fCnic, fName, fDesignation, fActualCC, fBioCC, fDate, fPerformedStatus, fTimeInStatus, fSingleMark, fTimeOutStatus]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/attendance/locations/${id}/roster`, { params: { ...(start?{start}:{}) , ...(end?{end}:{}) } });
      setData(data);
    } catch (e) {
      // ignore detailed error UI for brevity
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if (start && end) load(); }, [id, start, end]);

  // derive rows safely for hooks below regardless of loading state
  const rows = (data && data.rows) ? data.rows : [];

  const filteredRows = useMemo(() => {
    const inc = (val, f) => (String(val || '').toLowerCase().includes(String(f || '').toLowerCase()));
    return rows.filter(r =>
      inc(r.biometricId, fBiometricId) &&
      inc(r.cnic, fCnic) &&
      inc(r.name, fName) &&
      inc(r.designation, fDesignation) &&
      inc(r.actualCostCenter, fActualCC) &&
      inc(r.biometricCostCenter, fBioCC) &&
      inc(r.date, fDate) &&
      inc(r.performedStatus, fPerformedStatus) &&
      inc(r.timeInStatus, fTimeInStatus) &&
      (fSingleMark === '' || (fSingleMark === 'Yes' ? !!r.singleMark : !r.singleMark)) &&
      inc(r.timeOutStatus, fTimeOutStatus)
    );
  }, [rows, fBiometricId, fCnic, fName, fDesignation, fActualCC, fBioCC, fDate, fPerformedStatus, fTimeInStatus, fSingleMark, fTimeOutStatus]);

  const monthOptions = [];
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    monthOptions.push({ value: { y: d.getUTCFullYear(), m: d.getUTCMonth() }, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
  }

  const titleText = `Attendance vs Duty Roster - ${data?.location?.name || ''} (${data?.range?.start} to ${data?.range?.end})`;

  // Export helpers
  const mapRosterForExport = (rowsForExport) => {
    return rowsForExport.map(r => ({
      EmployeeID: r.employeeId ?? '',
      BiometricID: r.biometricId ?? '',
      CNIC: r.cnic ?? '',
      Name: r.name ?? '',
      Designation: r.designation ?? '',
      ActualCostCenter: r.actualCostCenter ?? '',
      BiometricCostCenter: r.biometricCostCenter ?? '',
      Date: r.date ?? '',
      DateLabel: r.dateLabel ?? '',
      Time1: r.time1 ?? '',
      Time2: r.time2 ?? '',
      DutyIn: r.dutyIn ?? '',
      DutyOut: r.dutyOut ?? '',
      DutyTimings: r.dutyTimings ?? '',
      ActualPerformed: r.actualPerformed ?? '',
      PerformedStatus: r.performedStatus ?? '',
      TimeInLate: r.timeInLate ?? '',
      TimeInStatus: r.timeInStatus ?? '',
      SingleMark: r.singleMark ? 'Yes' : '',
      TimeOutEarlyLate: r.timeOutEarlyLate ?? '',
      TimeOutStatus: r.timeOutStatus ?? ''
    }));
  };

  const handleExport = (type, onlyFiltered) => {
    const rowsSrc = onlyFiltered ? filteredRows : rows;
    if (!rowsSrc?.length) return;
    const payload = mapRosterForExport(rowsSrc);
    const headers = [
      'EmployeeID','BiometricID','CNIC','Name','Designation','ActualCostCenter','BiometricCostCenter','Date','DateLabel','Time1','Time2','DutyIn','DutyOut','DutyTimings','ActualPerformed','PerformedStatus','TimeInLate','TimeInStatus','SingleMark','TimeOutEarlyLate','TimeOutStatus'
    ];
    const filename = `Roster_${data?.location?.name || 'Location'}_${data?.range?.start}_to_${data?.range?.end}.${type==='csv'?'csv':'xlsx'}`;
    if (type === 'csv') exportToCSV(filename, payload, headers, titleText);
    else exportToExcel(filename, payload, 'Roster', headers, titleText);
    const mode = onlyFiltered ? 'filtered' : 'all';
    toastBus.emit({ type: 'success', message: `Exported ${rowsSrc.length} ${mode} rows to ${type.toUpperCase()}.` });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading attendance..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Attendance vs Duty Roster - {data.location?.name}</h1>
          <p className="text-sm text-gray-600">{data.range.start} to {data.range.end}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1 text-sm hover:bg-gray-50" value={`${selYear}-${selMonth}`} onChange={(e)=>{
            const [y,m] = e.target.value.split('-').map(n=>parseInt(n,10));
            setSelYear(y); setSelMonth(m);
          }}>
            {monthOptions.map((opt, idx) => (
              <option key={idx} value={`${opt.value.y}-${opt.value.m}`}>{opt.label}</option>
            ))}
          </select>
          <div className="relative group">
            <button className="px-3 py-1 border rounded text-sm hover:bg-gray-100 transition-colors">Export ▾</button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow z-20 min-w-56">
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>handleExport('csv', true)}>Export Filtered CSV</button>
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>handleExport('xlsx', true)}>Export Filtered Excel</button>
              <div className="my-1 border-t" />
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>handleExport('csv', false)}>Export All CSV</button>
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>handleExport('xlsx', false)}>Export All Excel</button>
            </div>
          </div>
          <Link to={`/attendance/locations/${id}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 transition-colors">Back</Link>
        </div>
      </div>

      {/* Report Title Above Table */}
      <div className="mb-2 text-center">
        <h2 className="text-base font-semibold">{titleText}</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-3 mb-3 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Biometric ID" value={fBiometricId} onChange={e=>setFBiometricId(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="CNIC No." value={fCnic} onChange={e=>setFCnic(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Name" value={fName} onChange={e=>setFName(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Designation" value={fDesignation} onChange={e=>setFDesignation(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Actual Cost Center" value={fActualCC} onChange={e=>setFActualCC(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Biometric Cost Center" value={fBioCC} onChange={e=>setFBioCC(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Date (YYYY-MM-DD)" value={fDate} onChange={e=>setFDate(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Performed Status" value={fPerformedStatus} onChange={e=>setFPerformedStatus(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Time In Status" value={fTimeInStatus} onChange={e=>setFTimeInStatus(e.target.value)} />
        <select className="border rounded px-2 py-1 text-sm" value={fSingleMark} onChange={e=>setFSingleMark(e.target.value)}>
          <option value="">Single Mark (Any)</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
        <input className="border rounded px-2 py-1 text-sm" placeholder="Time Out Status" value={fTimeOutStatus} onChange={e=>setFTimeOutStatus(e.target.value)} />
      </div>

      <div className="overflow-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-xs text-gray-500">Employ ID</th>
              <th className="px-3 py-2 text-xs text-gray-500">Biometric ID</th>
              <th className="px-3 py-2 text-xs text-gray-500">CNIC No.</th>
              <th className="px-3 py-2 text-xs text-gray-500">Name</th>
              <th className="px-3 py-2 text-xs text-gray-500">Designation</th>
              <th className="px-3 py-2 text-xs text-gray-500">Actual Cost Center</th>
              <th className="px-3 py-2 text-xs text-gray-500">Biometric Cost Center</th>
              <th className="px-3 py-2 text-xs text-gray-500">Date</th>
              <th className="px-3 py-2 text-xs text-gray-500">Date (Label)</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time-1</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time-2</th>
              <th className="px-3 py-2 text-xs text-gray-500">Duty In</th>
              <th className="px-3 py-2 text-xs text-gray-500">Duty Out</th>
              <th className="px-3 py-2 text-xs text-gray-500">Duty Timings</th>
              <th className="px-3 py-2 text-xs text-gray-500">Actual Performed</th>
              <th className="px-3 py-2 text-xs text-gray-500">Performed Status</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time In Late</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time In Status</th>
              <th className="px-3 py-2 text-xs text-gray-500">Single Mark</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time Out Early/Late</th>
              <th className="px-3 py-2 text-xs text-gray-500">Time Out Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={`${r.employeeId}-${r.date}-${i}`} className="border-t">
                <td className="px-3 py-2 text-sm">{r.employeeId}</td>
                <td className="px-3 py-2 text-sm">{r.biometricId || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.cnic || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.name}</td>
                <td className="px-3 py-2 text-sm">{r.designation || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.actualCostCenter || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.biometricCostCenter || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.date}</td>
                <td className="px-3 py-2 text-sm">{r.dateLabel}</td>
                <td className="px-3 py-2 text-sm">{r.time1}</td>
                <td className="px-3 py-2 text-sm">{r.time2}</td>
                <td className="px-3 py-2 text-sm">{r.dutyIn}</td>
                <td className="px-3 py-2 text-sm">{r.dutyOut}</td>
                <td className="px-3 py-2 text-sm">{r.dutyTimings}</td>
                <td className="px-3 py-2 text-sm">{r.actualPerformed}</td>
                <td className="px-3 py-2 text-sm">{r.performedStatus}</td>
                <td className="px-3 py-2 text-sm">{r.timeInLate}</td>
                <td className="px-3 py-2 text-sm">{r.timeInStatus}</td>
                <td className="px-3 py-2 text-sm">{r.singleMark ? 'Yes' : ''}</td>
                <td className="px-3 py-2 text-sm">{r.timeOutEarlyLate}</td>
                <td className="px-3 py-2 text-sm">{r.timeOutStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationRosterPage;
