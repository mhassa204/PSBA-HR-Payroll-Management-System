import React, { useEffect, useMemo, useRef, useState } from 'react';
import { exportToCSV, exportToExcel } from '../../../lib/exportUtils';
import { toastBus } from '../../../utils/toastBus';

// Shared export dropdown for attendance screens: pick rows (filtered/all),
// pick exactly which columns to include, export as Excel or CSV.
// columns: array of header keys (string) or { key, label } objects — `key` is
// the export header, `label` is what the picker shows.
// getRows(scope): returns rows keyed by column key for 'filtered' | 'all'.
// extraActions: optional [{ label, onClick }] page-specific exports (e.g.
// official multi-sheet formats) shown above the column picker.
const ExportMenu = ({ columns, getRows, filenameBase, sheetName = 'Sheet1', title, counts, extraActions }) => {
  const cols = useMemo(
    () => (columns || []).map((c) => (typeof c === 'string' ? { key: c, label: c.replace(/\n/g, ' ') } : { key: c.key, label: (c.label || c.key).replace(/\n/g, ' ') })),
    [columns]
  );
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('filtered');
  const [busy, setBusy] = useState(false);
  // Track DESELECTED keys so newly appearing columns (dynamic day columns)
  // default to selected.
  const [deselected, setDeselected] = useState(() => new Set());
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const selectedCols = cols.filter((c) => !deselected.has(c.key));
  const toggle = (key) => setDeselected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // getRows may be sync (rows already on the page) or async (fetched on
  // demand, e.g. the all-locations export).
  const doExport = async (type) => {
    if (busy) return;
    if (!selectedCols.length) {
      toastBus.emit({ type: 'info', message: 'Select at least one column to export.' });
      return;
    }
    let rows;
    try {
      setBusy(true);
      rows = (await getRows(scope)) || [];
    } catch (e) {
      toastBus.emit({ type: 'error', message: e?.response?.data?.error || 'Failed to load export data.' });
      return;
    } finally {
      setBusy(false);
    }
    if (!rows.length) {
      toastBus.emit({ type: 'info', message: 'Nothing to export for the current selection.' });
      return;
    }
    const headers = selectedCols.map((c) => c.key);
    const filename = `${filenameBase}.${type === 'csv' ? 'csv' : 'xlsx'}`;
    if (type === 'csv') exportToCSV(filename, rows, headers, title);
    else exportToExcel(filename, rows, sheetName, headers, title);
    toastBus.emit({ type: 'success', message: `Exported ${rows.length} ${scope} row(s) with ${headers.length} column(s) to ${type.toUpperCase()}.` });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn btn-secondary text-xs" onClick={() => setOpen((o) => !o)}>Export ▾</button>
      {open && (
        <div className="menu-surface absolute right-0 mt-1 z-30 w-72 p-3 space-y-3 text-xs" role="menu">
          {extraActions?.length ? (
            <div className="space-y-1">
              {extraActions.map((a, i) => (
                <button key={i} type="button" className="menu-item w-full text-left" onClick={() => { a.onClick(); setOpen(false); }}>{a.label}</button>
              ))}
              <div className="h-px bg-gray-200" />
            </div>
          ) : null}
          <div className="space-y-1">
            <div className="font-semibold text-gray-700">Rows</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="export-scope" checked={scope === 'filtered'} onChange={() => setScope('filtered')} />
              <span>Filtered rows{counts ? ` (${counts.filtered})` : ''}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="export-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
              <span>All rows{counts ? ` (${counts.all})` : ''}</span>
            </label>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Columns ({selectedCols.length}/{cols.length})</span>
              <span className="space-x-2">
                <button type="button" className="text-primary underline" onClick={() => setDeselected(new Set())}>All</button>
                <button type="button" className="text-primary underline" onClick={() => setDeselected(new Set(cols.map((c) => c.key)))}>None</button>
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto custom-thin-scroll border border-gray-200 rounded p-2 space-y-1">
              {cols.map((c) => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!deselected.has(c.key)} onChange={() => toggle(c.key)} />
                  <span className="truncate" title={c.label}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary text-xs flex-1" disabled={busy} onClick={() => doExport('xlsx')}>{busy ? 'Exporting…' : 'Excel'}</button>
            <button type="button" className="btn btn-outline text-xs flex-1" disabled={busy} onClick={() => doExport('csv')}>{busy ? 'Exporting…' : 'CSV'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
