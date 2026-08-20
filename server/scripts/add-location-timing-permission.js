/**
 * Let Operations maintain bazaar operational hours — and nothing else.
 *
 * Bazaar opening/closing times are printed on every duty roster form, so
 * Operations needs to keep them correct. They must NOT be able to rename,
 * relocate or delete a location, so this grants a narrow key rather than
 * locations.update:
 *
 *   locations.read          -> see the Locations settings screen
 *   locations.timing.update -> PATCH /locations/:id/timing only
 *
 * Idempotent; safe to re-run. Sessions pick it up on the next /me call.
 *
 * Usage:
 *   node scripts/add-location-timing-permission.js          # DRY RUN
 *   node scripts/add-location-timing-permission.js --apply  # execute
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const NEW_KEY = {
  key: "locations.timing.update",
  description: "Update bazaar operational (opening/closing) hours only",
};

// Roles that may keep bazaar trading hours up to date
const GRANT = {
  Operations: ["locations.read", "locations.timing.update"],
  Establishment: ["locations.timing.update"],
};

async function main() {
  console.log(APPLY ? "APPLY" : "DRY RUN (pass --apply to execute)", "\n");

  const existing = await prisma.permission.findUnique({ where: { key: NEW_KEY.key } });
  console.log(`permission ${NEW_KEY.key}: ${existing ? "exists" : "will create"}`);
  if (APPLY && !existing) {
    await prisma.permission.create({
      data: {
        key: NEW_KEY.key,
        resource: "locations",
        action: "timing.update",
        description: NEW_KEY.description,
      },
    });
  }

  const keys = [...new Set(Object.values(GRANT).flat())];
  const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(perms.map((p) => [p.key, p]));

  for (const [roleName, wanted] of Object.entries(GRANT)) {
    const role = await prisma.role.findFirst({ where: { name: roleName, is_deleted: false } });
    if (!role) {
      console.warn(`  role "${roleName}" not found — skipping`);
      continue;
    }
    const held = new Set(
      (
        await prisma.rolePermission.findMany({
          where: { role_id: role.id },
          include: { permission: true },
        })
      ).map((g) => g.permission.key)
    );

    // Guard: this script must never hand out full location editing
    for (const risky of ["locations.update", "locations.create", "locations.delete"]) {
      if (held.has(risky)) {
        console.warn(`  note: ${roleName} already holds ${risky} (not granted by this script)`);
      }
    }

    for (const key of wanted) {
      if (held.has(key)) continue;
      const perm = byKey.get(key);
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
    for (const roleName of Object.keys(GRANT)) {
      const role = await prisma.role.findFirst({ where: { name: roleName, is_deleted: false } });
      if (!role) continue;
      const held = (
        await prisma.rolePermission.findMany({
          where: { role_id: role.id },
          include: { permission: true },
        })
      )
        .map((g) => g.permission.key)
        .filter((k) => k.startsWith("locations."))
        .sort();
      console.log(`  ${roleName.padEnd(16)} ${held.join(", ") || "(none)"}`);
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
