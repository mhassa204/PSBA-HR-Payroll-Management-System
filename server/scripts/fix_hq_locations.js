/**
 * Repair for the July 2026 import artifact: the workbook called the head
 * office "Head Quarter" but the production location row is named differently
 * (e.g. "Headquarters"), so the new HQ employees were created with NO linked
 * location — only the raw text in employment.office_location. They show up on
 * the attendance dashboard as a phantom "Head Quarter" workplace group.
 *
 * This links every current employment that has location_id NULL and an
 * office_location naming the head office to the real HEAD_OFFICE location
 * row. Idempotent; touches nothing else (departments still need HR input).
 *
 * Usage:
 *   node scripts/fix_hq_locations.js                    # DRY RUN (default)
 *   node scripts/fix_hq_locations.js --apply            # execute
 *   node scripts/fix_hq_locations.js --location-id=NN   # disambiguate if
 *                                                       # multiple HEAD_OFFICE rows exist
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const LOCATION_ID_ARG = (process.argv.find((a) => a.startsWith("--location-id=")) || "")
  .split("=")[1];

// office_location spellings that mean "the head office"
const HQ_LABELS = ["Head Quarter", "Head Quarters", "Headquarter", "Headquarters", "Head Office"];

async function main() {
  console.log(`${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"}\n`);

  // 1. Resolve the real head-office location
  const headOffices = await prisma.location.findMany({
    where: { type: "HEAD_OFFICE", is_deleted: false, is_active: true },
    select: { id: true, name: true },
  });
  let target = null;
  if (LOCATION_ID_ARG) {
    target = headOffices.find((l) => l.id === Number(LOCATION_ID_ARG)) || null;
    if (!target) {
      console.error(`--location-id=${LOCATION_ID_ARG} is not an active HEAD_OFFICE location.`);
      process.exitCode = 1;
      return;
    }
  } else if (headOffices.length === 1) {
    target = headOffices[0];
  } else if (headOffices.length === 0) {
    console.error("No active HEAD_OFFICE location exists. Create one in Settings → Locations first.");
    process.exitCode = 1;
    return;
  } else {
    console.error("Multiple HEAD_OFFICE locations found — pick one with --location-id=<id>:");
    for (const l of headOffices) console.error(`   ${l.id}  ${l.name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Head office location: [${target.id}] ${target.name}\n`);

  // 2. Find the orphaned employments
  const rows = await prisma.employment.findMany({
    where: {
      is_current: true,
      is_deleted: false,
      location_id: null,
      office_location: { in: HQ_LABELS },
    },
    include: { employee: { select: { id: true, full_name: true, cnic: true } } },
    orderBy: { employee: { full_name: "asc" } },
  });

  if (!rows.length) {
    console.log("Nothing to fix — no current employment has a NULL location with a head-office label.");
    return;
  }

  console.log(`Employments to link to "${target.name}": ${rows.length}`);
  for (const r of rows) {
    console.log(`  + ${r.employee.full_name} (${r.employee.cnic}) — office_location "${r.office_location}"`);
  }

  if (APPLY) {
    const { count } = await prisma.employment.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { location_id: target.id },
    });
    console.log(`\n✅ Linked ${count} employment(s) to [${target.id}] ${target.name}.`);
    console.log("The attendance sync will push the corrected records on its next 10-minute tick;");
    console.log('the phantom "Head Quarter" group disappears from the dashboard after that.');
    console.log("Departments for these employees still need to be set in the HR UI (not in the workbook).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
