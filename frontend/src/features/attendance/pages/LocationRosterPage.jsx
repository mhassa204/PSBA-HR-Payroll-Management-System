import React, { useEffect, useMemo, useState, useRef } from 'react';
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

  const exportRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(()=>{ if(!exportOpen) return; const handler=(e)=>{ if(exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); }; document.addEventListener('mousedown', handler); return ()=>document.removeEventListener('mousedown', handler); },[exportOpen]);
  useEffect(()=>{ const key=(e)=>{ if(e.key==='Escape') setExportOpen(false); }; window.addEventListener('keydown', key); return ()=>window.removeEventListener('keydown', key); },[]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading attendance..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[97vw] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">Attendance vs Duty Roster - {data.location?.name}</h1>
          <p className="text-xs text-gray-500">{data.range.start} to {data.range.end}</p>
        </div>
        <div className="actions-inline">
          <select className="form-input dense-input !w-auto text-xs" value={`${selYear}-${selMonth}`} onChange={(e)=>{ const [y,m]=e.target.value.split('-').map(n=>parseInt(n,10)); setSelYear(y); setSelMonth(m); }}>
            {monthOptions.map((opt,idx)=>(<option key={idx} value={`${opt.value.y}-${opt.value.m}`}>{opt.label}</option>))}
          </select>
          <div className="relative" ref={exportRef}>
            <button type="button" className="btn btn-secondary text-xs" onClick={()=>setExportOpen(o=>!o)}>Export ▾</button>
            {exportOpen && (
              <div className="menu-surface absolute right-0 mt-1 z-30 flex flex-col" role="menu">
                <button className="menu-item" onClick={()=>{handleExport('csv', true); setExportOpen(false);}}>Filtered CSV</button>
                <button className="menu-item" onClick={()=>{handleExport('xlsx', true); setExportOpen(false);}}>Filtered Excel</button>
                <div className="h-px my-1 bg-gray-200" />
                <button className="menu-item" onClick={()=>{handleExport('csv', false); setExportOpen(false);}}>All CSV</button>
                <button className="menu-item" onClick={()=>{handleExport('xlsx', false); setExportOpen(false);}}>All Excel</button>
              </div>
            )}
          </div>
          <Link to={`/attendance/locations/${id}`} className="btn btn-outline text-xs">Back</Link>
        </div>
      </div>

      <div className="report-title-bar">{titleText}</div>

      <div className="card-soft p-4 space-y-3">
        <div className="filter-panel compact">
          <input className="form-input" placeholder="Biometric ID" value={fBiometricId} onChange={e=>setFBiometricId(e.target.value)} />
          <input className="form-input" placeholder="CNIC No." value={fCnic} onChange={e=>setFCnic(e.target.value)} />
          <input className="form-input" placeholder="Name" value={fName} onChange={e=>setFName(e.target.value)} />
          <input className="form-input" placeholder="Designation" value={fDesignation} onChange={e=>setFDesignation(e.target.value)} />
          <input className="form-input" placeholder="Actual Cost Center" value={fActualCC} onChange={e=>setFActualCC(e.target.value)} />
          <input className="form-input" placeholder="Biometric Cost Center" value={fBioCC} onChange={e=>setFBioCC(e.target.value)} />
          <input className="form-input" placeholder="Date (YYYY-MM-DD)" value={fDate} onChange={e=>setFDate(e.target.value)} />
          <input className="form-input" placeholder="Performed Status" value={fPerformedStatus} onChange={e=>setFPerformedStatus(e.target.value)} />
          <input className="form-input" placeholder="Time In Status" value={fTimeInStatus} onChange={e=>setFTimeInStatus(e.target.value)} />
          <select className="form-input" value={fSingleMark} onChange={e=>setFSingleMark(e.target.value)}>
            <option value="">Single Mark (Any)</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          <input className="form-input" placeholder="Time Out Status" value={fTimeOutStatus} onChange={e=>setFTimeOutStatus(e.target.value)} />
        </div>
      </div>

      <div className="table-shell card-soft p-0 custom-thin-scroll table-fixed-viewport">
        <table className="table-enhanced table-no-wrap" style={{ tableLayout:'auto', minWidth:'100%' }}>
          <thead>
            <tr>
              <th>Employ ID</th>
              <th>Biometric ID</th>
              <th>CNIC No.</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Actual Cost Center</th>
              <th>Biometric Cost Center</th>
              <th>Date</th>
              <th>Date (Label)</th>
              <th>Time-1</th>
              <th>Time-2</th>
              <th>Duty In</th>
              <th>Duty Out</th>
              <th>Duty Timings</th>
              <th>Actual Performed</th>
              <th>Performed Status</th>
              <th>Time In Late</th>
              <th>Time In Status</th>
              <th>Single Mark</th>
              <th>Time Out Early/Late</th>
              <th>Time Out Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r,i)=>(
              <tr key={`${r.employeeId}-${r.date}-${i}`}>
                <td>{r.employeeId}</td>
                <td>{r.biometricId || '-'}</td>
                <td>{r.cnic || '-'}</td>
                <td>{r.name}</td>
                <td>{r.designation || '-'}</td>
                <td>{r.actualCostCenter || '-'}</td>
                <td>{r.biometricCostCenter || '-'}</td>
                <td>{r.date}</td>
                <td>{r.dateLabel}</td>
                <td>{r.time1}</td>
                <td>{r.time2}</td>
                <td>{r.dutyIn}</td>
                <td>{r.dutyOut}</td>
                <td>{r.dutyTimings}</td>
                <td>{r.actualPerformed}</td>
                <td>{r.performedStatus}</td>
                <td>{r.timeInLate}</td>
                <td>{r.timeInStatus}</td>
                <td>{r.singleMark ? 'Yes' : ''}</td>
                <td>{r.timeOutEarlyLate}</td>
                <td>{r.timeOutStatus}</td>
              </tr>
            ))}
            {!filteredRows.length && <tr><td colSpan={21} className="text-center py-6 text-gray-500 text-xs">No records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationRosterPage;
