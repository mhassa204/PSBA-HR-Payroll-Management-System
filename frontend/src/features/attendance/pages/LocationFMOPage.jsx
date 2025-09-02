import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from '../../../lib/axios';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { exportToCSV, exportToExcel } from '../../../lib/exportUtils';
import { toastBus } from '../../../utils/toastBus';

function getPayrollRangeForMonth(year, month /* 0-based */) {
  // cycle: 21st of given month to 20th of next month
  const start = new Date(Date.UTC(year, month, 21));
  const end = new Date(Date.UTC(year, month + 1, 20));
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
}
function getDefaultPayrollMonth() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // if today >= 21, current month cycle; else previous month cycle
  if (utcNow.getUTCDate() >= 21) return { year: utcNow.getUTCFullYear(), month: utcNow.getUTCMonth() };
  // previous month
  const d = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth()-1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

const LocationFMOPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // filters (initialize from URL)
  const [fBiometricId, setFBiometricId] = useState(() => searchParams.get('fbio') || '');
  const [fCnic, setFCnic] = useState(() => searchParams.get('fcnic') || '');
  const [fName, setFName] = useState(() => searchParams.get('fname') || '');
  const [fDesignation, setFDesignation] = useState(() => searchParams.get('fdesig') || '');
  const [fCostCenter, setFCostCenter] = useState(() => searchParams.get('fcc') || '');

  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  // month selector state derives from start/end or default payroll month
  const initialMonth = useMemo(() => {
    if (start && end) {
      const d = new Date(start + 'T00:00:00Z');
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    }
    return getDefaultPayrollMonth();
  }, [start, end]);
  const [selYear, setSelYear] = useState(initialMonth.year);
  const [selMonth, setSelMonth] = useState(initialMonth.month); // 0-based

  // Sync month into URL only when changed
  useEffect(() => {
    const { start: s, end: e } = getPayrollRangeForMonth(selYear, selMonth);
    const np = new URLSearchParams(searchParams);
    let changed = false;
    if (np.get('start') !== s) { np.set('start', s); changed = true; }
    if (np.get('end') !== e) { np.set('end', e); changed = true; }
    if (changed) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMonth]);

  // keep filters in URL (only when changed)
  useEffect(() => {
    const np = new URLSearchParams(searchParams);
    const before = np.toString();
    const setOrDelete = (k, v) => { if (v && String(v).length) np.set(k, v); else np.delete(k); };
    setOrDelete('fbio', fBiometricId);
    setOrDelete('fcnic', fCnic);
    setOrDelete('fname', fName);
    setOrDelete('fdesig', fDesignation);
    setOrDelete('fcc', fCostCenter);
    const after = np.toString();
    if (after !== before) setSearchParams(np, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fBiometricId, fCnic, fName, fDesignation, fCostCenter]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/attendance/locations/${id}/fmo`, { params: { ...(start?{start}:{}) , ...(end?{end}:{}) } });
      setData(data);
    } catch (e) {
      // ignore detailed error UI for brevity
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if (start && end) load(); }, [id, start, end]);

  // derive days/rows safely for hooks below regardless of loading state
  const days = (data && data.days) ? data.days : [];
  const rows = (data && data.rows) ? data.rows : [];

  const filteredRows = useMemo(() => {
    const inc = (val, f) => (String(val || '').toLowerCase().includes(String(f || '').toLowerCase()));
    return rows.filter(r =>
      inc(r.biometricId, fBiometricId) &&
      inc(r.cnic, fCnic) &&
      inc(r.name, fName) &&
      inc(r.designation, fDesignation) &&
      inc(r.roleTag, fCostCenter)
    );
  }, [rows, fBiometricId, fCnic, fName, fDesignation, fCostCenter]);

  // build month options: show last 12 months including current
  const monthOptions = [];
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    monthOptions.push({ value: { y: d.getUTCFullYear(), m: d.getUTCMonth() }, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
  }

  // Export helpers
  const mapFmoForExport = (rowsForExport, daysForExport) => {
    // Flatten row into object with dynamic date columns and totals
    return rowsForExport.map(r => {
      const base = {
        SrNo: r.sr,
        BiometricID: r.biometricId || '',
        CNIC: r.cnic || '',
        Name: r.name || '',
        Designation: r.designation || '',
        CostCenter: r.roleTag || ''
      };
      daysForExport.forEach((d, idx) => {
        const colKey = `${d.dow} ${d.label}`; // align with headers
        base[colKey] = r.marks[idx] || '';
      });
      base.TotalDays = r.totals?.totalDays ?? '';
      base.Present = r.totals?.present ?? '';
      base.NotMark = r.totals?.notMark ?? '';
      base.Absent = r.totals?.absent ?? '';
      return base;
    });
  };

  const titleText = `Attendance FMO - ${data?.location?.name || ''} (${data?.range?.start} to ${data?.range?.end})`;

  const handleExport = (type, onlyFiltered) => {
    const rowsSrc = onlyFiltered ? filteredRows : rows;
    if (!rowsSrc?.length) return;
    const payload = mapFmoForExport(rowsSrc, days);
    const headers = [
      'SrNo','BiometricID','CNIC','Name','Designation','CostCenter',
      ...days.map(d=>`${d.dow} ${d.label}`),
      'TotalDays','Present','NotMark','Absent'
    ];
    const filename = `FMO_${data?.location?.name || 'Location'}_${data?.range?.start}_to_${data?.range?.end}.${type==='csv'?'csv':'xlsx'}`;
    if (type === 'csv') exportToCSV(filename, payload, headers, titleText);
    else exportToExcel(filename, payload, 'FMO', headers, titleText);
    const mode = onlyFiltered ? 'filtered' : 'all';
    toastBus.emit({ type: 'success', message: `Exported ${rowsSrc.length} ${mode} rows to ${type.toUpperCase()}.` });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading attendance..." /></div>;
  if (!data?.success) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Attendance FMO - {data.location?.name}</h1>
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
      <div className="bg-white rounded shadow p-3 mb-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Biometric ID" value={fBiometricId} onChange={e=>setFBiometricId(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="CNIC No." value={fCnic} onChange={e=>setFCnic(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Name" value={fName} onChange={e=>setFName(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Designation" value={fDesignation} onChange={e=>setFDesignation(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="Cost Center" value={fCostCenter} onChange={e=>setFCostCenter(e.target.value)} />
      </div>

      <div className="overflow-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-xs text-gray-500">Sr. No.</th>
              <th className="px-3 py-2 text-xs text-gray-500">Biometric ID</th>
              <th className="px-3 py-2 text-xs text-gray-500">CNIC No.</th>
              <th className="px-3 py-2 text-xs text-gray-500">Name</th>
              <th className="px-3 py-2 text-xs text-gray-500">Designation</th>
              <th className="px-3 py-2 text-xs text-gray-500">Cost Center</th>
              {days.map((d)=> (
                <th key={d.label} className="px-2 py-2 text-center text-[11px] text-gray-500">{d.dow} {d.label}</th>
              ))}
              <th className="px-3 py-2 text-xs text-gray-500">Total Days</th>
              <th className="px-3 py-2 text-xs text-gray-500">Present</th>
              <th className="px-3 py-2 text-xs text-gray-500">Not Mark</th>
              <th className="px-3 py-2 text-xs text-gray-500">Absent</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.sr} className="border-t">
                <td className="px-3 py-2 text-sm">{r.sr}</td>
                <td className="px-3 py-2 text-sm">{r.biometricId || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.cnic || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.name}</td>
                <td className="px-3 py-2 text-sm">{r.designation || '-'}</td>
                <td className="px-3 py-2 text-sm">{r.roleTag || '-'}</td>
                {r.marks.map((m, i) => (
                  <td key={i} className={`px-2 py-2 text-center text-xs font-semibold ${m==='P'?'text-green-600':'text-red-600'}`}>{m}</td>
                ))}
                <td className="px-3 py-2 text-sm">{r.totals.totalDays}</td>
                <td className="px-3 py-2 text-sm">{r.totals.present}</td>
                <td className="px-3 py-2 text-sm">{r.totals.notMark}</td>
                <td className="px-3 py-2 text-sm">{r.totals.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationFMOPage;
