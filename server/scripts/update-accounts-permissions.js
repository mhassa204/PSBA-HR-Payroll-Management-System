const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateAccountsPermissions() {
  try {
    console.log("Updating Accounts role permissions...");

    // Permissions needed for payroll access
    const requiredPermissions = [
      "employees.read",
      "departments.read",
      "designations.read",
      "locations.read",
      "scale-grades.read",
    ];

    // Get or create permissions
    const permissions = [];
    for (const key of requiredPermissions) {
      const perm = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          resource: key.split(".")[0] || "custom",
          action: key.split(".")[1] || "custom",
        },
      });
      permissions.push(perm);
    }

    // Find Accounts roles
    const accountsManager = await prisma.role.findFirst({
      where: { name: "Accounts Manager", is_deleted: false },
      include: { rolePermissions: { include: { permission: true } } },
    });

    const accountsUser = await prisma.role.findFirst({
      where: { name: "Accounts User", is_deleted: false },
      include: { rolePermissions: { include: { permission: true } } },
    });

    // Function to add missing permissions to a role
    const addPermissionsToRole = async (role) => {
      if (!role) {
        console.log(`Role not found`);
        return;
      }

      const existingPermKeys = new Set(
        role.rolePermissions.map((rp) => rp.permission.key)
      );

      const missingPerms = permissions.filter(
        (p) => !existingPermKeys.has(p.key)
      );

      if (missingPerms.length === 0) {
        console.log(`  ✓ ${role.name}: All permissions already exist`);
        return;
      }

      // Add missing permissions
      for (const perm of missingPerms) {
        await prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: perm.id,
          },
        });
        console.log(`  ✓ ${role.name}: Added permission ${perm.key}`);
      }
    };

    if (accountsManager) {
      await addPermissionsToRole(accountsManager);
    } else {
      console.log("  ⚠ Accounts Manager role not found");
    }

    if (accountsUser) {
      await addPermissionsToRole(accountsUser);
    } else {
      console.log("  ⚠ Accounts User role not found");
    }

    console.log("\n✅ Accounts permissions updated successfully!");
  } catch (error) {
    console.error("❌ Error updating permissions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAccountsPermissions();
