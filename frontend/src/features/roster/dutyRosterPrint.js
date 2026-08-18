// Open the "Staff Duty Roster Form" in a print window (Print / Save-as-PDF).
import { buildDutyRosterFormModel, PRINT_DAYS } from "./dutyRosterForm";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function openDutyRosterPrint(roster) {
  const model = buildDutyRosterFormModel(roster);

  const dayHeadCells = PRINT_DAYS.map((d) => `<th>${d.toUpperCase()}</th>`).join("");

  let bodyRows = "";
  for (const g of model.groups) {
    bodyRows += `<tr class="band"><td colspan="13">${esc(g.category)}</td></tr>`;
    for (const r of g.rows) {
      const dayCells = r.dayCells.map((c) => `<td>${esc(c)}</td>`).join("");
      bodyRows += `<tr>
        <td>${r.sr}</td>
        <td class="name">${esc(r.name)}</td>
        <td>${esc(r.designation)}</td>
        <td class="nowrap">${esc(r.cnic)}</td>
        <td class="nowrap">${esc(r.contact)}</td>
        <td>${esc(r.weeklyOff)}</td>
        ${dayCells}
      </tr>`;
    }
  }

  const leftLogo = `${window.location.origin}/psba.png`;
  const rightLogo = `${window.location.origin}/punjab.png`;

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Duty Roster — ${esc(model.unitName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 12px; }
  .toolbar { text-align: right; margin-bottom: 8px; }
  .toolbar button { font-size: 13px; padding: 6px 14px; cursor: pointer; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .head img { height: 56px; width: auto; }
  .head .center { text-align: center; flex: 1; }
  .head .center h1 { font-size: 15px; font-weight: bold; margin: 0 0 2px; }
  .head .center .sub { font-size: 11px; margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #333; padding: 2px 3px; font-size: 8.5px; text-align: center; word-wrap: break-word; }
  th { background: #f0f0f0; font-weight: bold; }
  td.name { text-align: left; font-weight: bold; }
  td.nowrap { white-space: nowrap; }
  tr.band td { background: #dfe6ef; font-weight: bold; text-align: center; letter-spacing: 0.5px; font-size: 9px; }
  .footer { margin-top: 16px; font-size: 10px; font-style: italic; color: #555; text-align: center; }
  @media print {
    .toolbar { display: none; }
    @page { size: A4 landscape; margin: 8mm; }
  }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="head">
    <img src="${leftLogo}" alt="Sahulat" onerror="this.style.visibility='hidden'"/>
    <div class="center">
      <h1>${esc(model.title)}</h1>
      ${model.timing ? `<div class="sub"><b>Bazaar Operational Timing:</b> ${esc(model.timing)}</div>` : ""}
      <div class="sub"><b>FROM</b> ${esc(model.validFrom)} <b>TO</b> ${
    model.validTo ? esc(model.validTo) : "ONWARDS (PERMANENT)"
  }</div>
    </div>
    <img src="${rightLogo}" alt="Government of Punjab" onerror="this.style.visibility='hidden'"/>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:26px">Sr. #</th>
        <th style="width:9%">NAME</th>
        <th style="width:9%">DESIGNATION</th>
        <th style="width:8%">CNIC</th>
        <th style="width:7%">CONTACT NUMBER</th>
        <th style="width:6%">Weekly off</th>
        ${dayHeadCells}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">
    This is a computer generated document and does not require signature.
  </div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
