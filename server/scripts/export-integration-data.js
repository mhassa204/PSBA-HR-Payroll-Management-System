/**
 * Read-only export of HR reference data for the AME-Monitoring integration.
 * Produces JSON + a summary markdown under server/prisma/import/integration-export/.
 * Does not modify the database.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const OUT = path.join(__dirname, "..", "prisma", "import", "integration-export");
fs.mkdirSync(OUT, { recursive: true });
const write = (f, d) =>
  fs.writeFileSync(path.join(OUT, f), JSON.stringify(d, null, 1), "utf8");

(async () => {
  // ---------- 1. LOCATIONS ----------
  const locations = await prisma.location.findMany({
    include: { district: true, city: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const staffCounts = await prisma.employment.groupBy({
    by: ["location_id"],
    where: { is_current: true, is_deleted: false },
    _count: { _all: true },
  });
  const cntByLoc = Object.fromEntries(
    staffCounts.map((r) => [r.location_id, r._count._all])
  );

  const locOut = locations.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    district: l.district ? l.district.name : null,
    city: l.city ? l.city.name : null,
    full_address: l.full_address,
    opening_time: l.opening_time,
    closing_time: l.closing_time,
    is_active: l.is_active,
    is_deleted: l.is_deleted,
    current_staff: cntByLoc[l.id] || 0,
    updatedAt: l.updatedAt,
  }));
  write("locations.json", locOut);

  // ---------- 2. CURRENT STAFF POSTINGS ----------
  const emps = await prisma.employee.findMany({
    where: { is_deleted: false },
    select: {
      id: true, cnic: true, full_name: true, email: true,
      mobile_number: true, whatsapp_number: true, status: true,
      employmentRecords: {
        where: { is_current: true, is_deleted: false },
        take: 1,
        select: {
          organization: true, employment_status: true,
          reporting_officer_id: true, updatedAt: true,
          designation: { select: { title: true } },
          department: { select: { name: true } },
          location: { select: { id: true, name: true, type: true } },
        },
      },
    },
    orderBy: { full_name: "asc" },
  });

  const staff = emps.map((e) => {
    const em = e.employmentRecords[0] || {};
    return {
      employee_id: e.id,
      cnic: e.cnic,
      full_name: e.full_name,
      email: e.email,
      mobile_number: e.mobile_number,
      whatsapp_number: e.whatsapp_number,
      status: e.status,
      organization: em.organization || null,
      employment_status: em.employment_status || null,
      designation: em.designation ? em.designation.title : null,
      department: em.department ? em.department.name : null,
      location_id: em.location ? em.location.id : null,
      location_name: em.location ? em.location.name : null,
      location_type: em.location ? em.location.type : null,
      reporting_officer_id: em.reporting_officer_id || null,
      employment_updatedAt: em.updatedAt || null,
    };
  });
  write("staff-current.json", staff);

  // ---------- 3. MASTER LISTS ----------
  const [designations, departments, districts, cities] = await Promise.all([
    prisma.designation.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.district.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.city.findMany({ select: { id: true, name: true, district_id: true }, orderBy: { name: "asc" } }),
  ]);
  write("master-data.json", { designations, departments, districts, cities });

  // ---------- 4. DIAGNOSTICS ----------
  const byType = {};
  locOut.forEach((l) => { byType[l.type] = (byType[l.type] || 0) + 1; });

  const byDesig = {};
  staff.forEach((s) => {
    const k = s.designation || "(none)";
    byDesig[k] = (byDesig[k] || 0) + 1;
  });

  const BAZAAR_ROLES = ["Sahulat Bazaar Incharge", "Sahulat Bazaar Supervisor", "Record Keeper"];
  const locWithRole = new Set(
    staff.filter((s) => BAZAAR_ROLES.includes(s.designation)).map((s) => s.location_id)
  );
  const bazaarLocs = locOut.filter(
    (l) => ["BAZAAR", "MOBILE_BAZAAR"].includes(l.type) && !l.is_deleted
  );
  const locsMissingIncharge = bazaarLocs
    .filter((l) => !locWithRole.has(l.id))
    .map((l) => ({ id: l.id, name: l.name, type: l.type, staff: l.current_staff }));

  const shortNames = staff
    .filter((s) => !s.full_name || s.full_name.trim().length < 3)
    .map((s) => ({ cnic: s.cnic, full_name: s.full_name }));

  const phoneMap = {};
  staff.forEach((s) => {
    const d = String(s.mobile_number || "").replace(/\D/g, "").slice(-10);
    if (d.length === 10) (phoneMap[d] = phoneMap[d] || []).push(s.full_name);
  });
  const sharedPhones = Object.entries(phoneMap)
    .filter(([, v]) => v.length > 1)
    .map(([p, v]) => ({ phone: "..." + p.slice(-4), names: v }));

  // specific CNICs to verify (including soft-deleted)
  const CHECK = ["3520142793937", "3520295368762", "3520115336235"];
  const checked = [];
  for (const c of CHECK) {
    const rows = await prisma.employee.findMany({
      where: { cnic: { contains: c.slice(-7) } },
      select: { id: true, cnic: true, full_name: true, is_deleted: true, status: true },
    });
    checked.push({ query: c, found: rows });
  }
  const nameOfZaigham = await prisma.employee.findMany({
    where: { cnic: { contains: "1533623" } },
    select: { cnic: true, full_name: true, is_deleted: true },
  });

  const diagnostics = {
    generatedAt: new Date().toISOString(),
    totals: {
      locations: locOut.length,
      locationsByType: byType,
      employees_current: staff.length,
      employees_with_location: staff.filter((s) => s.location_id).length,
      employees_without_location: staff.filter((s) => !s.location_id).length,
    },
    designationCounts: byDesig,
    bazaarLocationsMissingInchargeOrSupervisor: locsMissingIncharge,
    employeesWithSuspiciousNames: shortNames,
    sharedMobileNumbers: sharedPhones,
    cnicChecks: checked,
    zaighamNameCheck: nameOfZaigham,
  };
  write("diagnostics.json", diagnostics);

  // ---------- 5. HUMAN SUMMARY ----------
  const md = [
    "# HR Integration Data Export",
    "",
    `Generated: ${diagnostics.generatedAt}`,
    "",
    "## Totals",
    `- Locations: **${locOut.length}** — ` +
      Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", "),
    `- Current employees: **${staff.length}** ` +
      `(with posting: ${diagnostics.totals.employees_with_location}, ` +
      `without: ${diagnostics.totals.employees_without_location})`,
    "",
    "## Bazaar locations with NO Incharge/Supervisor/Record Keeper",
    locsMissingIncharge.length
      ? locsMissingIncharge.map((l) => `- ${l.name} (${l.type}, staff ${l.staff})`).join("\n")
      : "- none",
    "",
    "## Data anomalies",
    `- Suspicious names: ${shortNames.length}`,
    `- Shared mobile numbers: ${sharedPhones.length}`,
    "",
    "## Designation counts",
    ...Object.entries(byDesig)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "SUMMARY.md"), md, "utf8");

  console.log(md);
  console.log("\nFiles written to:", OUT);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("EXPORT FAILED:", e);
  await prisma.$disconnect();
  process.exit(1);
});
