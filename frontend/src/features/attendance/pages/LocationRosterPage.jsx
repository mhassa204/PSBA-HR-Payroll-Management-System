import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import PayrollRangeControl, { getDefaultPayrollRange } from '../components/PayrollRangeControl';
import ExportMenu from '../components/ExportMenu';

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
  const [fSource, setFSource] = useState(() => searchParams.get('fsrc') || ''); // '', 'ROSTER', 'HQ_DEFAULT'

  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  // default period: current payroll cycle (only when URL has no range yet)
  useEffect(() => {
    if (start && end) return;
    const def = getDefaultPayrollRange();
    const np = new URLSearchParams(searchParams);
    np.set('start', def.start); np.set('end', def.end);
    setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

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
    setOrDelete('fsrc', fSource);
    const after = np.toString();
    if (after !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fBiometricId, fCnic, fName, fDesignation, fActualCC, fBioCC, fDate, fPerformedStatus, fTimeInStatus, fSingleMark, fTimeOutStatus, fSource]);

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
      inc(r.timeOutStatus, fTimeOutStatus) &&
      (fSource === '' || r.scheduleSource === fSource)
    );
  }, [rows, fBiometricId, fCnic, fName, fDesignation, fActualCC, fBioCC, fDate, fPerformedStatus, fTimeInStatus, fSingleMark, fTimeOutStatus, fSource]);

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
      'Check In': r.time1 ?? '',
      'Check Out': r.time2 ?? '',
      DutyIn: r.dutyIn ?? '',
      DutyOut: r.dutyOut ?? '',
      DutyTimings: r.dutyTimings ?? '',
      Source: r.scheduleSource === 'HQ_DEFAULT' ? 'HQ Default' : r.scheduleSource === 'ROSTER' ? 'Roster' : '',
      ActualPerformed: r.actualPerformed ?? '',
      PerformedStatus: r.performedStatus ?? '',
      TimeInLate: r.timeInLate ?? '',
      TimeInStatus: r.timeInStatus ?? '',
      SingleMark: r.singleMark ? 'Yes' : '',
      TimeOutEarlyLate: r.timeOutEarlyLate ?? '',
      TimeOutStatus: r.timeOutStatus ?? ''
    }));
  };

  const EXPORT_COLUMNS = [
    'EmployeeID','BiometricID','CNIC','Name','Designation','ActualCostCenter','BiometricCostCenter','Date','DateLabel','Check In','Check Out','DutyIn','DutyOut','DutyTimings','Source','ActualPerformed','PerformedStatus','TimeInLate','TimeInStatus','SingleMark','TimeOutEarlyLate','TimeOutStatus'
  ];

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
            getRows={(scope) => mapRosterForExport(scope === 'filtered' ? filteredRows : rows)}
            filenameBase={`Roster_${data?.location?.name || 'Location'}_${data?.range?.start}_to_${data?.range?.end}`}
            sheetName="Roster"
            title={titleText}
            counts={{ filtered: filteredRows.length, all: rows.length }}
          />
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
          <select className="form-input" value={fSource} onChange={e=>setFSource(e.target.value)}>
            <option value="">Schedule Source (Any)</option>
            <option value="ROSTER">Duty Roster</option>
            <option value="HQ_DEFAULT">HQ Default (09:15–17:00)</option>
          </select>
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
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duty In</th>
              <th>Duty Out</th>
              <th>Duty Timings</th>
              <th>Source</th>
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
                <td>
                  {r.scheduleSource === 'HQ_DEFAULT'
                    ? <span className="badge badge-gray">HQ Default</span>
                    : r.scheduleSource === 'ROSTER'
                      ? <span className="badge badge-blue">Roster</span>
                      : ''}
                </td>
                <td>{r.actualPerformed}</td>
                <td>{r.performedStatus}</td>
                <td>{r.timeInLate}</td>
                <td>{r.timeInStatus}</td>
                <td>{r.singleMark ? 'Yes' : ''}</td>
                <td>{r.timeOutEarlyLate}</td>
                <td>{r.timeOutStatus}</td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={22} className="text-center py-6 text-gray-500 text-xs">
                  {rows.length ? 'No records match the filters' : (
                    <>No schedule data for this period — no approved duty roster covers it.{' '}
                    <Link to="/rosters" className="text-primary underline">Manage duty rosters</Link></>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationRosterPage;
