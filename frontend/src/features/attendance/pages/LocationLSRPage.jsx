import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toastBus } from '../../../utils/toastBus';
import PayrollRangeControl, { getDefaultPayrollRange, getPayrollRangeForMonth } from '../components/PayrollRangeControl';
import ExportMenu from '../components/ExportMenu';

const LocationLSRPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  // default period: legacy ?month=YYYY-MM links (cycle END month) are
  // converted to start/end; otherwise use the current payroll cycle
  useEffect(() => {
    if (start && end) return;
    const legacyMonth = searchParams.get('month');
    let def;
    if (legacyMonth && /^\d{4}-\d{2}$/.test(legacyMonth)) {
      const y = parseInt(legacyMonth.slice(0, 4), 10);
      const endM0 = parseInt(legacyMonth.slice(5, 7), 10) - 1;
      def = endM0 === 0 ? getPayrollRangeForMonth(y - 1, 11) : getPayrollRangeForMonth(y, endM0 - 1);
    } else {
      def = getDefaultPayrollRange();
    }
    const np = new URLSearchParams(searchParams);
    np.delete('month');
    np.set('start', def.start); np.set('end', def.end);
    setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => ({
    name: searchParams.get('fname') || '',
    designation: searchParams.get('fdesig') || '',
    cnic: searchParams.get('fcnic') || '',
    account: searchParams.get('facct') || '',
    remarks: searchParams.get('frem') || '',
  }));
  // keep filters in URL (parity with FMO/Roster pages)
  useEffect(()=>{
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fname', filters.name);
    setOrDelete('fdesig', filters.designation);
    setOrDelete('fcnic', filters.cnic);
    setOrDelete('facct', filters.account);
    setOrDelete('frem', filters.remarks);
    if (np.toString() !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Load data when the date range changes
  useEffect(()=>{
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/attendance/locations/${id}/lsr`, { params: { start, end } });
        setData(data);
      } catch (e) {
        toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load LSR' });
      } finally { setLoading(false); }
    };
    if (start && end) load();
  }, [id, start, end]);

  const rows = data?.employees || [];

  const filteredRows = rows.filter(r => {
    const inc = (v,f) => String(v||'').toLowerCase().includes(String(f||'').toLowerCase());
    return inc(r.name, filters.name) && inc(r.designation, filters.designation) && inc(r.cnic, filters.cnic) && inc(r.bank?.accountNumber, filters.account) && inc(r.remarks, filters.remarks);
  });

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

  const EXPORT_COLUMNS = ['Sr','BazaarName','EmployeeName','Designation','CNIC','AccountHolderName','BranchCode','AccountNumber','TotalWorkingDays','PresentDays','Absents','HolidaysWeeklyOff','WeeklyOffDates','FullDayLeavesApproved','ApprovedLeaveDates','UnapprovedLeaves','Remarks'];

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
            getRows={(scope) => mapRowsForExport(scope === 'filtered' ? filteredRows : rows)}
            filenameBase={`LSR_${data?.location?.name || 'Location'}_${data?.cycle?.start}_${data?.cycle?.end}`}
            sheetName="LSR"
            title={titleText}
            counts={{ filtered: filteredRows.length, all: rows.length }}
          />
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
