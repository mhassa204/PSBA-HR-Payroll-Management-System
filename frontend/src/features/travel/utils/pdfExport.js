import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Helper: fetch a URL as ArrayBuffer (with credentials for session-authenticated servers)
async function fetchArrayBuffer(url){
  const res = await fetch(url, { credentials: 'include' });
  if(!res.ok) throw new Error('Failed to fetch: '+url);
  return await res.arrayBuffer();
}

// Replace unsupported characters with WinAnsi-safe equivalents
function safe(text){
  return String(text ?? '')
    .replace(/\u2192/g, '->') // →
    .replace(/\u2014/g, '-')   // —
    .replace(/\u2013/g, '-')   // –
    .replace(/\u2022/g, '*')   // •
    .replace(/\u00D7/g, 'x')   // ×
    .replace(/[\u2018\u2019]/g, "'") // ‘ ’
    .replace(/[\u201C\u201D]/g, '"'); // “ ”
}

// Helper: get absolute URL for document path
export function resolveDocUrl(p){
  if(!p) return null;
  const clean = p.replace(/^\\+|^\/+/, '');
  const baseApi = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/?$/, '');
  // Always proxy via API to ensure auth/cors and correct casing mapping
  return `${baseApi}/travel/expense-claims/document?path=${encodeURIComponent(clean)}`;
}

// Helper: fetch JSON with credentials
async function fetchJson(url){
  const res = await fetch(url, { credentials: 'include' });
  if(!res.ok) throw new Error('Failed to fetch: '+url);
  return res.json();
}

// Load full travel request by id to include attendees and status history
async function loadTravelRequestFull(id){
  if(!id) return null;
  const baseApi = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/?$/, '');
  try {
    const data = await fetchJson(`${baseApi}/travel/requests/${id}`);
    return data?.request || null;
  } catch { return null; }
}

// Renders multi-line text block
function drawMultilineText(page, text, x, y, font, size, maxWidth, lineHeight){
  const content = safe(text);
  const words = content.split(/\s+/);
  let line = '';
  let cursorY = y;
  for(const w of words){
    const test = line ? (line+' '+w) : w;
    const width = font.widthOfTextAtSize(test, size);
    if(width > maxWidth){
      if(line){ page.drawText(line, { x, y: cursorY, size, font }); cursorY -= lineHeight; }
      line = w;
    } else {
      line = test;
    }
  }
  if(line){ page.drawText(line, { x, y: cursorY, size, font }); cursorY -= lineHeight; }
  return cursorY;
}

// Add a section heading
function drawHeading(page, text, x, y, font, size){
  const t = safe(text);
  page.drawText(t, { x, y, size, font, color: rgb(0.2,0.2,0.2) });
  page.drawLine({ start: { x, y: y-2 }, end: { x: x+500, y: y-2 }, thickness: 0.5, color: rgb(0.7,0.7,0.7) });
}

