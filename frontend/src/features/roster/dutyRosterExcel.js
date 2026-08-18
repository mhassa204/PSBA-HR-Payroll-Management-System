// Excel (.xlsx) version of the official Staff Duty Roster Form, styled with
// title rows, category bands and borders to mirror the printable form.
import * as XLSX from "xlsx-js-style";
import { buildDutyRosterFormModel, FORM_HEADERS } from "./dutyRosterForm";

const NCOLS = FORM_HEADERS.length; // 13
const BORDER = { style: "thin", color: { rgb: "333333" } };
const ALL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const setCell = (ws, r, c, v, s) => {
  const ref = XLSX.utils.encode_cell({ r, c });
  ws[ref] = { t: "s", v: v == null ? "" : String(v), s };
};

export function exportDutyRosterFormExcel(roster) {
  const model = buildDutyRosterFormModel(roster);
  const ws = {};
  const merges = [];
  let r = 0;

  const titleStyle = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } };
  const subStyle = { font: { sz: 10 }, alignment: { horizontal: "center" } };
  const headStyle = {
    font: { bold: true, sz: 9 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: "F0F0F0" } },
    border: ALL_BORDERS,
  };
  const bandStyle = {
    font: { bold: true, sz: 10 },
    alignment: { horizontal: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "DFE6EF" } },
    border: ALL_BORDERS,
  };
  const cellStyle = (left = false) => ({
    font: { sz: 9, bold: left },
    alignment: { horizontal: left ? "left" : "center", vertical: "center", wrapText: true },
    border: ALL_BORDERS,
  });

  // Title block (each merged across all columns)
  const titleRow = (text, style) => {
    setCell(ws, r, 0, text, style);
    for (let c = 1; c < NCOLS; c++) setCell(ws, r, c, "", style);
    merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });
    r++;
  };
  titleRow(model.title, titleStyle);
  if (model.timing) titleRow(`Bazaar Operational Timing: ${model.timing}`, subStyle);
  titleRow(
    `FROM ${model.validFrom} TO ${model.validTo || "ONWARDS (PERMANENT)"}`,
    subStyle
  );
  r++; // spacer row

  // Header row
  FORM_HEADERS.forEach((h, c) => setCell(ws, r, c, h, headStyle));
  r++;

  // Category bands + employee rows
  for (const g of model.groups) {
    setCell(ws, r, 0, g.category, bandStyle);
    for (let c = 1; c < NCOLS; c++) setCell(ws, r, c, "", bandStyle);
    merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });
    r++;
    for (const row of g.rows) {
      const values = [
        row.sr,
        row.name,
        row.designation,
        row.cnic,
        row.contact,
        row.weeklyOff,
        ...row.dayCells,
      ];
      values.forEach((v, c) => setCell(ws, r, c, v, cellStyle(c === 1)));
      r++;
    }
  }

  // Footer
  r++;
  setCell(
    ws,
    r,
    0,
    "This is a computer generated document and does not require signature.",
    { font: { italic: true, sz: 9, color: { rgb: "555555" } }, alignment: { horizontal: "center" } }
  );
  for (let c = 1; c < NCOLS; c++) setCell(ws, r, c, "", {});
  merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: NCOLS - 1 } });
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    ...Array(7).fill({ wch: 16 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Duty Roster");
  const safe = String(model.unitName || "Roster").replace(/[\\/:*?"<>|]+/g, "-");
  XLSX.writeFile(wb, `Duty_Roster_${safe}.xlsx`);
}
