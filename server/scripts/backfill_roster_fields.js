/**
 * One-time backfill after the duty-roster rework schema push.
 * Idempotent and additive — safe to re-run on a live database.
 *
 * Sets approved_at = updatedAt for legacy APPROVED rosters (rows approved
 * before the approved_at column existed). Approved rosters are immutable
 * after the rework, so updatedAt is a stable proxy for the approval time.
 * The supersede rule ("latest approval wins") depends on this ordering.
 *
 * Usage:
 *   node scripts/backfill_roster_fields.js          # DRY RUN (default)
 *   node scripts/backfill_roster_fields.js --apply  # execute
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const pending = await prisma.dutyRoster.count({
    where: { status: "APPROVED", approved_at: null },
  });
  console.log(
    `${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"} — ` +
      `${pending} APPROVED roster(s) with empty approved_at`
  );
  if (!APPLY || pending === 0) return;

  const updated = await prisma.$executeRaw`
    UPDATE "DutyRoster"
    SET "approved_at" = "updatedAt"
    WHERE "status" = 'APPROVED' AND "approved_at" IS NULL
  `;
  console.log(`✅ Backfilled approved_at on ${updated} roster(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
