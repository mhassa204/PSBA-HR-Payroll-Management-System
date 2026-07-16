/**
 * Roster coverage — create login accounts for every active non-HQ location and
 * every HQ department that lacks one, so each employee's duty roster can be
 * created by the owning account.
 *
 * Idempotent and additive: never touches existing users; email conflicts are
 * skipped and reported.
 *
 * Location emails come from the official PSBA bazaar directory
 * (prisma/import/psba_bazaar_directory.json, site_email fields, provided by
 * management). Locations that don't match the directory (or whose entry has no
 * email) get a generated slug: <distinctive>@psba.gop.pk, mobile bazaars
 * <distinctive>.otg@psba.gop.pk.
 *
 * Also reports employees whose roster can NOT be routed (HQ staff with no
 * department, employments with no location) — an HR data task, not fixable here.
 *
 * Usage:
 *   node scripts/create_roster_accounts.js          # DRY RUN (default)
 *   node scripts/create_roster_accounts.js --apply  # execute
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("../src/utils/cryptoUtil");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const DEFAULT_PASSWORD = "abc123";
const DIRECTORY_PATH = path.join(__dirname, "..", "prisma", "import", "psba_bazaar_directory.json");

// Fixed department account emails (existing style: establishment@, accounts@, devops@ ...)
const DEPARTMENT_EMAILS = {
  "Admin Department": "admin.dept@psba.gop.pk", // admin@ is the Super Admin account
  "Audit Department": "audit@psba.gop.pk",
  "Civil Department": "civil@psba.gop.pk",
  "Electrical Department": "electrical@psba.gop.pk",
  "Home Delivery Department": "homedelivery@psba.gop.pk",
  "Legal Department": "legal@psba.gop.pk",
  "Media Department": "media@psba.gop.pk",
  "Monitoring Department": "monitoring@psba.gop.pk",
  "Projects & Management Unit Department": "pmu@psba.gop.pk",
};

const STOP_WORDS = new Set([
  "sahulat", "model", "cart", "bazaar", "bazar", "on", "the", "go", "otg",
]);

function nameTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));
}

function slugFromLocation(loc) {
  const tokens = nameTokens(loc.name);
  const base = tokens.join("").slice(0, 24) || `loc${loc.id}`;
  const isMobile = loc.type === "MOBILE_BAZAAR" || /on the go/i.test(loc.name);
  return `${base}${isMobile ? ".otg" : ""}@psba.gop.pk`;
}

// Match an HR location against the official directory by token overlap
function matchDirectory(loc, directory) {
  const locTokens = nameTokens(loc.name);
  if (!locTokens.length) return null;
  const locSet = new Set(locTokens);
  let best = null;
  for (const entry of directory) {
    const dirTokens = nameTokens(entry.name);
    if (!dirTokens.length) continue;
    const overlap = dirTokens.filter((t) => locSet.has(t)).length;
    const score = overlap / Math.max(locTokens.length, dirTokens.length);
    if (score > (best?.score ?? 0)) best = { entry, score };
  }
  // Require a strong match: identical token sets, or (for multi-token names)
  // the shorter name fully covered by the longer. A single shared token like
  // "Layyah" or "Rawalpindi" is NOT enough — it mismatches sibling sites.
  if (best && best.score >= 0.99) return best.entry;
  if (best) {
    const dirTokens = nameTokens(best.entry.name);
    const [shorter, longer] =
      dirTokens.length <= locTokens.length ? [dirTokens, locTokens] : [locTokens, dirTokens];
    const longerSet = new Set(longer);
    const covered = shorter.length && shorter.every((t) => longerSet.has(t));
    if (covered && (shorter.length >= 2 || shorter.length === longer.length)) {
      return best.entry;
    }
  }
  return null;
}

async function main() {
  console.log(`${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"}\n`);

  const directory = JSON.parse(fs.readFileSync(DIRECTORY_PATH, "utf-8")).bazaars || [];
  const employeeRole = await prisma.role.findFirst({
    where: { name: "Employee", is_deleted: false },
  });
  if (!employeeRole) throw new Error("Employee role not found");

  const existingUsers = await prisma.user.findMany({
    where: { is_deleted: false },
    select: { email: true, location_id: true, department_id: true },
  });
  const usedEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // ---------- Locations ----------
  const locations = await prisma.location.findMany({
    where: { is_deleted: false, is_active: true, type: { not: "HEAD_OFFICE" } },
    include: { users: { where: { is_deleted: false }, select: { id: true } } },
    orderBy: { name: "asc" },
  });
  const missingLocs = locations.filter((l) => !l.users.length);

  console.log(`Locations without accounts: ${missingLocs.length}`);
  const plannedLocs = [];
  for (const loc of missingLocs) {
    const dirEntry = matchDirectory(loc, directory);
    let email = dirEntry?.site_email?.trim().toLowerCase() || null;
    let source = email ? `directory (${dirEntry.name})` : null;
    if (!email || usedEmails.has(email)) {
      // No directory match, empty email, or the official email already belongs
      // to another account (sibling site) -> generated slug
      email = slugFromLocation(loc);
      source = "generated slug";
    }
    if (usedEmails.has(email)) {
      console.log(`  ⚠️  ${loc.name}: email ${email} already in use — SKIPPED (resolve manually)`);
      continue;
    }
    usedEmails.add(email);
    plannedLocs.push({ loc, email, source });
    console.log(`  + ${email.padEnd(38)} -> ${loc.name} [${loc.type}] (${source})`);
  }

  // ---------- Departments ----------
  const departments = await prisma.department.findMany({
    where: { is_deleted: false },
    include: { users: { where: { is_deleted: false }, select: { id: true } } },
  });
  const missingDepts = departments.filter((d) => !d.users.length && DEPARTMENT_EMAILS[d.name]);
  const unknownMissing = departments.filter((d) => !d.users.length && !DEPARTMENT_EMAILS[d.name]);

  console.log(`\nDepartments without accounts: ${missingDepts.length}`);
  const plannedDepts = [];
  for (const dept of missingDepts) {
    const email = DEPARTMENT_EMAILS[dept.name];
    if (usedEmails.has(email)) {
      console.log(`  ⚠️  ${dept.name}: email ${email} already in use — SKIPPED`);
      continue;
    }
    usedEmails.add(email);
    plannedDepts.push({ dept, email });
    console.log(`  + ${email.padEnd(38)} -> ${dept.name}`);
  }
  for (const d of unknownMissing) {
    console.log(`  ⚠️  no email mapping for department "${d.name}" — skipped`);
  }

  // ---------- Create ----------
  if (APPLY) {
    for (const p of plannedLocs) {
      await prisma.user.create({
        data: {
          email: p.email,
          password: encrypt(DEFAULT_PASSWORD),
          role_id: employeeRole.id,
          location_id: p.loc.id,
          is_deleted: false,
        },
      });
    }
    for (const p of plannedDepts) {
      await prisma.user.create({
        data: {
          email: p.email,
          password: encrypt(DEFAULT_PASSWORD),
          role_id: employeeRole.id,
          department_id: p.dept.id,
          is_deleted: false,
        },
      });
    }
    console.log(`\n✅ Created ${plannedLocs.length} location + ${plannedDepts.length} department account(s) (password: ${DEFAULT_PASSWORD})`);
  }

  // ---------- Coverage report ----------
  const emps = await prisma.employment.findMany({
    where: {
      is_current: true,
      is_deleted: false,
      employee: { is_deleted: false, status: "Active" },
    },
    select: {
      employee: { select: { id: true, full_name: true, cnic: true } },
      location: {
        select: { id: true, name: true, type: true, users: { where: { is_deleted: false }, select: { id: true } } },
      },
      department: {
        select: { id: true, name: true, users: { where: { is_deleted: false }, select: { id: true } } },
      },
    },
  });
  const plannedLocIds = new Set(plannedLocs.map((p) => p.loc.id));
  const plannedDeptIds = new Set(plannedDepts.map((p) => p.dept.id));
  const uncoverable = [];
  for (const e of emps) {
    const locOk =
      e.location &&
      e.location.type !== "HEAD_OFFICE" &&
      (e.location.users.length || plannedLocIds.has(e.location.id));
    const deptOk =
      e.location?.type === "HEAD_OFFICE" &&
      e.department &&
      (e.department.users.length || plannedDeptIds.has(e.department.id));
    if (!locOk && !deptOk) uncoverable.push(e);
  }
  console.log(`\nCoverage after ${APPLY ? "apply" : "planned changes"}: ${emps.length - uncoverable.length}/${emps.length} active employments coverable`);
  if (uncoverable.length) {
    console.log("Employees whose roster can NOT be created (HR data fixes needed):");
    for (const e of uncoverable) {
      const why = !e.location
        ? "no location on current employment"
        : e.location.type === "HEAD_OFFICE"
        ? e.department
          ? `HQ dept "${e.department.name}" has no account`
          : "HQ employee with NO department"
        : `location "${e.location.name}" has no account`;
      console.log(`  - ${e.employee.full_name} (${e.employee.cnic || "no cnic"}): ${why}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
