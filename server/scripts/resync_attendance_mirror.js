/**
 * One-time repair: re-mirror EVERY punch from the attendance server.
 *
 * Two defects made existing mirror rows diverge from the source:
 *   1. attendanceDate was derived with a double timezone offset, filing every
 *      punch after 19:00 PK under the NEXT calendar day (evening checkouts
 *      disappeared from their real day in all HR attendance views).
 *   2. Punches edited on the attendance-control workbench before the
 *      correction-sync existed were never re-pulled, so the mirror kept
 *      pre-edit values.
 *
 * Resetting the pull cursor makes the regular pull re-fetch all punches and
 * overwrite each mirror row in place (idempotent upsert by source_id) using
 * the fixed date derivation and the source's current values. Safe to re-run.
 *
 * Usage (production HR server, after git pull):
 *   node scripts/resync_attendance_mirror.js
 */
const prisma = require("../src/utils/prisma");
const { pullAttendance, CONFIG } = require("../src/jobs/attendanceSync");

async function main() {
  if (!CONFIG.apiUrl || !CONFIG.token) {
    console.error("ATTENDANCE_API_URL / ATTENDANCE_API_TOKEN not configured in .env — aborting.");
    process.exitCode = 1;
    return;
  }

  await prisma.systemSetting.upsert({
    where: { key: "attendance_sync.cursor" },
    create: { key: "attendance_sync.cursor", category: "integration", value: { cursor: 0 } },
    update: { value: { cursor: 0 } },
  });
  console.log("Pull cursor reset — re-mirroring all punches from the attendance server…");
  console.log("(a few minutes for ~30k records; progress prints per completed run)");

  const result = await pullAttendance();
  console.log("Done:", JSON.stringify(result));
  if (result?.error) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode || 0));
