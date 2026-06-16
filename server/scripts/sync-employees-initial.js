/**
 * One-time initial reconciliation of the Attendance System roster against HR.
 * CNIC is the single source of truth and join key for both systems.
 *
 *   Dry run (report only):  node scripts/sync-employees-initial.js
 *   Apply (create+update):  node scripts/sync-employees-initial.js --push
 *
 * Matched (CNIC in both) -> updated with HR data (face/fingerprint enrollment +
 * attendance history preserved, since they key on CNIC).
 * HR-only -> created on the droplet.
 * Attendance-only (orphans) -> reported, NOT modified (review before removing).
 */
require("dotenv").config();
const prisma = require("../src/utils/prisma");
const { pushEmployees, CONFIG } = require("../src/jobs/attendanceSync");

const norm = (c) => String(c || "").replace(/\D/g, "");

async function fetchDropletRoster() {
  const res = await fetch(`${CONFIG.apiUrl}/employees?limit=10000`, {
    headers: { "x-admin-token": CONFIG.token },
  });
  if (!res.ok) throw new Error(`droplet GET /employees -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const doPush = process.argv.includes("--push");
  if (!CONFIG.apiUrl || !CONFIG.token) {
    console.error("ERROR: set ATTENDANCE_API_URL and ATTENDANCE_API_TOKEN in server/.env first.");
    process.exit(1);
  }

  // HR employees (non-deleted), keyed by normalized CNIC.
  const hrEmps = await prisma.employee.findMany({
    where: { is_deleted: false },
    select: { cnic: true, full_name: true },
  });
  const hrByCnic = new Map();
  let hrBadCnic = 0;
  for (const e of hrEmps) {
    const c = norm(e.cnic);
    if (!c) { hrBadCnic++; continue; }
    hrByCnic.set(c, e);
  }

  // Attendance roster from the droplet, keyed by normalized CNIC.
  const att = await fetchDropletRoster();
  const attByCnic = new Map(att.map((e) => [norm(e.cnic), e]));

  const matched = [];
  const newInHr = [];
  for (const [c, e] of hrByCnic) {
    if (attByCnic.has(c)) matched.push(c);
    else newInHr.push(e);
  }
  const orphans = [];
  for (const [c, e] of attByCnic) {
    if (c && !hrByCnic.has(c)) orphans.push(e);
  }

  console.log("\n=== Employee reconciliation (CNIC-keyed) ===");
  console.log(`HR employees (valid CNIC):    ${hrByCnic.size}${hrBadCnic ? `   (+${hrBadCnic} skipped: blank/invalid CNIC)` : ""}`);
  console.log(`Attendance roster:            ${attByCnic.size}`);
  console.log(`Matched -> will UPDATE:       ${matched.length}`);
  console.log(`HR-only -> will CREATE:       ${newInHr.length}`);
  console.log(`Attendance-only (orphans):    ${orphans.length}   (left untouched)`);

  if (newInHr.length) {
    console.log(`\n-- New hires to create (showing ${Math.min(newInHr.length, 25)}/${newInHr.length}) --`);
    newInHr.slice(0, 25).forEach((e) => console.log(`   ${norm(e.cnic)}   ${e.full_name}`));
  }
  // Cross-check: orphans and new-hires that share a name are almost certainly the
  // SAME person with a mistyped CNIC in one system. Pushing would duplicate them
  // and orphan their face/fingerprint enrollment. Fix the CNIC before pushing.
  const normName = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
  const orphanByName = new Map();
  orphans.forEach((e) => orphanByName.set(normName(e.fullName || e.name), e));
  const likelyTypos = [];
  for (const e of newInHr) {
    const o = orphanByName.get(normName(e.full_name));
    if (o) likelyTypos.push({ name: e.full_name, hrCnic: norm(e.cnic), attCnic: norm(o.cnic) });
  }
  if (likelyTypos.length) {
    console.log(`\n!! LIKELY CNIC TYPOS — same name, different CNIC (${likelyTypos.length}) !!`);
    console.log("   Same person in both systems. Fix the wrong CNIC BEFORE pushing, or you");
    console.log("   will create duplicates and detach existing face/fingerprint enrollment.");
    likelyTypos.forEach((t) =>
      console.log(`   ${t.name}:  HR=${t.hrCnic}  vs  attendance=${t.attCnic}`)
    );
  }

  if (orphans.length) {
    const typoCnics = new Set(likelyTypos.map((t) => t.attCnic));
    const trueOrphans = orphans.filter((e) => !typoCnics.has(norm(e.cnic)));
    console.log(`\n-- Orphans: in attendance, NOT in HR (${trueOrphans.length} after excluding likely typos) --`);
    trueOrphans.slice(0, 25).forEach((e) => console.log(`   ${norm(e.cnic)}   ${e.fullName || e.name || ""}`));
    console.log("   -> ex-employees or people missing from HR. Their enrollment & history are kept.");
    console.log("      Add them to HR (preferred), or deactivate later — do NOT delete blindly.");
  }

  if (!doPush) {
    console.log("\nDRY RUN — nothing changed. Re-run with  --push  to apply.\n");
    return;
  }

  console.log("\nApplying: pushing full HR roster to the attendance system...");
  const result = await pushEmployees({ full: true });
  console.log("Push result:", JSON.stringify(result));
  const after = await fetchDropletRoster();
  console.log(`Attendance roster after push: ${after.length}`);
  console.log("Done.\n");
}

main()
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
