/**
 * Idempotent, production-safe fix for the designation/department + role-tag issues:
 *  1. Associate the 42 HO office designations with their department (from
 *     prisma/import/designationDept.json). Field designations (Security & Parking
 *     Attendant, Sanitation Attendant, etc.) stay department-less by design.
 *  2. Remove the legacy demo role tags that aren't in the Excel data — keeps only
 *     the ones actually used (Anti Encroachment Squad, Anti Theft Cell).
 *
 * Usage (from server/):  node scripts/backfill_designation_dept.js
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const DESIG_DEPT = require("../prisma/import/designationDept.json");

const prisma = new PrismaClient();
const KEEP_ROLE_TAGS = ["Anti Encroachment Squad", "Anti Theft Cell"];

async function main() {
  console.log("🔧 Associating designations with departments...");
  let linked = 0, missing = 0;
  for (const [title, deptName] of Object.entries(DESIG_DEPT)) {
    const dept = await prisma.department.findFirst({ where: { name: deptName, is_deleted: false } });
    if (!dept) { missing++; continue; }
    // Update every (non-deleted) designation row with this title
    const res = await prisma.designation.updateMany({
      where: { title, is_deleted: false },
      data: { department_id: dept.id },
    });
    linked += res.count;
  }
  console.log(`✅ Linked ${linked} designation row(s) to departments (${missing} dept not found).`);

  // Field designations remain department-less (shown when no department is selected)
  const deptless = await prisma.designation.count({ where: { department_id: null, is_deleted: false } });
  console.log(`ℹ️  Department-less (field) designations: ${deptless}`);

  // Remove legacy demo role tags that aren't used
  console.log("🔧 Removing legacy role tags not in the Excel data...");
  const toRemove = await prisma.roleTag.findMany({
    where: { name: { notIn: KEEP_ROLE_TAGS }, is_deleted: false },
    select: { id: true, name: true, _count: { select: { employmentRecords: true } } },
  });
  let removed = 0, skipped = 0;
  for (const rt of toRemove) {
    if (rt._count.employmentRecords > 0) {
      console.log(`   ⚠️  Keeping "${rt.name}" — still linked to ${rt._count.employmentRecords} employment(s)`);
      skipped++;
      continue;
    }
    await prisma.roleTag.delete({ where: { id: rt.id } });
    removed++;
  }
  const remaining = await prisma.roleTag.findMany({ where: { is_deleted: false }, select: { name: true } });
  console.log(`✅ Removed ${removed} role tag(s)${skipped ? `, skipped ${skipped}` : ""}.`);
  console.log(`   Remaining role tags: ${remaining.map((r) => r.name).join(", ")}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
