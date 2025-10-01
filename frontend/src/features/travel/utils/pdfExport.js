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
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (points)
  const margin = 40;
  const pageSize = [595.28, 841.89];
  let y = page.getSize().height - margin;

  // Helpers for pagination
  const newPage = () => { page = pdfDoc.addPage(pageSize); y = page.getSize().height - margin; };
  const ensureSpace = (needed = 16) => { if ((y - needed) < margin) newPage(); };
  const wrapLines = (text, fnt, size, maxWidth) => {
    const words = safe(text).split(/\s+/);
    const lines = []; let line = '';
    for (const w of words){
      const test = line ? (line+' '+w) : w;
      const width = fnt.widthOfTextAtSize(test, size);
      if (width > maxWidth){ if (line) { lines.push(line); line = w; } else { lines.push(test); line=''; } }
      else { line = test; }
    }
    if (line) lines.push(line);
    return lines;
  };
  const drawParagraph = (text, { fnt=font, size=11, maxWidth=515, lineHeight=14, contHeading } = {}) => {
    const lines = wrapLines(text, fnt, size, maxWidth);
    for (const ln of lines){
      if ((y - lineHeight) < margin){
        newPage();
        if (contHeading){ drawHeading(page, contHeading, margin, y, bold, 12); y -= 16; }
      }
      page.drawText(safe(ln), { x: margin, y, size, font: fnt });
      y -= lineHeight;
    }
    return y;
  };

  const writeKV = (label, value) => {
    ensureSpace(16);
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
  ensureSpace(20); drawHeading(page, 'Summary', margin, y, bold, 12); y -= 16;
  writeKV('Status', claim.status);
  writeKV('Grand Total', (claim.grand_total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));
  writeKV('Travel Request', claim.travel_request_id ? `#${claim.travel_request_id}` : '—');
  y -= 8;

  // Employee
  ensureSpace(20); drawHeading(page, 'Employee', margin, y, bold, 12); y -= 16;
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
    ensureSpace(20); drawHeading(page, 'Travel Request', margin, y, bold, 12); y -= 16;
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
    ensureSpace(20); drawHeading(page, 'Attendees', margin, y, bold, 12); y -= 16;
    const attendees = Array.isArray(reqData.attendees) ? reqData.attendees : [];
    if(attendees.length===0){ ensureSpace(16); page.drawText(safe('No attendees'), { x: margin, y, size: 11, font }); y -= 16; }
    else {
      for(const a of attendees){
        const label = `${a.employee?.full_name || '—'}${a.employee?.cnic ? ' — '+a.employee.cnic : ''}`;
        y = drawParagraph(label, { fnt: font, size: 11, maxWidth: 515, lineHeight: 14, contHeading: 'Attendees (cont.)' }) - 2;
      }
    }
    y -= 8;

    // Request Status History
    const reqEntries = Array.isArray(reqData.statusEntries) ? reqData.statusEntries : [];
    if(reqEntries.length){
      ensureSpace(20); drawHeading(page, 'Request Status History', margin, y, bold, 12); y -= 16;
      for(const se of reqEntries){
        const actor = se.actor?.full_name || (se.actor_employee_id ? `Emp #${se.actor_employee_id}` : '—');
        const when = se.createdAt ? new Date(se.createdAt).toLocaleString() : '';
        const line = `${se.action} by ${actor}${when?` at ${when}`:''}${se.remarks?` — ${se.remarks}`:''}`;
        y = drawParagraph(line, { fnt: font, size: 11, maxWidth: 515, lineHeight: 14, contHeading: 'Request Status History (cont.)' }) - 2;
      }
      y -= 8;
    }
  }

  // Claim details
  ensureSpace(20); drawHeading(page, 'Claim Details', margin, y, bold, 12); y -= 16;
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
  ensureSpace(20); drawHeading(page, 'Segments', margin, y, bold, 12); y -= 16;
  const segs = claim.segments || [];
  if(segs.length===0){ ensureSpace(16); page.drawText(safe('No segments'), { x: margin, y, size: 11, font }); y -= 16; }
  else {
    for(const [i,s] of segs.entries()){
      const line = `#${i+1} * ${s.mode||'—'} * ${s.departure_from||'—'} -> ${s.departure_to||'—'} * Depart ${s.depart_date?String(s.depart_date).slice(0,10):'—'} ${s.depart_time||''} * Arrive ${s.arrive_date?String(s.arrive_date).slice(0,10):'—'} ${s.arrive_time||''} * KM ${s.distance_km||0}`;
      y = drawParagraph(line, { fnt: font, size: 11, maxWidth: 515, lineHeight: 14, contHeading: 'Segments (cont.)' }) - 2;
    }
  }

  // Status history
  ensureSpace(20); drawHeading(page, 'Status History', margin, y, bold, 12); y -= 16;
  const entries = claim.statusEntries || [];
  if(entries.length===0){ ensureSpace(16); page.drawText(safe('No history'), { x: margin, y, size: 11, font }); y -= 16; }
  else {
    for(const se of entries){
      const actor = se.actor?.full_name || `Emp #${se.actor_employee_id}`;
      const when = new Date(se.createdAt).toLocaleString();
      const line = `${se.action} by ${actor} at ${when}${se.remarks?` — ${se.remarks}`:''}`;
      y = drawParagraph(line, { fnt: font, size: 11, maxWidth: 515, lineHeight: 14, contHeading: 'Status History (cont.)' }) - 2;
    }
  }

  // Documents: start a dedicated sequence so each document appears right under its title
  const docs = claim.documents || [];
  if(docs.length>0){
    let docsHeadingDrawn = false;
    for(const d of docs){
      const url = resolveDocUrl(d.file_path);
      if(!url) continue;
      const label = safe((d.category||'DOC')+': '+(d.file_path||'').split('/').pop());
      const isPdf = /\.pdf($|\?)/i.test(url);
      try {
        if(isPdf){
          const ab = await fetchArrayBuffer(url);
          const src = await PDFDocument.load(ab);
          // Create a page for the title and draw the first PDF page content right below it
          const p = pdfDoc.addPage(pageSize);
          const topY = p.getSize().height - margin;
          if(!docsHeadingDrawn){ drawHeading(p, 'Documents', margin, topY, bold, 12); }
          const labelY = (docsHeadingDrawn ? topY : topY-20) - 16;
          p.drawText(label, { x: margin, y: labelY, size: 11, font, color: rgb(0.15,0.15,0.15) });

          // Embed and draw the first source page below the label, scaled to fit under it
          try {
            const firstSrcPage = src.getPage(0);
            const embeddedFirst = await pdfDoc.embedPage(firstSrcPage);
            const epw = embeddedFirst.width;
            const eph = embeddedFirst.height;
            const maxW = 515;
            const maxH = Math.max(0, labelY - 12 - margin);
            const scale = Math.min(maxW/epw, maxH/eph, 1);
            const iw = epw*scale, ih = eph*scale;
            p.drawPage(embeddedFirst, { x: margin, y: Math.max(margin, labelY - 12 - ih), width: iw, height: ih });
          } catch (_) {
            // Fallback: if embedding fails, copy and append the first page as-is
            const [firstCopy] = await pdfDoc.copyPages(src, [0]);
            pdfDoc.addPage(firstCopy);
          }

          // Append the remaining pages of the PDF after the title+first-page page
          const pageCount = src.getPageCount ? src.getPageCount() : src.getPageIndices().length;
          for(let i=1; i<pageCount; i++){
            const [cp] = await pdfDoc.copyPages(src, [i]);
            pdfDoc.addPage(cp);
          }
          docsHeadingDrawn = true;
        } else {
          // Image: draw title and image on the same page if possible
          const ab = await fetchArrayBuffer(url);
          let img; let w=0; let h=0;
          try { const bytes = new Uint8Array(ab); img = await pdfDoc.embedPng(bytes); w = img.width; h = img.height; }
          catch(_) { const bytes = new Uint8Array(ab); img = await pdfDoc.embedJpg(bytes); w = img.width; h = img.height; }
          const p = pdfDoc.addPage(pageSize);
          const topY = p.getSize().height - margin;
          if(!docsHeadingDrawn){ drawHeading(p, 'Documents', margin, topY, bold, 12); }
          const labelY = (docsHeadingDrawn ? topY : topY-20) - 16;
          p.drawText(label, { x: margin, y: labelY, size: 11, font, color: rgb(0.15,0.15,0.15) });
          const maxW = 515, maxH = 650;
          const scale = Math.min(maxW/w, maxH/h, 1);
          const iw = w*scale, ih = h*scale;
          p.drawImage(img, { x: margin, y: Math.max(margin, labelY - 12 - ih), width: iw, height: ih });
          docsHeadingDrawn = true;
        }
      } catch(err){
        const p = pdfDoc.addPage(pageSize);
        const topY = p.getSize().height - margin;
        if(!docsHeadingDrawn){ drawHeading(p, 'Documents', margin, topY, bold, 12); }
        p.drawText(safe('Failed to embed document: '+(d.file_path||'')), { x: margin, y: (docsHeadingDrawn ? topY : topY-20) - 16, size: 10, font, color: rgb(0.8,0.2,0.2) });
        docsHeadingDrawn = true;
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
