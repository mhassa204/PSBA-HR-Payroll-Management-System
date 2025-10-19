import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Helper: fetch a URL as ArrayBuffer (with credentials for session-authenticated servers)
async function fetchArrayBuffer(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch: " + url);
  return await res.arrayBuffer();
}

// Replace unsupported characters with WinAnsi-safe equivalents
function safe(text) {
  return String(text ?? "")
    .replace(/\u2192/g, "->") // →
    .replace(/\u2014/g, "-") // —
    .replace(/\u2013/g, "-") // –
    .replace(/\u2022/g, "*") // •
    .replace(/\u00D7/g, "x") // ×
    .replace(/[\u2018\u2019]/g, "'") // ‘ ’
    .replace(/[\u201C\u201D]/g, '"'); // “ ”
}

// Helper: get absolute URL for document path
export function resolveDocUrl(p) {
  if (!p) return null;
  // Normalize slashes and ensure uploads/ prefix for proxy
  let clean = String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  // Handle legacy paths without leading 'uploads/'
  if (!/^uploads\//i.test(clean)) {
    // If starts with 'Uploads/', normalize case; else prefix 'uploads/'
    if (/^Uploads\//.test(clean))
      clean = clean.replace(/^Uploads\//, "uploads/");
    else clean = `uploads/${clean}`;
  }
  const preferLocal = (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseApi = (
    (preferLocal ? null : import.meta.env.VITE_API_URL) || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api` : "")
  ).replace(/\/?$/, "");
  // Always proxy via API to ensure auth/cors and correct casing mapping
  return `${baseApi}/travel/expense-claims/document?path=${encodeURIComponent(
    clean
  )}`;
}

// Helper: fetch JSON with credentials
async function fetchJson(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch: " + url);
  return res.json();
}

// Load full travel request by id to include attendees and status history
async function loadTravelRequestFull(id) {
  if (!id) return null;
  const preferLocal2 = (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseApi = (
    (preferLocal2 ? null : import.meta.env.VITE_API_URL) || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api` : "")
  ).replace(/\/?$/, "");
  try {
    const data = await fetchJson(`${baseApi}/travel/requests/${id}`);
    return data?.request || null;
  } catch {
    return null;
  }
}

// Load full claim by id (includes documents, segments, status history)
async function loadClaimFull(id) {
  if (!id) return null;
  const preferLocal3 = (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseApi = (
    (preferLocal3 ? null : import.meta.env.VITE_API_URL) || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api` : "")
  ).replace(/\/?$/, "");
  try {
    const data = await fetchJson(`${baseApi}/travel/expense-claims/${id}`);
    return data?.claim || null;
  } catch {
    return null;
  }
}

// Renders multi-line text block
function drawMultilineText(page, text, x, y, font, size, maxWidth, lineHeight) {
  const content = safe(text);
  const words = content.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth) {
      if (line) {
        page.drawText(line, { x, y: cursorY, size, font });
        cursorY -= lineHeight;
      }
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font });
    cursorY -= lineHeight;
  }
  return cursorY;
}

// Add a section heading
function drawHeading(page, text, x, y, font, size) {
  const t = safe(text);
  page.drawText(t, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
  page.drawLine({
    start: { x, y: y - 2 },
    end: { x: x + 500, y: y - 2 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
}

// Internal renderer: append a single claim into an existing PDFDocument
async function renderClaimIntoDocument(pdfDoc, claim, { font, bold }) {
  const pageSize = [595.28, 841.89];
  const margin = 40;
  let page = pdfDoc.addPage(pageSize);
  let y = page.getSize().height - margin;

  // Pagination helpers (per-claim scope)
  const newPage = () => {
    page = pdfDoc.addPage(pageSize);
    y = page.getSize().height - margin;
  };
  const ensureSpace = (needed = 16) => {
    if (y - needed < margin) newPage();
  };
  const wrapLines = (text, fnt, size, maxWidth) => {
    const words = safe(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = fnt.widthOfTextAtSize(test, size);
      if (width > maxWidth) {
        if (line) {
          lines.push(line);
          line = w;
        } else {
          lines.push(test);
          line = "";
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const drawParagraph = (
    text,
    { fnt = font, size = 11, maxWidth = 515, lineHeight = 14, contHeading } = {}
  ) => {
    const lines = wrapLines(text, fnt, size, maxWidth);
    for (const ln of lines) {
      if (y - lineHeight < margin) {
        newPage();
        if (contHeading) {
          drawHeading(page, contHeading, margin, y, bold, 12);
          y -= 16;
        }
      }
      page.drawText(safe(ln), { x: margin, y, size, font: fnt });
      y -= lineHeight;
    }
    return y;
  };
  const writeKV = (label, value) => {
    ensureSpace(16);
    const lbl = safe(`${label}: `);
    const val = safe(String(value ?? "—"));
    const lblWidth = bold.widthOfTextAtSize(lbl, 11);
    page.drawText(lbl, { x: margin, y, size: 11, font: bold });
    page.drawText(val, { x: margin + lblWidth, y, size: 11, font });
    y -= 16;
  };

  // Title
  page.drawText(safe(`Expense Claim #${claim.id}`), {
    x: margin,
    y,
    size: 18,
    font: bold,
  });
  y -= 24;

  // Summary
  ensureSpace(20);
  drawHeading(page, "Summary", margin, y, bold, 12);
  y -= 16;
  writeKV("Status", claim.status);
  writeKV(
    "Grand Total",
    (claim.grand_total || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV(
    "Travel Request",
    claim.travel_request_id ? `#${claim.travel_request_id}` : "—"
  );
  y -= 8;

  // Employee
  ensureSpace(20);
  drawHeading(page, "Employee", margin, y, bold, 12);
  y -= 16;
  const emp = claim.employee || {};
  const job = (emp.employmentRecords || [])[0] || {};
  writeKV("Name", emp.full_name || "—");
  writeKV("Employee ID", claim.employee_id);
  writeKV("CNIC", emp.cnic || "—");
  writeKV("Designation", job?.designation?.title || "—");
  writeKV("Department", job?.department?.title || job?.department?.name || "—");
  writeKV("Location", job?.location?.name || "—");
  y -= 8;

  // Associated Travel Request
  const hasReqId = !!claim.travel_request_id;
  let reqData = claim.request || null;
  if (hasReqId) {
    try {
      reqData =
        (await loadTravelRequestFull(claim.travel_request_id)) || reqData;
    } catch (_) {}
  }
  if (reqData) {
    ensureSpace(20);
    drawHeading(page, "Travel Request", margin, y, bold, 12);
    y -= 16;
    writeKV("Request ID", claim.travel_request_id || reqData.id || "—");
    writeKV("Status", reqData.status || "—");
    writeKV(
      "Submission Date",
      reqData.submission_date
        ? String(reqData.submission_date).slice(0, 10)
        : "—"
    );
    writeKV("Purpose", reqData.purpose || reqData.travel_purpose || "—");
    writeKV("Destination", reqData.destination || "—");
    writeKV(
      "Departure",
      reqData.departure_date
        ? `${String(reqData.departure_date).slice(0, 10)}${
            reqData.departure_time ? " at " + reqData.departure_time : ""
          }`
        : "—"
    );
    writeKV(
      "Expected Return",
      reqData.expected_return_date
        ? String(reqData.expected_return_date).slice(0, 10)
        : "—"
    );
    writeKV("Total Days", reqData.total_days ?? "—");
    y -= 8;

    // Attendees
    ensureSpace(20);
    drawHeading(page, "Attendees", margin, y, bold, 12);
    y -= 16;
    const attendees = Array.isArray(reqData.attendees) ? reqData.attendees : [];
    if (attendees.length === 0) {
      ensureSpace(16);
      page.drawText(safe("No attendees"), { x: margin, y, size: 11, font });
      y -= 16;
    } else {
      for (const a of attendees) {
        const label = `${a.employee?.full_name || "—"}${
          a.employee?.cnic ? " — " + a.employee.cnic : ""
        }`;
        y =
          drawParagraph(label, {
            fnt: font,
            size: 11,
            maxWidth: 515,
            lineHeight: 14,
            contHeading: "Attendees (cont.)",
          }) - 2;
      }
    }
    y -= 8;

    // Request Status History
    const reqEntries = Array.isArray(reqData.statusEntries)
      ? reqData.statusEntries
      : [];
    if (reqEntries.length) {
      ensureSpace(20);
      drawHeading(page, "Request Status History", margin, y, bold, 12);
      y -= 16;
      for (const se of reqEntries) {
        // Align with UI: prefer email embedded in remarks (department accounts), then actor.user/email/name
        const emailMatch = String(se.remarks || "").match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );
        const actorFromServer =
          se?.actor?.user?.email || se?.actor?.email || se?.actor?.name || null;
        const actor = safe(emailMatch ? emailMatch[0] : actorFromServer || "—");
        const when = se.createdAt
          ? new Date(se.createdAt).toLocaleString()
          : "";
        const line = `${se.action} by ${actor}${when ? ` at ${when}` : ""}`;
        y =
          drawParagraph(line, {
            fnt: font,
            size: 11,
            maxWidth: 515,
            lineHeight: 14,
            contHeading: "Request Status History (cont.)",
          }) - 2;
      }
      y -= 8;
    }
  }

  // Claim details
  ensureSpace(20);
  drawHeading(page, "Claim Details", margin, y, bold, 12);
  y -= 16;
  writeKV(
    "From Date",
    claim.from_date ? String(claim.from_date).slice(0, 10) : "—"
  );
  writeKV("To Date", claim.to_date ? String(claim.to_date).slice(0, 10) : "—");
  writeKV("Overnight Stay", claim.overnight_stay ? "Yes" : "No");
  writeKV("Transport Mode", claim.transport_mode || "—");
  writeKV(
    "Fuel Total",
    (claim.fuel_total || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV(
    "Fare Total",
    (claim.fare_total || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV(
    "Toll Tax Total (D)",
    (claim.toll_tax_total || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV(
    "Rate / KM (B)",
    (claim.rate_per_km || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV("Total Distance (A)", claim.total_distance_km || 0);
  writeKV(
    "Distance Amount (C = AxB)",
    (
      Number(claim.total_distance_km || 0) * Number(claim.rate_per_km || 0) || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV("Per Diem Days", claim.per_diem_days || 0);
  writeKV(
    "Per Diem Rate",
    (claim.per_diem_rate || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  writeKV(
    "Per Diem Amount (F)",
    (
      Number(claim.per_diem_days || 0) * Number(claim.per_diem_rate || 0)
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  y -= 8;

  // Segments
  ensureSpace(20);
  drawHeading(page, "Segments", margin, y, bold, 12);
  y -= 16;
  const segs = claim.segments || [];
  if (segs.length === 0) {
    ensureSpace(16);
    page.drawText(safe("No segments"), { x: margin, y, size: 11, font });
    y -= 16;
  } else {
    for (const [i, s] of segs.entries()) {
      const line = `#${i + 1} * ${s.mode || "—"} * ${
        s.departure_from || "—"
      } -> ${s.departure_to || "—"} * Depart ${
        s.depart_date ? String(s.depart_date).slice(0, 10) : "—"
      } ${s.depart_time || ""} * Arrive ${
        s.arrive_date ? String(s.arrive_date).slice(0, 10) : "—"
      } ${s.arrive_time || ""} * KM ${s.distance_km || 0}`;
      y =
        drawParagraph(line, {
          fnt: font,
          size: 11,
          maxWidth: 515,
          lineHeight: 14,
          contHeading: "Segments (cont.)",
        }) - 2;
    }
  }

  // Status history
  ensureSpace(20);
  drawHeading(page, "Status History", margin, y, bold, 12);
  y -= 16;
  const entries = claim.statusEntries || [];
  if (entries.length === 0) {
    ensureSpace(16);
    page.drawText(safe("No history"), { x: margin, y, size: 11, font });
    y -= 16;
  } else {
    for (const se of entries) {
      // Align with UI: prefer email embedded in remarks (department accounts), then actor.user/email/name
      const emailMatch = String(se.remarks || "").match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
      );
      const actorFromServer =
        se?.actor?.user?.email || se?.actor?.email || se?.actor?.name || null;
      const actor = safe(emailMatch ? emailMatch[0] : actorFromServer || "—");
      const when = new Date(se.createdAt).toLocaleString();
      const line = `${se.action} by ${actor} at ${when}`;
      y =
        drawParagraph(line, {
          fnt: font,
          size: 11,
          maxWidth: 515,
          lineHeight: 14,
          contHeading: "Status History (cont.)",
        }) - 2;
    }
  }

  // Documents
  const docs = claim.documents || [];
  if (docs.length > 0) {
    let docsHeadingDrawn = false;
    for (const d of docs) {
      const url = resolveDocUrl(d.file_path);
      if (!url) continue;
      const label = safe(
        (d.category || "DOC") + ": " + (d.file_path || "").split("/").pop()
      );
      const isPdf = /\.pdf($|\?)/i.test(url);
      try {
        if (isPdf) {
          const ab = await fetchArrayBuffer(url);
          const src = await PDFDocument.load(ab);
          // Title + first page under label
          const p = pdfDoc.addPage(pageSize);
          const topY = p.getSize().height - margin;
          if (!docsHeadingDrawn) {
            drawHeading(p, "Documents", margin, topY, bold, 12);
          }
          const labelY = (docsHeadingDrawn ? topY : topY - 20) - 16;
          p.drawText(label, {
            x: margin,
            y: labelY,
            size: 11,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });
          try {
            const firstSrcPage = src.getPage(0);
            const embeddedFirst = await pdfDoc.embedPage(firstSrcPage);
            const epw = embeddedFirst.width,
              eph = embeddedFirst.height;
            const maxW = 515,
              maxH = Math.max(0, labelY - 12 - margin);
            const scale = Math.min(maxW / epw, maxH / eph, 1);
            const iw = epw * scale,
              ih = eph * scale;
            p.drawPage(embeddedFirst, {
              x: margin,
              y: Math.max(margin, labelY - 12 - ih),
              width: iw,
              height: ih,
            });
          } catch (_) {
            const [firstCopy] = await pdfDoc.copyPages(src, [0]);
            pdfDoc.addPage(firstCopy);
          }
          const pageCount = src.getPageCount
            ? src.getPageCount()
            : src.getPageIndices().length;
          for (let i = 1; i < pageCount; i++) {
            const [cp] = await pdfDoc.copyPages(src, [i]);
            pdfDoc.addPage(cp);
          }
          docsHeadingDrawn = true;
        } else {
          // Image
          const ab = await fetchArrayBuffer(url);
          let img;
          let w = 0;
          let h = 0;
          try {
            const bytes = new Uint8Array(ab);
            img = await pdfDoc.embedPng(bytes);
            w = img.width;
            h = img.height;
          } catch (_) {
            const bytes = new Uint8Array(ab);
            img = await pdfDoc.embedJpg(bytes);
            w = img.width;
            h = img.height;
          }
          const p = pdfDoc.addPage(pageSize);
          const topY = p.getSize().height - margin;
          if (!docsHeadingDrawn) {
            drawHeading(p, "Documents", margin, topY, bold, 12);
          }
          const labelY = (docsHeadingDrawn ? topY : topY - 20) - 16;
          p.drawText(label, {
            x: margin,
            y: labelY,
            size: 11,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });
          const maxW = 515,
            maxH = 650;
          const scale = Math.min(maxW / w, maxH / h, 1);
          const iw = w * scale,
            ih = h * scale;
          p.drawImage(img, {
            x: margin,
            y: Math.max(margin, labelY - 12 - ih),
            width: iw,
            height: ih,
          });
          docsHeadingDrawn = true;
        }
      } catch (err) {
        const p = pdfDoc.addPage(pageSize);
        const topY = p.getSize().height - margin;
        if (!docsHeadingDrawn) {
          drawHeading(p, "Documents", margin, topY, bold, 12);
        }
        p.drawText(safe("Failed to embed document: " + (d.file_path || "")), {
          x: margin,
          y: (docsHeadingDrawn ? topY : topY - 20) - 16,
          size: 10,
          font,
          color: rgb(0.8, 0.2, 0.2),
        });
        docsHeadingDrawn = true;
      }
    }
  }
}

// Re-implement single-claim export using the renderer
export async function exportClaimToPdf(claim) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  await renderClaimIntoDocument(pdfDoc, claim, { font, bold });
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `expense-claim-${claim.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}

// New: Export a full tranche as a single PDF (all associated claims)
export async function exportTrancheToPdf(tranche) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89];
  const margin = 40;

  // Cover page
  const cover = pdfDoc.addPage(pageSize);
  let y = cover.getSize().height - margin;
  cover.drawText(safe("Expense Claims Tranche"), {
    x: margin,
    y,
    size: 18,
    font: bold,
  });
  y -= 24;
  const title = tranche.title || tranche.code || `Tranche #${tranche.id}`;
  cover.drawText(safe(`Title: ${title}`), { x: margin, y, size: 12, font });
  y -= 16;
  if (tranche.code) {
    cover.drawText(safe(`Code: ${tranche.code}`), {
      x: margin,
      y,
      size: 12,
      font,
    });
    y -= 16;
  }
  const items = tranche.items || [];
  const total = items.reduce(
    (s, it) => s + Number(it.claim?.grand_total || 0),
    0
  );
  cover.drawText(safe(`Claims: ${items.length}`), {
    x: margin,
    y,
    size: 12,
    font,
  });
  y -= 16;
  cover.drawText(
    safe(
      `Total Amount: ${total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    ),
    { x: margin, y, size: 12, font }
  );
  y -= 16;
  cover.drawLine({
    start: { x: margin, y: y - 8 },
    end: { x: margin + 500, y: y - 8 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Render each claim
  for (const it of items) {
    const id = it.claim?.id || it.claim_id;
    let claim = it.claim;
    try {
      const full = await loadClaimFull(id);
      if (full) claim = full;
    } catch {}
    if (!claim) continue;
    await renderClaimIntoDocument(pdfDoc, claim, { font, bold });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  const baseName = tranche.code || `tranche-${tranche.id}`;
  a.href = URL.createObjectURL(blob);
  a.download = `expense-${baseName}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}
