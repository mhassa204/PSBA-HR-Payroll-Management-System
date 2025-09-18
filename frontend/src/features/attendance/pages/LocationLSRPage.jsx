import React, { useEffect, useMemo, useState } from 'react';
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
  const [filters, setFilters] = useState({ name:'', designation:'', cnic:'', account:'', remarks:'' });

  // keep month in URL
  useEffect(()=>{
    const np = new URLSearchParams(searchParams);
    if (np.get('month') !== monthParam) { np.set('month', monthParam); setSearchParams(np, { replace: true }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam]);

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
    return list.map(r => ({
      Sr: r.sr,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading LSR..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Leave Status Report - {data.location?.name}</h1>
          <p className="text-sm text-gray-600">Cycle: {data.cycle.start} to {data.cycle.end}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={monthParam} onChange={(e)=>{
            const v = e.target.value; setSelYear(parseInt(v.slice(0,4),10)); setSelMonth(parseInt(v.slice(5,7),10)-1);
          }}>
            {monthOptions.map((o,i)=>(<option key={i} value={o.param}>{o.label}</option>))}
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

      <div className="mb-2 text-center">
        <h2 className="text-base font-semibold">{titleText}</h2>
      </div>

      <div className="bg-white rounded shadow p-3 mb-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Name" value={filters.name} onChange={e=>setFilters(f=>({...f,name:e.target.value}))} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Designation" value={filters.designation} onChange={e=>setFilters(f=>({...f,designation:e.target.value}))} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="CNIC" value={filters.cnic} onChange={e=>setFilters(f=>({...f,cnic:e.target.value}))} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Account #" value={filters.account} onChange={e=>setFilters(f=>({...f,account:e.target.value}))} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Remarks" value={filters.remarks} onChange={e=>setFilters(f=>({...f,remarks:e.target.value}))} />
      </div>

      <div className="overflow-auto bg-white rounded shadow">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2">Sr.</th>
              <th className="px-3 py-2">Bazaar</th>
              <th className="px-3 py-2">Employee Name</th>
              <th className="px-3 py-2">Designation</th>
              <th className="px-3 py-2">CNIC</th>
              <th className="px-3 py-2">Acct Holder</th>
              <th className="px-3 py-2">Branch Code</th>
              <th className="px-3 py-2">Account #</th>
              <th className="px-3 py-2">Total Working Days</th>
              <th className="px-3 py-2">Present</th>
              <th className="px-3 py-2">Absents</th>
              <th className="px-3 py-2">Holidays (Weekly Off)</th>
              <th className="px-3 py-2 w-48">Weekly Off Dates</th>
              <th className="px-3 py-2 w-48">Full Day Leaves (Approved)</th>
              <th className="px-3 py-2 w-48">Approved Leave Dates</th>
              <th className="px-3 py-2">Unapproved Leaves</th>
              <th className="px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(r => (
              <tr key={r.employeeId} className="border-t">
                <td className="px-3 py-2">{r.sr}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.bazaarName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.designation || ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.cnic || ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.bank?.accountHolderName || ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.bank?.branchCode || ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.bank?.accountNumber || ''}</td>
                <td className="px-3 py-2 text-center">{r.totals?.workingDays ?? ''}</td>
                <td className="px-3 py-2 text-center text-green-700 font-semibold">{r.totals?.presentDays ?? ''}</td>
                <td className="px-3 py-2 text-center text-red-600 font-semibold">{r.totals?.absents ?? ''}</td>
                <td className="px-3 py-2 text-center">{r.totals?.holidays ?? ''}</td>
                <td className="px-3 py-2 align-top text-[11px]">
                  <div className="max-h-32 overflow-y-auto pr-1 custom-thin-scroll space-y-1 min-w-[180px]">
                    {weeklyOffList(r).length ? weeklyOffList(r).map(d => <div key={d} className="leading-snug whitespace-nowrap">{d}</div>) : <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{r.totals?.fullDayLeaves ?? ''}</td>
                <td className="px-3 py-2 align-top text-[11px]">
                  <div className="max-h-32 overflow-y-auto pr-1 custom-thin-scroll space-y-1 min-w-[180px]">
                    {approvedLeaveList(r).length ? approvedLeaveList(r).map(d => <div key={d} className="leading-snug whitespace-nowrap">{d}</div>) : <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{r.totals?.unapprovedLeaves ?? ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.remarks || ''}</td>
              </tr>
            ))}
            {filteredRows.length===0 && (
              <tr><td colSpan={17} className="px-3 py-6 text-center text-gray-500">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationLSRPage;
