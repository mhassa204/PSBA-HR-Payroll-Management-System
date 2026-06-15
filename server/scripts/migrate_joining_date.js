/**
 * Production-safe, idempotent migration for requirement #2 (Initial Joining Record).
 *
 * For every Employment that has an effective_from but no joining_date yet, copy
 * effective_from -> joining_date, then clear effective_from and effective_till
 * (these are left empty/optional for now). Records already migrated are skipped,
 * so it is safe to run multiple times and on production.
 *
 * Usage (from server/):  node scripts/migrate_joining_date.js
 *
 * NOTE: run `npx prisma db push` (or your migration) FIRST so the joining_date /
 * appointment_letter_issue_date columns exist, then run this script.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Backfilling Employment.joining_date from effective_from...");

  const targets = await prisma.employment.findMany({
    where: { joining_date: null, effective_from: { not: null } },
    select: { id: true, effective_from: true },
  });
  console.log(`   Found ${targets.length} employment record(s) to migrate.`);

  let updated = 0;
  const BATCH = 200;
  for (let i = 0; i < targets.length; i += BATCH) {
    const slice = targets.slice(i, i + BATCH);
    await prisma.$transaction(
      slice.map((rec) =>
        prisma.employment.update({
          where: { id: rec.id },
          data: {
            joining_date: rec.effective_from,
            effective_from: null,
            effective_till: null,
          },
        })
      )
    );
    updated += slice.length;
    console.log(`   ...migrated ${updated}/${targets.length}`);
  }

  const remaining = await prisma.employment.count({
    where: { joining_date: null, effective_from: { not: null } },
  });
  console.log(`✅ Done. Migrated ${updated}. Remaining unmigrated: ${remaining}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Migration failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
