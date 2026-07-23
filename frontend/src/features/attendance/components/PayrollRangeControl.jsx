import React, { useEffect, useMemo, useRef, useState } from 'react';

// Payroll cycle helpers (21st of month -> 20th of next month)
export function getPayrollRangeForMonth(year, month0 /* 0-based start month */) {
  const s = new Date(Date.UTC(year, month0, 21));
  const e = new Date(Date.UTC(year, month0 + 1, 20));
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
}

export function getDefaultPayrollMonth() {
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (t.getUTCDate() >= 21) return { year: t.getUTCFullYear(), month: t.getUTCMonth() };
  const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export function getDefaultPayrollRange() {
  const { year, month } = getDefaultPayrollMonth();
  return getPayrollRangeForMonth(year, month);
}

function fmtShort(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

// Period selector shared by attendance submodule screens: payroll cycle
// dropdown plus ALWAYS-VISIBLE custom start/end date pickers with Apply —
// pick a cycle for the standard 21st→20th window, or type any two dates.
const PayrollRangeControl = ({ start, end, onChange }) => {
  const [draftStart, setDraftStart] = useState(start || '');
  const [draftEnd, setDraftEnd] = useState(end || '');
  useEffect(() => { setDraftStart(start || ''); setDraftEnd(end || ''); }, [start, end]);

  const options = useMemo(() => {
    const list = [];
    const now = new Date();
    // 2 future cycles, then back 22 months
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
    for (let i = 0; i < 24; i++) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const r = getPayrollRangeForMonth(y, m);
      list.push({
        value: `${y}-${m}`,
        label: `${d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} (${fmtShort(r.start)} – ${fmtShort(r.end)})`,
        start: r.start,
        end: r.end,
      });
    }
    return list;
  }, []);

  const matched = options.find((o) => o.start === start && o.end === end);
  const dirty = draftStart !== (start || '') || draftEnd !== (end || '');
  const invalid = !draftStart || !draftEnd || draftStart > draftEnd;
  const startRef = useRef(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="form-input dense-input !w-auto text-xs"
        value={matched ? matched.value : 'custom'}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'custom') {
            // Send the user straight to the start-date picker
            const el = startRef.current;
            if (el) { el.focus(); if (typeof el.showPicker === 'function') { try { el.showPicker(); } catch { /* needs user gesture in some browsers */ } } }
            return;
          }
          const opt = options.find((o) => o.value === v);
          if (opt) onChange({ start: opt.start, end: opt.end });
        }}
      >
        <option value="custom">Custom range…</option>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <input
        ref={startRef}
        type="date"
        className="form-input dense-input !w-auto text-xs"
        title="Custom range: start date"
        value={draftStart}
        max={draftEnd || undefined}
        onChange={(e) => setDraftStart(e.target.value)}
      />
      <span className="text-xs text-gray-500">to</span>
      <input
        type="date"
        className="form-input dense-input !w-auto text-xs"
        title="Custom range: end date"
        value={draftEnd}
        min={draftStart || undefined}
        onChange={(e) => setDraftEnd(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-secondary text-xs"
        disabled={invalid || !dirty}
        title={invalid ? 'Pick a valid start and end date' : 'Apply the custom date range'}
        onClick={() => onChange({ start: draftStart, end: draftEnd })}
      >
        Apply
      </button>
    </div>
  );
};

export default PayrollRangeControl;
