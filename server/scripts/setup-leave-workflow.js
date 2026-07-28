// Idempotent setup for the HR-approved leave workflow:
//   - creates the "Regional Incharge" role (stage-1 recommender for
//     bazaar/location leaves) with the permissions its screens need
// Run on production after deploy:  node scripts/setup-leave-workflow.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROLE_NAME = "Regional Incharge";
const PERMISSION_KEYS = ["leaves.read"]; // approvals queue + acting use canAct(read)

(async () => {
  let role = await prisma.role.findUnique({ where: { name: ROLE_NAME } });
  if (!role) {
    role = await prisma.role.create({
      data: { name: ROLE_NAME, type: "custom", enabled: true, is_deleted: false },
    });
    console.log(`created role "${ROLE_NAME}" (#${role.id})`);
  } else {
    if (role.is_deleted || !role.enabled) {
      role = await prisma.role.update({ where: { id: role.id }, data: { is_deleted: false, enabled: true } });
      console.log(`re-enabled role "${ROLE_NAME}"`);
    } else {
      console.log(`role "${ROLE_NAME}" already exists (#${role.id})`);
    }
  }

  for (const key of PERMISSION_KEYS) {
    const perm = await prisma.permission.findUnique({ where: { key } });
    if (!perm) {
      console.warn(`permission "${key}" not found — skipped (check permission seed)`);
      continue;
    }
    await prisma.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
      update: {},
      create: { role_id: role.id, permission_id: perm.id },
    });
    console.log(`ensured permission ${key} on ${ROLE_NAME}`);
  }

  // The balance guard's escape hatch must exist as a selectable type
  const LWP = "Leave Without Pay";
  const lwp = await prisma.leaveType.findUnique({ where: { name: LWP } });
  if (!lwp) {
    await prisma.leaveType.create({ data: { name: LWP, is_active: true, is_deleted: false } });
    console.log(`created leave type "${LWP}"`);
  } else if (lwp.is_deleted || !lwp.is_active) {
    await prisma.leaveType.update({ where: { id: lwp.id }, data: { is_deleted: false, is_active: true } });
    console.log(`re-enabled leave type "${LWP}"`);
  } else {
    console.log(`leave type "${LWP}" already exists`);
  }

  const assignments = await prisma.regionalAssignment.count();
  console.log(`regional assignments currently configured: ${assignments}`);
  console.log("Done. Create Regional Incharge user accounts in the Users admin and assign their locations.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
