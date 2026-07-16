/**
 * Duty Roster rework — RBAC transition. Idempotent, safe to re-run on a live
 * database (no reseeding). Sessions pick the changes up on the next /me call.
 *
 * What it does:
 *   1. Creates the new permission keys: roster.approve, roster.read.all
 *   2. Applies the new role grant matrix:
 *        Employee           roster.read, roster.create
 *        Operations         roster.read, roster.create, roster.approve
 *        Senior Management  roster.read, roster.approve   (create removed)
 *        Management         roster.read, roster.approve   (create removed)
 *        Accounts Manager   roster.read, roster.approve   (create removed)
 *        Establishment      roster.read, roster.create, roster.read.all
 *      (Accounts User keeps its existing read/create grants untouched.)
 *   3. Retires roster.update / roster.delete / roster.status /
 *      roster.status.change entirely — grants first (including any custom
 *      roles), then the permission keys. Edit/delete are now gated by
 *      roster.create + creator-ownership in the controller.
 *
 * Usage:
 *   node scripts/update-roster-permissions.js          # DRY RUN (default)
 *   node scripts/update-roster-permissions.js --apply  # execute
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const NEW_KEYS = ["roster.approve", "roster.read.all"];
const RETIRE_KEYS = [
  "roster.update",
  "roster.delete",
  "roster.status",
  "roster.status.change",
];

const ROLE_MATRIX = {
  Employee: { ensure: ["roster.read", "roster.create"], remove: [] },
  Operations: { ensure: ["roster.read", "roster.create", "roster.approve"], remove: [] },
  "Senior Management": { ensure: ["roster.read", "roster.approve"], remove: ["roster.create"] },
  Management: { ensure: ["roster.read", "roster.approve"], remove: ["roster.create"] },
  "Accounts Manager": { ensure: ["roster.read", "roster.approve"], remove: ["roster.create"] },
  Establishment: {
    ensure: ["roster.read", "roster.create", "roster.read.all"],
    remove: [],
  },
};

async function main() {
  console.log(`${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"}\n`);

  // 1. Ensure new permission keys exist
  for (const key of NEW_KEYS) {
    const exists = await prisma.permission.findUnique({ where: { key } });
    console.log(`permission ${key}: ${exists ? "exists" : "will create"}`);
    if (APPLY && !exists) {
      await prisma.permission.create({
        data: {
          key,
          resource: key.split(".")[0] || "custom",
          action: key.split(".").slice(1).join(".") || "custom",
        },
      });
    }
  }

  const allKeys = [
    ...new Set([
      ...NEW_KEYS,
      ...RETIRE_KEYS,
      ...Object.values(ROLE_MATRIX).flatMap((m) => [...m.ensure, ...m.remove]),
    ]),
  ];
  const perms = await prisma.permission.findMany({ where: { key: { in: allKeys } } });
  const permByKey = new Map(perms.map((p) => [p.key, p]));

  // 2. Per-role grant changes
  for (const [roleName, matrix] of Object.entries(ROLE_MATRIX)) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, is_deleted: false },
    });
    if (!role) {
      console.warn(`⚠️  role "${roleName}" not found — skipping`);
      continue;
    }
    const grants = await prisma.rolePermission.findMany({
      where: { role_id: role.id },
      include: { permission: true },
    });
    const grantedKeys = new Set(grants.map((g) => g.permission.key));

    for (const key of matrix.ensure) {
      const perm = permByKey.get(key);
      if (!perm && !NEW_KEYS.includes(key)) {
        console.warn(`⚠️  permission "${key}" missing — cannot grant to ${roleName}`);
        continue;
      }
      if (!grantedKeys.has(key)) {
        console.log(`${roleName}: +${key}`);
        if (APPLY && perm) {
          await prisma.rolePermission.create({
            data: { role_id: role.id, permission_id: perm.id },
          });
        }
      }
    }
    for (const key of matrix.remove) {
      if (grantedKeys.has(key)) {
        const perm = permByKey.get(key);
        console.log(`${roleName}: -${key}`);
        if (APPLY && perm) {
          await prisma.rolePermission.deleteMany({
            where: { role_id: role.id, permission_id: perm.id },
          });
        }
      }
    }
  }

  // 3. Retire old keys globally (grants first, then the keys)
  const retirePerms = await prisma.permission.findMany({
    where: { key: { in: RETIRE_KEYS } },
  });
  for (const perm of retirePerms) {
    const grantCount = await prisma.rolePermission.count({
      where: { permission_id: perm.id },
    });
    console.log(`retire ${perm.key}: ${grantCount} grant(s) to drop, then delete key`);
    if (APPLY) {
      await prisma.rolePermission.deleteMany({ where: { permission_id: perm.id } });
      await prisma.permission.delete({ where: { id: perm.id } });
    }
  }
  if (!retirePerms.length) console.log("retired keys already gone");

  console.log(`\n${APPLY ? "✅ Applied" : "Dry run complete — nothing written"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
