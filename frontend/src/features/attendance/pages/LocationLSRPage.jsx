import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { exportToCSV, exportToExcel } from '../../../lib/exportUtils';
import { toastBus } from '../../../utils/toastBus';

function getDefaultCycleMonth() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // We treat selected month as cycle END month (ending 20th). If date > 20 use current month as end month else previous.
  if (utc.getUTCDate() > 20) return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() }; // 0-based
  const prev = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth()-1, 1));
  return { year: prev.getUTCFullYear(), month: prev.getUTCMonth() };
}

function toMonthParam(year, month0) { // month0 0-based
  return `${year}-${String(month0+1).padStart(2,'0')}`;
}

const LocationLSRPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMonthParam = searchParams.get('month');
  const def = getDefaultCycleMonth();
  const [selYear, setSelYear] = useState(initialMonthParam ? parseInt(initialMonthParam.slice(0,4),10) : def.year);
  const [selMonth, setSelMonth] = useState(initialMonthParam ? (parseInt(initialMonthParam.slice(5,7),10)-1) : def.month); // 0-based

  const monthParam = useMemo(()=> toMonthParam(selYear, selMonth), [selYear, selMonth]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => ({
    name: searchParams.get('fname') || '',
    designation: searchParams.get('fdesig') || '',
    cnic: searchParams.get('fcnic') || '',
    account: searchParams.get('facct') || '',
    remarks: searchParams.get('frem') || '',
  }));
  const exportRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);

  // keep month + filters in URL (parity with FMO/Roster pages)
  useEffect(()=>{
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    if (np.get('month') !== monthParam) np.set('month', monthParam);
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fname', filters.name);
    setOrDelete('fdesig', filters.designation);
    setOrDelete('fcnic', filters.cnic);
    setOrDelete('facct', filters.account);
    setOrDelete('frem', filters.remarks);
    if (np.toString() !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam, filters]);

  // Load data when month changes
  useEffect(()=>{
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/attendance/locations/${id}/lsr`, { params: { month: monthParam } });
        setData(data);
      } catch (e) {
        toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load LSR' });
      } finally { setLoading(false); }
    };
    if (monthParam) load();
  }, [id, monthParam]);

  const rows = data?.employees || [];

  const filteredRows = rows.filter(r => {
    const inc = (v,f) => String(v||'').toLowerCase().includes(String(f||'').toLowerCase());
    return inc(r.name, filters.name) && inc(r.designation, filters.designation) && inc(r.cnic, filters.cnic) && inc(r.bank?.accountNumber, filters.account) && inc(r.remarks, filters.remarks);
  });

  // Month dropdown: past 18 and future 12 cycle end months anchored to today's cycle end month (not the selected month)
  const monthOptions = useMemo(()=>{
    const PAST_MONTHS = 18; // months back (including anchor counts as 0 offset separately)
    const FUTURE_MONTHS = 12; // months ahead
    const anchor = getDefaultCycleMonth();
    const anchorDate = new Date(Date.UTC(anchor.year, anchor.month, 1));
    const list = [];
    // Build future months first (so latest/future appear on top), then anchor, then past
    for (let f=FUTURE_MONTHS; f>0; f--) {
      const d = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()+f, 1));
      const label = d.toLocaleString('en-US',{ month:'long', year:'numeric', timeZone:'UTC' });
      list.push({ label, param: toMonthParam(d.getUTCFullYear(), d.getUTCMonth()), y: d.getUTCFullYear(), m: d.getUTCMonth() });
    }
    // Anchor month
    list.push({ label: anchorDate.toLocaleString('en-US',{ month:'long', year:'numeric', timeZone:'UTC' }), param: toMonthParam(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()), y: anchorDate.getUTCFullYear(), m: anchorDate.getUTCMonth() });
    // Past months
    for (let p=1; p<=PAST_MONTHS; p++) {
      const d = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()-p, 1));
      const label = d.toLocaleString('en-US',{ month:'long', year:'numeric', timeZone:'UTC' });
      list.push({ label, param: toMonthParam(d.getUTCFullYear(), d.getUTCMonth()), y: d.getUTCFullYear(), m: d.getUTCMonth() });
    }
    // Ensure currently selected (if outside range) is included
    if (!list.some(o => o.param === monthParam)) {
      const selDate = new Date(Date.UTC(selYear, selMonth, 1));
      list.unshift({ label: selDate.toLocaleString('en-US',{ month:'long', year:'numeric', timeZone:'UTC' }), param: monthParam, y: selYear, m: selMonth });
    }
    return list;
  }, [monthParam, selYear, selMonth]);

  const titleText = `Leave Status Report (LSR) - ${data?.location?.name || ''} - ${data?.cycle?.label || ''} (${data?.cycle?.start} to ${data?.cycle?.end})`;

  function formatWeeklyOffDisplay(r) {
    return r.weeklyOffDisplay || r.weeklyOffDates?.join(' ') || '';
  }

  function formatApprovedLeaveDisplay(r) {
    return r.approvedLeaveDisplay || r.approvedFullDayLeaveDates?.join(',') || '';
  }

  // Helpers for scrollable date lists
  function fmtYMDtoDMY(ymd){
    if(!ymd) return '';
    // ymd expected YYYY-MM-DD
    if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(ymd)){
      const y=ymd.slice(0,4); const m=ymd.slice(5,7); const d=ymd.slice(8,10);
      return `${d}-${m}-${y}`;
    }
    // fallback already d-m-y
    return ymd;
  }
  function weeklyOffList(r){ return (r.weeklyOffDates||[]).map(fmtYMDtoDMY); }
  function approvedLeaveList(r){ return (r.approvedFullDayLeaveDates||[]).map(fmtYMDtoDMY); }

  // Export mapping similar to sample columns
  function mapRowsForExport(list) {
    return list.map((r,i) => ({
      Sr: r.sr ?? (i+1),
      BazaarName: r.bazaarName,
      EmployeeName: r.name,
      Designation: r.designation || '',
      CNIC: r.cnic || '',
      AccountHolderName: r.bank?.accountHolderName || '',
      BranchCode: r.bank?.branchCode || '',
      AccountNumber: r.bank?.accountNumber || '',
      TotalWorkingDays: r.totals?.workingDays ?? '',
      PresentDays: r.totals?.presentDays ?? '',
      Absents: r.totals?.absents ?? '',
      HolidaysWeeklyOff: r.totals?.holidays ?? '',
      WeeklyOffDates: formatWeeklyOffDisplay(r),
      FullDayLeavesApproved: r.totals?.fullDayLeaves ?? '',
      ApprovedLeaveDates: formatApprovedLeaveDisplay(r),
      UnapprovedLeaves: r.totals?.unapprovedLeaves ?? '',
      Remarks: r.remarks || ''
    }));
  }

  function handleExport(type, filtered) {
    const src = filtered ? filteredRows : rows;
    if (!src.length) return;
    const payload = mapRowsForExport(src);
    const headers = ['Sr','BazaarName','EmployeeName','Designation','CNIC','AccountHolderName','BranchCode','AccountNumber','TotalWorkingDays','PresentDays','Absents','HolidaysWeeklyOff','WeeklyOffDates','FullDayLeavesApproved','ApprovedLeaveDates','UnapprovedLeaves','Remarks'];
    const filename = `LSR_${data?.location?.name || 'Location'}_${data?.cycle?.start}_${data?.cycle?.end}.${type==='csv'?'csv':'xlsx'}`;
    if (type==='csv') exportToCSV(filename, payload, headers, titleText);
    else exportToExcel(filename, payload, 'LSR', headers, titleText);
    toastBus.emit({ type: 'success', message: `Exported ${src.length} ${filtered?'filtered':'all'} rows to ${type.toUpperCase()}` });
  }

  useEffect(()=>{ if(!exportOpen) return; const handler=(e)=>{ if(exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); }; document.addEventListener('mousedown', handler); return ()=>document.removeEventListener('mousedown', handler); },[exportOpen]);
  useEffect(()=>{ const key=(e)=>{ if(e.key==='Escape') setExportOpen(false); }; window.addEventListener('keydown', key); return ()=>window.removeEventListener('keydown', key); },[]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading LSR..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[97vw] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">Leave Status Report - {data.location?.name}</h1>
          <p className="text-xs text-gray-500">Cycle: {data.cycle.start} to {data.cycle.end}</p>
        </div>
        <div className="actions-inline">
          <select className="form-input dense-input !w-auto text-xs" value={monthParam} onChange={(e)=>{ const v=e.target.value; setSelYear(parseInt(v.slice(0,4),10)); setSelMonth(parseInt(v.slice(5,7),10)-1); }}>
            {monthOptions.map((o,i)=>(<option key={i} value={o.param}>{o.label}</option>))}
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
          <input className="form-input" placeholder="Name" value={filters.name} onChange={e=>setFilters(f=>({...f,name:e.target.value}))} />
          <input className="form-input" placeholder="Designation" value={filters.designation} onChange={e=>setFilters(f=>({...f,designation:e.target.value}))} />
          <input className="form-input" placeholder="CNIC" value={filters.cnic} onChange={e=>setFilters(f=>({...f,cnic:e.target.value}))} />
          <input className="form-input" placeholder="Account #" value={filters.account} onChange={e=>setFilters(f=>({...f,account:e.target.value}))} />
          <input className="form-input" placeholder="Remarks" value={filters.remarks} onChange={e=>setFilters(f=>({...f,remarks:e.target.value}))} />
        </div>
      </div>

      <div className="table-shell card-soft p-0 overflow-auto custom-thin-scroll table-fixed-viewport">
        <table className="table-enhanced table-no-wrap text-[11px]" style={{ tableLayout:'auto', minWidth:'100%' }}>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Bazaar</th>
              <th>Employee Name</th>
              <th>Designation</th>
              <th>CNIC</th>
              <th>Acct Holder</th>
              <th>Branch Code</th>
              <th>Account #</th>
              <th>Total Working Days</th>
              <th>Present</th>
              <th>Absents</th>
              <th>Holidays (Weekly Off)</th>
              <th>Weekly Off Dates</th>
              <th>Full Day Leaves (Approved)</th>
              <th>Approved Leave Dates</th>
              <th>Unapproved Leaves</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r,i) => (
              <tr key={r.employeeId}>
                <td>{r.sr ?? (i+1)}</td>
                <td className="whitespace-nowrap text-left">{r.bazaarName}</td>
                <td className="whitespace-nowrap text-left">{r.name}</td>
                <td className="whitespace-nowrap text-left">{r.designation || ''}</td>
                <td className="whitespace-nowrap text-left">{r.cnic || ''}</td>
                <td className="whitespace-nowrap text-left">{r.bank?.accountHolderName || ''}</td>
                <td className="whitespace-nowrap text-left">{r.bank?.branchCode || ''}</td>
                <td className="whitespace-nowrap text-left">{r.bank?.accountNumber || ''}</td>
                <td className="text-center">{r.totals?.workingDays ?? ''}</td>
                <td className="text-center"><span className="badge badge-green !rounded !px-2 !py-1 inline-block w-full text-center">{r.totals?.presentDays ?? ''}</span></td>
                <td className="text-center"><span className="badge badge-red !rounded !px-2 !py-1 inline-block w-full text-center">{r.totals?.absents ?? ''}</span></td>
                <td className="text-center">{r.totals?.holidays ?? ''}</td>
                <td className="align-top">
                  <div className="max-h-28 overflow-y-auto px-1 custom-thin-scroll space-y-1 text-center">
                    {weeklyOffList(r).length ? weeklyOffList(r).map(d => <div key={d} className="leading-snug whitespace-nowrap">{d}</div>) : <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="text-center">{r.totals?.fullDayLeaves ?? ''}</td>
                <td className="align-top">
                  <div className="max-h-28 overflow-y-auto px-1 custom-thin-scroll space-y-1 text-center">
                    {approvedLeaveList(r).length ? approvedLeaveList(r).map(d => <div key={d} className="leading-snug whitespace-nowrap">{d}</div>) : <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="text-center">{r.totals?.unapprovedLeaves ?? ''}</td>
                <td className="whitespace-nowrap text-left">{r.remarks || ''}</td>
              </tr>
            ))}
            {!filteredRows.length && <tr><td colSpan={17} className="text-center py-6 text-gray-500 text-xs">No records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationLSRPage;