// Convert a claim object (as used in ManageExpenseClaimApprovals modal) to PDF with embedded documents
export async function exportClaimToPdf(claim){
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (points)
  const margin = 40;
  let y = page.getSize().height - margin;

  const writeKV = (label, value) => {
    const lbl = safe(`${label}: `);
    const val = safe(String(value ?? '—'));
    const lblWidth = bold.widthOfTextAtSize(lbl, 11);
    page.drawText(lbl, { x: margin, y, size: 11, font: bold });
    page.drawText(val, { x: margin + lblWidth, y, size: 11, font });
    y -= 16;
  };

  // Title
  page.drawText(safe(`Expense Claim #${claim.id}`), { x: margin, y, size: 18, font: bold });
  y -= 24;

  // Status + totals
  drawHeading(page, 'Summary', margin, y, bold, 12); y -= 16;
  writeKV('Status', claim.status);
  writeKV('Grand Total', (claim.grand_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Travel Request', claim.travel_request_id ? `#${claim.travel_request_id}` : '—');
  y -= 8;

  // Employee
  drawHeading(page, 'Employee', margin, y, bold, 12); y -= 16;
  const emp = claim.employee || {};
  const job = (emp.employmentRecords||[])[0] || {};
  writeKV('Name', emp.full_name || '—');
  writeKV('Employee ID', claim.employee_id);
  writeKV('CNIC', emp.cnic || '—');
  writeKV('Designation', job?.designation?.title || '—');
  writeKV('Department', job?.department?.title || job?.department?.name || '—');
  writeKV('Location', job?.location?.name || '—');
  y -= 8;

  // Associated Travel Request (load full details if possible)
  const hasReqId = !!claim.travel_request_id;
  let reqData = claim.request || null;
  if (hasReqId) {
    try { reqData = await loadTravelRequestFull(claim.travel_request_id) || reqData; } catch(_) {}
  }
  if (reqData) {
    drawHeading(page, 'Travel Request', margin, y, bold, 12); y -= 16;
    writeKV('Request ID', claim.travel_request_id || reqData.id || '—');
    writeKV('Status', reqData.status || '—');
    writeKV('Submission Date', reqData.submission_date ? String(reqData.submission_date).slice(0,10) : '—');
    writeKV('Purpose', reqData.purpose || reqData.travel_purpose || '—');
    writeKV('Destination', reqData.destination || '—');
    writeKV('Departure', reqData.departure_date ? `${String(reqData.departure_date).slice(0,10)}${reqData.departure_time? ' at '+reqData.departure_time:''}` : '—');
    writeKV('Expected Return', reqData.expected_return_date ? String(reqData.expected_return_date).slice(0,10) : '—');
    writeKV('Total Days', (reqData.total_days ?? '—'));
    y -= 8;

    // Attendees
    drawHeading(page, 'Attendees', margin, y, bold, 12); y -= 16;
    const attendees = Array.isArray(reqData.attendees) ? reqData.attendees : [];
    if(attendees.length===0){ page.drawText(safe('No attendees'), { x: margin, y, size: 11, font }); y -= 16; }
    else {
      for(const a of attendees){
        const label = `${a.employee?.full_name || '—'}${a.employee?.cnic ? ' — '+a.employee.cnic : ''}`;
        y = drawMultilineText(page, label, margin, y, font, 11, 515, 14) - 2;
        if(y < 80){ y = page.getSize().height - margin; drawHeading(page, 'Attendees (cont.)', margin, y, bold, 12); y -= 16; }
      }
    }
    y -= 8;

    // Request Status History
    const reqEntries = Array.isArray(reqData.statusEntries) ? reqData.statusEntries : [];
    if(reqEntries.length){
      drawHeading(page, 'Request Status History', margin, y, bold, 12); y -= 16;
      for(const se of reqEntries){
        const actor = se.actor?.full_name || (se.actor_employee_id ? `Emp #${se.actor_employee_id}` : '—');
        const when = se.createdAt ? new Date(se.createdAt).toLocaleString() : '';
        const line = `${se.action} by ${actor}${when?` at ${when}`:''}${se.remarks?` — ${se.remarks}`:''}`;
        y = drawMultilineText(page, line, margin, y, font, 11, 515, 14) - 2;
        if(y < 80){ y = page.getSize().height - margin; drawHeading(page, 'Request Status History (cont.)', margin, y, bold, 12); y -= 16; }
      }
      y -= 8;
    }
  }

  // Claim details
  drawHeading(page, 'Claim Details', margin, y, bold, 12); y -= 16;
  writeKV('From Date', claim.from_date ? String(claim.from_date).slice(0,10) : '—');
  writeKV('To Date', claim.to_date ? String(claim.to_date).slice(0,10) : '—');
  writeKV('Overnight Stay', claim.overnight_stay ? 'Yes' : 'No');
  writeKV('Transport Mode', claim.transport_mode || '—');
  writeKV('Fuel Total', (claim.fuel_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Fare Total', (claim.fare_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Toll Tax Total (D)', (claim.toll_tax_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Rate / KM (B)', (claim.rate_per_km||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Total Distance (A)', claim.total_distance_km || 0);
  writeKV('Distance Amount (C = AxB)', ((Number(claim.total_distance_km||0)*Number(claim.rate_per_km||0))||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Per Diem Days', claim.per_diem_days || 0);
  writeKV('Per Diem Rate', (claim.per_diem_rate||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Per Diem Amount (F)', (Number(claim.per_diem_days||0)*Number(claim.per_diem_rate||0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  y -= 8;

  // Segments
  drawHeading(page, 'Segments', margin, y, bold, 12); y -= 16;
  const segs = claim.segments || [];
  if(segs.length===0){ page.drawText(safe('No segments'), { x: margin, y, size: 11, font }); y -= 16; }
  else {
    for(const [i,s] of segs.entries()){
      const line = `#${i+1} * ${s.mode||'—'} * ${s.departure_from||'—'} -> ${s.departure_to||'—'} * Depart ${s.depart_date?String(s.depart_date).slice(0,10):'—'} ${s.depart_time||''} * Arrive ${s.arrive_date?String(s.arrive_date).slice(0,10):'—'} ${s.arrive_time||''} * KM ${s.distance_km||0}`;
      y = drawMultilineText(page, line, margin, y, font, 11, 515, 14) - 2;
      if(y < 80){ y = page.getSize().height - margin; drawHeading(page, 'Segments (cont.)', margin, y, bold, 12); y -= 16; }
    }
  }

  // Status history
  drawHeading(page, 'Status History', margin, y, bold, 12); y -= 16;
  const entries = claim.statusEntries || [];
  if(entries.length===0){ page.drawText(safe('No history'), { x: margin, y, size: 11, font }); y -= 16; }
  else {
    for(const se of entries){
      const actor = se.actor?.full_name || `Emp #${se.actor_employee_id}`;
      const when = new Date(se.createdAt).toLocaleString();
      const line = `${se.action} by ${actor} at ${when}${se.remarks?` — ${se.remarks}`:''}`;
      y = drawMultilineText(page, line, margin, y, font, 11, 515, 14) - 2;
      if(y < 80){ y = page.getSize().height - margin; drawHeading(page, 'Status History (cont.)', margin, y, bold, 12); y -= 16; }
    }
  }

  // Begin documents section on a new page for clarity
  let docInsertPos = pdfDoc.getPageCount();

  const docs = claim.documents || [];
  if(docs.length>0){
    const docPage = pdfDoc.addPage([595.28, 841.89]);
    docInsertPos = pdfDoc.getPageCount()-1;
    let yy = docPage.getSize().height - margin;
    drawHeading(docPage, 'Documents', margin, yy, bold, 12); yy -= 20;

    for(const d of docs){
      const url = resolveDocUrl(d.file_path);
      if(!url) continue;
      // Try to detect if PDF
      const isPdf = /\.pdf($|\?)/i.test(url);
      try {
        if(isPdf){
          const ab = await fetchArrayBuffer(url);
          const src = await PDFDocument.load(ab);
          const copied = await pdfDoc.copyPages(src, src.getPageIndices());
          for(const p of copied){ pdfDoc.addPage(p); }
          // Also add a label line on the docs page
          docPage.drawText(safe((d.category||'DOC')+': '+(d.file_path||'').split('/').pop()), { x: margin, y: yy, size: 10, font, color: rgb(0.15,0.15,0.15) });
          yy -= 14;
        } else {
          // Assume image
          const ab = await fetchArrayBuffer(url);
          let img; let scale = 1; let w=0; let h=0;
          try { const bytes = new Uint8Array(ab); img = await pdfDoc.embedPng(bytes); w = img.width; h = img.height; }
          catch(_) { const bytes = new Uint8Array(ab); img = await pdfDoc.embedJpg(bytes); w = img.width; h = img.height; }
          const maxW = 515, maxH = 650;
          scale = Math.min(maxW/w, maxH/h, 1);
          const iw = w*scale, ih = h*scale;
          const p = pdfDoc.addPage([595.28, 841.89]);
          p.drawText(safe((d.category||'DOC')+': '+(d.file_path||'').split('/').pop()), { x: margin, y: p.getSize().height - margin - 12, size: 10, font, color: rgb(0.15,0.15,0.15) });
          p.drawImage(img, { x: margin, y: (p.getSize().height - margin - 24 - ih), width: iw, height: ih });
        }
      } catch(err){
        // On error, write a note and continue
        const p = pdfDoc.addPage([595.28, 841.89]);
        p.drawText(safe('Failed to embed document: '+(d.file_path||'')), { x: margin, y: p.getSize().height - margin - 12, size: 10, font, color: rgb(0.8,0.2,0.2) });
      }
    }
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  // Trigger download
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `expense-claim-${claim.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
