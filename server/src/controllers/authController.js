const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { decrypt } = require("../utils/cryptoUtil");

const authController = {
  login: async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password required" });
    }

    // Normalize inputs
    const emailNorm = String(email).trim();
    const passNorm = String(password).trim();

    // Only allow non-deleted users whose roles are enabled and not deleted
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: emailNorm, mode: 'insensitive' },
        is_deleted: false,
        role: { is: { is_deleted: false, enabled: true } },
      },
      include: { role: true, employee: true, department: true, location: true },
    });

    if (!user || decrypt(user.password) !== passNorm) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Load permissions for the user's role (normalized RBAC)
    let permissions = [];
    if (user.role?.name === "Super Admin") {
      permissions = ["*"];
    } else {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role_id: user.role_id },
        include: { permission: true },
      });
      permissions = rolePerms.map((rp) => rp.permission.key);
    }

    // Set session values
    req.session.user = {
      id: user.id,
      email: user.email,
      role: { id: user.role.id, name: user.role.name, type: user.role.type },
      permissions,
      employee_id: user.employee?.id || null,
      employee_code: user.employee?.employee_id || null,
      // New: persist department linkage for department-based accounts
      department_id: user.department_id || null,
      // New: persist location linkage for location-based accounts
      location_id: user.location_id || null,
    };

    res.json({ success: true, message: "Logged in", user: req.session.user });
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err)
        return res.status(500).json({ success: false, error: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out" });
    });
  },

  me: async (req, res) => {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }

    // Validate user still active and role still enabled; also ensure permissions present
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          id: req.session.user.id,
          is_deleted: false,
          role: { is: { is_deleted: false, enabled: true } },
        },
        include: {
          role: true,
          employee: true,
          department: true,
          location: true,
        },
      });

      if (!dbUser) {
        // Invalidate session if user/role is no longer valid
        req.session.destroy(() => {});
        res.clearCookie("connect.sid");
        return res
          .status(401)
          .json({ success: false, error: "Not authenticated" });
      }

      let permissions = req.session.user.permissions || [];
      if (!permissions || permissions.length === 0) {
        if (dbUser.role?.name === "Super Admin") {
          permissions = ["*"];
        } else {
          const rolePerms = await prisma.rolePermission.findMany({
            where: { role_id: dbUser.role_id },
            include: { permission: true },
          });
          permissions = rolePerms.map((rp) => rp.permission.key);
        }
      }

      req.session.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: {
          id: dbUser.role.id,
          name: dbUser.role.name,
          type: dbUser.role.type,
        },
        permissions,
        employee_id: dbUser.employee?.id || null,
        employee_code: dbUser.employee?.employee_id || null,
        // New: persist department linkage for department-based accounts
        department_id: dbUser.department_id || null,
        // New: persist location linkage for location-based accounts
        location_id: dbUser.location_id || null,
      };
      return res.json({ success: true, user: req.session.user });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to load permissions" });
    }
  },
};

module.exports = authController;
