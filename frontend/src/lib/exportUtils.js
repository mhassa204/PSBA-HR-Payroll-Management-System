import * as XLSX from 'xlsx';

function sanitizeFilename(name) {
  const fallback = 'export';
  if (!name || typeof name !== 'string') return fallback;
  return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || fallback;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportToCSV(filename, rows, headerOrder, title) {
  if (!rows || rows.length === 0) return;
  const headers = headerOrder && headerOrder.length ? headerOrder : Object.keys(rows[0]);
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [];
  if (title) {
    lines.push(escapeCSV(title));
    lines.push('');
  }
  lines.push(headers.map(escapeCSV).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => escapeCSV(row[h])).join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, sanitizeFilename(filename));
}

export function exportToExcel(filename, rows, sheetName = 'Sheet1', headerOrder, title) {
  if (!rows || rows.length === 0) return;
  const headers = headerOrder && headerOrder.length ? headerOrder : Object.keys(rows[0]);
  const normalized = rows.map(r => {
    const o = {};
    headers.forEach(h => { o[h] = r[h]; });
    return o;
  });
  // Start with empty sheet to allow adding title and then data below
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);
  if (title) {
    // Set title in A1
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: { r: 0, c: 0 } });
    // Merge A1 across columns count
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, headers.length - 1) } });
  }
  // Add JSON (with header) starting at row index 2 if title exists, else 0
  const originRow = title ? 2 : 0;
  XLSX.utils.sheet_add_json(ws, normalized, { header: headers, origin: { r: originRow, c: 0 } });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, sanitizeFilename(filename));
}

export { sanitizeFilename };
