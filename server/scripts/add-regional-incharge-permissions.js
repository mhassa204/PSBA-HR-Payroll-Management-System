/**
 * Regional Incharge module — RBAC. Idempotent, safe to re-run on a live
 * database. Sessions pick the changes up on the next /me call.
 *
 * Keys:
 *   regional_incharge.read    — see who oversees which bazaars
 *   regional_incharge.manage  — create/rename regions, move bazaars between them
 *
 * Grants:
 *   Super Admin        (implicit "*", nothing to do)
 *   Establishment      read + manage   — HR owns the structure
 *   Operations         read + manage   — they run the bazaars day to day
 *   Senior Management  read
 *   Management         read
 *   Regional Incharge  read            — sees his own region
 *
 * Usage:
 *   node scripts/add-regional-incharge-permissions.js          # DRY RUN
 *   node scripts/add-regional-incharge-permissions.js --apply  # execute
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const NEW_KEYS = [
  { key: "regional_incharge.read", description: "View regional incharges and their bazaars" },
  { key: "regional_incharge.manage", description: "Create, edit and assign regional incharges" },
];

const ROLE_MATRIX = {
  Establishment: ["regional_incharge.read", "regional_incharge.manage"],
  Operations: ["regional_incharge.read", "regional_incharge.manage"],
  "Senior Management": ["regional_incharge.read"],
  Management: ["regional_incharge.read"],
  "Regional Incharge": ["regional_incharge.read"],
  "Director General": ["regional_incharge.read"],
};

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY RUN (pass --apply to execute)"}\n`);

  for (const { key, description } of NEW_KEYS) {
    const exists = await prisma.permission.findUnique({ where: { key } });
    console.log(`permission ${key}: ${exists ? "exists" : "will create"}`);
    if (APPLY && !exists) {
      await prisma.permission.create({
        data: {
          key,
          resource: key.split(".")[0],
          action: key.split(".").slice(1).join("."),
          description,
        },
      });
    }
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: NEW_KEYS.map((k) => k.key) } },
  });
  const permByKey = new Map(perms.map((p) => [p.key, p]));

  for (const [roleName, keys] of Object.entries(ROLE_MATRIX)) {
    const role = await prisma.role.findFirst({ where: { name: roleName, is_deleted: false } });
    if (!role) {
      console.warn(`  role "${roleName}" not found — skipping`);
      continue;
    }
    const grants = await prisma.rolePermission.findMany({
      where: { role_id: role.id },
      include: { permission: true },
    });
    const granted = new Set(grants.map((g) => g.permission.key));

    for (const key of keys) {
      if (granted.has(key)) continue;
      const perm = permByKey.get(key);
      console.log(`${roleName}: +${key}`);
      if (APPLY && perm) {
        await prisma.rolePermission.create({
          data: { role_id: role.id, permission_id: perm.id },
        });
      }
    }
  }

  if (APPLY) {
    console.log("\n--- verification ---");
    for (const roleName of Object.keys(ROLE_MATRIX)) {
      const role = await prisma.role.findFirst({ where: { name: roleName, is_deleted: false } });
      if (!role) continue;
      const grants = await prisma.rolePermission.findMany({
        where: { role_id: role.id },
        include: { permission: true },
      });
      const mine = grants
        .map((g) => g.permission.key)
        .filter((k) => k.startsWith("regional_incharge."))
        .sort();
      console.log(`  ${roleName.padEnd(20)} ${mine.join(", ") || "(none)"}`);
    }
  }
  console.log(APPLY ? "\nDone." : "\nDry run complete. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
