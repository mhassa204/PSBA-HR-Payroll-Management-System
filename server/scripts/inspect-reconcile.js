/** Print HR-side details for the 3 suspected-typo employees (for verification). */
require("dotenv").config();
const prisma = require("../src/utils/prisma");
const norm = (c) => String(c || "").replace(/\D/g, "");
const HR_CNICS = ["3310470904415", "3620206148081", "3310479345285"];

(async () => {
  const all = await prisma.employee.findMany({
    where: { is_deleted: false },
    select: {
      cnic: true, full_name: true, father_husband_name: true, gender: true,
      date_of_birth: true, mobile_number: true, status: true,
      employmentRecords: {
        where: { is_current: true, is_deleted: false },
        select: {
          organization: true, office_location: true, joining_date: true,
          employment_status: true,
          department: { select: { name: true } },
          designation: { select: { title: true } },
          location: { select: { name: true, type: true } },
        },
      },
    },
  });
  const byCnic = new Map(all.map((e) => [norm(e.cnic), e]));
  console.log("=== HR records for the 3 suspected typos ===");
  for (const c of HR_CNICS) {
    const e = byCnic.get(c);
    if (!e) { console.log(`\n[${c}] NOT FOUND in HR`); continue; }
    const j = e.employmentRecords[0] || {};
    console.log(`\nHR CNIC ${c}  (stored: ${e.cnic})`);
    console.log(`  Name:        ${e.full_name}`);
    console.log(`  Father:      ${e.father_husband_name || "-"}`);
    console.log(`  Gender/DOB:  ${e.gender || "-"} / ${e.date_of_birth ? e.date_of_birth.toISOString().slice(0,10) : "-"}`);
    console.log(`  Mobile:      ${e.mobile_number || "-"}`);
    console.log(`  Status:      ${e.status || "-"}`);
    console.log(`  Department:  ${j.department?.name || "-"}`);
    console.log(`  Designation: ${j.designation?.title || "-"}`);
    console.log(`  Location:    ${j.location?.name || j.office_location || "-"} (${j.location?.type || "-"})`);
    console.log(`  Joined:      ${j.joining_date ? j.joining_date.toISOString().slice(0,10) : "-"}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
