const { PrismaClient } = require("@prisma/client");

const HardDeleteUtil = require("../src/utils/hardDeleteUtil");
const { encrypt } = require("../src/utils/cryptoUtil");
const { seedRealData } = require("./import/seedRealData");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Predeclare cross-section collections to avoid ReferenceError if sections reorder
  let createdDistricts = [];
  let createdCities = [];
  let createdEducationLevels = [];
  let createdEmployees = [];
  let createdUsers = [];
  // NEW: track employments & placeholder arrays referenced in summary
  let createdEmployments = [];
  let salaryRecords = [];
  let contractRecords = [];
  let employmentDocuments = [];
  // NEW: master locations collection
  let createdLocations = [];

  // Clear existing data using hard delete utility
  console.log("🧹 Cleaning existing data using hard delete...");

  // First: purge Travel (TADA) module to avoid FK violations on Employee delete
  console.log("🧹 Purging Travel (TADA) data...");
  // Updated for new expense claim schema (removed travelClaimItem & travelClaimReceipt)
  await prisma.travelClaimDocument.deleteMany({});
  await prisma.travelClaimSegment.deleteMany({});
  // New: purge accounts tranches and claim status history
  await prisma.travelClaimTrancheItem.deleteMany({});
  await prisma.travelClaimTranche.deleteMany({});
  await prisma.travelClaimStatusEntry.deleteMany({});
  await prisma.travelClaim.deleteMany({});
  await prisma.travelRequestStatusEntry.deleteMany({});
  await prisma.travelRequestEmployee.deleteMany({});
  await prisma.travelRequest.deleteMany({});

  // Get all existing records to hard delete them
  const existingEmployees = await prisma.employee.findMany({
    select: { id: true, full_name: true },
  });

  console.log(
    `Found ${existingEmployees.length} existing employees to clean up...`
  );

  for (const employee of existingEmployees) {
    console.log(
      `🗑️ Hard deleting employee: ${employee.full_name} (ID: ${employee.id})`
    );
    await HardDeleteUtil.hardDeleteEmployee(employee.id);
  }

  // New: Clean Duty Rosters (entries then rosters) to avoid FK issues with users/locations
  const existingRosterEntries = await prisma.dutyRosterEntry.deleteMany({});
  const existingRosters = await prisma.dutyRoster.deleteMany({});

  // Hard delete any remaining departments and designations
  const existingDepartments = await prisma.department.findMany({
    select: { id: true, name: true },
  });

  for (const dept of existingDepartments) {
    console.log(`🗑️ Hard deleting department: ${dept.name} (ID: ${dept.id})`);
    await HardDeleteUtil.hardDeleteDepartment(dept.id);
  }

  // Hard delete any remaining role tags and scale grades
  const existingRoleTags = await prisma.roleTag.findMany({
    select: { id: true, name: true },
  });

  for (const tag of existingRoleTags) {
    console.log(`🗑️ Hard deleting role tag: ${tag.name} (ID: ${tag.id})`);
    await prisma.roleTag.delete({ where: { id: tag.id } });
  }

  // New: clear travel rates before scale grades to avoid FK violations
  await prisma.travelRate.deleteMany({});

  const existingScaleGrades = await prisma.scaleGrade.findMany({
    select: { id: true, name: true },
  });

  for (const grade of existingScaleGrades) {
    console.log(
      `🗑️ Hard deleting scale grade: ${grade.name} (ID: ${grade.id})`
    );
    await prisma.scaleGrade.delete({ where: { id: grade.id } });
  }

  // Hard delete any existing users and roles
  console.log("🗑️ Cleaning existing users and roles...");

  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  for (const user of existingUsers) {
    console.log(`🗑️ Hard deleting user: ${user.email} (ID: ${user.id})`);
    await prisma.user.delete({ where: { id: user.id } });
  }

  // NEW: clear role-permissions and permissions before deleting roles
  console.log("🧹 Clearing role-permissions and permissions...");
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});

  const existingRoles = await prisma.role.findMany({
    select: { id: true, name: true },
  });

  for (const role of existingRoles) {
    console.log(`🗑️ Hard deleting role: ${role.name} (ID: ${role.id})`);
    await prisma.role.delete({ where: { id: role.id } });
  }

  // Hard delete any existing master locations
  const existingLocations = await prisma.location.findMany({
    select: { id: true, name: true },
  });
  for (const loc of existingLocations) {
    console.log(`🗑️ Hard deleting location: ${loc.name} (ID: ${loc.id})`);
    await prisma.location.delete({ where: { id: loc.id } });
  }

  // NEW: Clear Districts, Cities, and EducationLevels before seeding
  console.log("🧹 Clearing districts, cities, and education levels...");
  await prisma.city.deleteMany({});
  await prisma.district.deleteMany({});
  await prisma.educationLevel.deleteMany({});

  // Seed Districts
  console.log("🗺️ Seeding districts...");
  // ===== Seed REAL data (master data + 1,546 employees) from normalized JSON =====
  const realMaps = await seedRealData(prisma);

  // Expose created master data to later sections (users, bazaar accounts) via lookup arrays
  createdDistricts = Object.entries(realMaps.districtByName).map(([name, id]) => ({ name, id }));
  createdCities = [];
  createdEducationLevels = Object.entries(realMaps.levelByName).map(([name, id]) => ({ name, id }));
  createdLocations = Object.entries(realMaps.locByName).map(([name, id]) => ({ name, id }));
  const createdDepartments = Object.entries(realMaps.deptByName).map(([name, id]) => ({ name, id }));
  const createdScaleGrades = Object.entries(realMaps.gradeByName).map(([name, id]) => ({ name, id }));
  const createdDesignations = []; // designations created inside seedRealData (deptless)
  // Real employees, for linking functional/leadership accounts by name/CNIC
  createdEmployees = await prisma.employee.findMany({
    where: { is_deleted: false },
    select: { id: true, full_name: true, cnic: true },
  });

  // Seed role tags
  // Role tags come from the real data (Anti Encroachment Squad, Anti Theft Cell)
  // and are created in seedRealData. No demo/legacy tags here.
  const roleTags = [];

  console.log("🏷️ Seeding role tags...");
  const createdRoleTags = [];
  for (const tag of roleTags) {
    const roleTag = await prisma.roleTag.create({
      data: { ...tag, is_deleted: false },
    });
    console.log(`✅ Created Role Tag: ${roleTag.name} (${roleTag.category})`);
    createdRoleTags.push(roleTag);
  }

  // Seed roles - Updated for RBAC hierarchy: DG (BPS 19-20), Senior Management (BPS 18), Management (BPS 17)
  const roles = [
    // System Role - Super Admin (for system maintenance)
    {
      name: "Super Admin",
      type: "system",
      allowed_actions: ["*", "travel.read", "travel.create", "leaves.apply"],
      enabled: true,
      fields: ["*"],
    },

    // DG Role (BPS 19-20) - Director General with DG-specific access only
    {
      name: "Director General",
      type: "executive",
      allowed_actions: [
        // Dashboard access
        "dashboard.read",
        // Minimal, explicit DG privileges (no wildcard)
        "travel.read",
        // Visibility to Requests/Expense Claims screens
        "travel.create",
        "travel.claim.read",
        "travel.request.approve.dg",
        "travel.claim.approve.dg",
        "leaves.apply",
      ],
      enabled: true,
      fields: ["*"],
    },

    // Senior Management (BPS 18) - Additional Directors/Directors
    {
      name: "Senior Management",
      type: "senior",
      allowed_actions: [
        // TADA module only
        "travel.read",
        "travel.create",
        "travel.update",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.update",
        "travel.claim.submit",
        "travel.claim.status",
        // remove travel rates access from non-Accounts roles
        // Allow opening Manage screen for leadership visibility
        "travel.manage",
        // No OPS approvals here; use Operations role
        "leaves.apply",
        // Roster: potential HQ approvers (assignment enforced per roster)
        "roster.read",
        "roster.approve",
      ],
      enabled: true,
      fields: ["employee_personal", "employee_employment"],
    },

    // Management (BPS 17) - Assistant Directors
    {
      name: "Management",
      type: "management",
      allowed_actions: [
        // TADA module only (no Accounts processing)
        "travel.read",
        "travel.create",
        "travel.update",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.update",
        "travel.claim.submit",
        "travel.claim.status",
        // Allow opening Manage screen for ADs to participate in recommender/approval flows
        "travel.manage",
        "leaves.apply",
        // Roster: potential HQ approvers (assignment enforced per roster)
        "roster.read",
        "roster.approve",
      ],
      enabled: true,
      fields: ["employee_personal", "employee_employment"],
    },

    // Operations Role (department approver for OPS stage)
    {
      name: "Operations",
      type: "department",
      allowed_actions: [
        // TADA + OPS approvals + own creation
        "travel.read",
        "travel.manage",
        "travel.create",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.submit",
        "travel.claim.status",
        // OPS approvals
        "travel.request.approve.ops",
        "travel.claim.approve.ops",
        "leaves.apply",
        // Roster: creates own department roster; approves all location rosters
        "roster.read",
        "roster.create",
        "roster.approve",
      ],
      enabled: true,
      fields: ["employee_basic"],
    },

    // Accounts Manager (Special role for Accounts department head)
    {
      name: "Accounts Manager",
      type: "department",
      allowed_actions: [
        // TADA only + Accounts processing + own creation
        "travel.read",
        "travel.manage",
        "travel.create",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.submit",
        "travel.claim.process.start",
        "travel.claim.status",
        // Travel rates settings (read/manage)
        "travel.rates.read",
        "travel.rates.manage",
        // Accounts screens
        "tada.managed.entry",
        "accounts.tranches.access",
        // Payroll permissions (full control)
        "payroll.read",
        "payroll.write",
        // Read permissions for payroll filters
        "employees.read",
        "departments.read",
        "designations.read",
        "locations.read",
        "scale-grades.read",
        "leaves.apply",
        // Roster: potential HQ approvers (assignment enforced per roster)
        "roster.read",
        "roster.approve",
      ],
      enabled: true,
      fields: ["employee_personal", "employee_employment", "employee_salary"],
    },

    // Accounts User (For other users in Accounts department)
    {
      name: "Accounts User",
      type: "department",
      allowed_actions: [
        // TADA only + Accounts processing + own creation
        "travel.read",
        "travel.manage",
        "travel.create",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.submit",
        "travel.claim.process.start",
        "travel.claim.status",
        // Travel rates settings (read only)
        "travel.rates.read",
        "travel.rates.manage",
        // Accounts screens
        "tada.managed.entry",
        "accounts.tranches.access",
        // Payroll permissions (full control)
        "payroll.read",
        "payroll.write",
        // Read permissions for payroll filters
        "employees.read",
        "departments.read",
        "designations.read",
        "locations.read",
        "scale-grades.read",
        "leaves.apply",
        // Added to enable roster for bazaar/location accounts
        "roster.read",
        "roster.create",
      ],
      enabled: true,
      fields: ["employee_basic"],
    },

    // Establishment Role (department approver for verification stage)
    {
      name: "Establishment",
      type: "department",
      allowed_actions: [
        // Dashboard access
        "dashboard.read",
        // TADA only + Establishment verification + own creation
        "travel.read",
        "travel.manage",
        "travel.create",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.submit",
        "travel.claim.verify.establishment",
        "travel.claim.status",
        // Full Employee Module access
        "employees.read",
        "employees.create",
        "employees.update",
        "employees.delete",
        // Employment sub-module
        "employment.read",
        "employment.create",
        "employment.update",
        "employment.delete",
        // Employment granular management
        "employment.salary.create",
        "employment.salary.update",
        "employment.salary.delete",
        "employment.location.create",
        "employment.location.update",
        "employment.location.delete",
        "employment.contract.create",
        "employment.contract.update",
        "employment.contract.delete",
        // Settings module (read-only; exclude roles.read)
        "departments.read",
        "departments.create",
        "departments.update",
        "departments.delete",
        "designations.read",
        "designations.create",
        "designations.update",
        "designations.delete",
        "role-tags.read",
        "role-tags.create",
        "role-tags.update",
        "role-tags.delete",
        "scale-grades.read",
        "scale-grades.create",
        "scale-grades.update",
        "scale-grades.delete",
        "locations.read",
        // Allow Establishment to add locations in Settings
        "locations.create",
        // And edit/delete locations as requested
        "locations.update",
        "locations.delete",
        "devices.read",
        "devices.create",
        "devices.update",
        "devices.delete",
        // Users list for assigning location manager in Settings
        "users.read",
        "districts.read",
        "districts.create",
        "districts.update",
        "districts.delete",
        "cities.read",
        "cities.create",
        "cities.update",
        "cities.delete",
        "education-levels.read",
        "education-levels.create",
        "education-levels.update",
        "education-levels.delete",
        // Leave management permissions
        "leaves.read",
        "leaves.create",
        "leaves.apply",
        "leaves.status",
        "leaves.update",
        "leaves.delete",
        // Leave Bank & Leave Types management permissions
        "leave-banks.read",
        "leave-banks.create",
        "leave-banks.update",
        "leave-banks.delete",
        "leave-types.read",
        "leave-types.create",
        "leave-types.update",
        "leave-types.delete",
        // Attendance management permissions
        "attendance.read",
        "attendance.fetch",
        "attendance.map",
        "attendance.create",
        "attendance.update",
        "attendance.delete",
        // Roster: creates own department roster; read-all oversight (no approve)
        "roster.read",
        "roster.create",
        "roster.read.all",
        // Payroll permissions (read-only)
        "payroll.read",
      ],
      enabled: true,
      fields: ["employee_basic"],
    },

    // Employee Role (for all other staff)
    {
      name: "Employee",
      type: "general",
      allowed_actions: [
        // TADA only for demo
        "profile.read",
        "profile.update",
        "travel.read",
        "travel.create",
        "travel.update",
        "travel.submit",
        "travel.status",
        "travel.claim.read",
        "travel.claim.create",
        "travel.claim.update",
        "travel.claim.submit",
        "travel.claim.status",
        // Added to enable roster for bazaar/location accounts
        "roster.read",
        "roster.create",
        // remove travel rates from general employees
        "leaves.apply",
      ],
      enabled: true,
      fields: ["own_personal", "own_employment"],
    },
  ];

  console.log("🛡️ Seeding roles...");
  const createdRoles = [];
  for (const role of roles) {
    const createdRole = await prisma.role.create({
      data: {
        name: role.name,
        type: role.type,
        enabled: role.enabled,
        fields: role.fields || [],
        is_deleted: false,
      },
    });
    console.log(`✅ Created Role: ${createdRole.name} (${createdRole.type})`);
    createdRoles.push(createdRole);
  }

  // Permissions catalog (routes + domain actions) - Updated with TADA-specific permissions
  const ROUTE_PERMISSION_KEYS = [
    // Dashboard module
    "dashboard.read",
    // Attendance module
    "attendance.read",
    "attendance.fetch",
    "attendance.map",
    "attendance.create",
    "attendance.update",
    "attendance.delete",
    // Device module
    "devices.create",
    "devices.read",
    "devices.update",
    "devices.delete",
    // Duty Roster module
    "roster.read",
    "roster.create",
    "roster.approve",
    "roster.read.all",
    // TADA module routes only
    "travel.read",
    "travel.create",
    "travel.update",
    "travel.delete",
    "travel.submit",
    "travel.cancel",
    "travel.status",
    "travel.manage",
    "travel.claim.read",
    "travel.claim.create",
    "travel.claim.update",
    "travel.claim.delete",
    "travel.claim.submit",
    "travel.claim.status",
    "travel.claim.settle",
    "travel.rates.read",
    "travel.rates.manage",
    // Employee Module routes
    "employees.read",
    "employees.create",
    "employees.update",
    "employees.delete",
    // Employment sub-module routes
    "employment.read",
    "employment.create",
    "employment.update",
    "employment.delete",
    // Employment granular routes
    "employment.salary.create",
    "employment.salary.update",
    "employment.salary.delete",
    "employment.location.create",
    "employment.location.update",
    "employment.location.delete",
    "employment.contract.create",
    "employment.contract.update",
    "employment.contract.delete",
    // granular stage permissions
    "travel.request.approve.ops",
    "travel.request.approve.dg",
    "travel.claim.approve.ops",
    "travel.claim.approve.dg",
    "travel.claim.verify.establishment",
    "travel.claim.process.start",
    // Accounts screens
    "tada.managed.entry",
    "accounts.tranches.access",
    // Profile
    "profile.read",
    "profile.update",
    // Permissions module
    "permissions.read",
    "permissions.manage",
    // Payroll module
    "payroll.read",
    "payroll.write",
    // Settings module
    "departments.read",
    "departments.create",
    "departments.update",
    "departments.delete",
    "designations.read",
    "designations.create",
    "designations.update",
    "designations.delete",
    "role-tags.read",
    "role-tags.create",
    "role-tags.update",
    "role-tags.delete",
    "scale-grades.read",
    "scale-grades.create",
    "scale-grades.update",
    "scale-grades.delete",
    "locations.read",
    "locations.create",
    "locations.update",
    "locations.delete",
    "districts.read",
    "districts.create",
    "districts.update",
    "districts.delete",
    "cities.read",
    "cities.create",
    "cities.update",
    "cities.delete",
    "education-levels.read",
    "education-levels.create",
    "education-levels.update",
    "education-levels.delete",
  ];

  console.log("🔑 Seeding permissions catalog...");
  const ALL_PERMISSION_KEYS = Array.from(
    new Set([
      ...ROUTE_PERMISSION_KEYS,
      ...roles.flatMap((r) => r.allowed_actions).filter((k) => k !== "*"),
    ])
  );
  await prisma.$transaction(
    ALL_PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          resource: key.split(".")[0] || "custom",
          action: key.split(".")[1] || "custom",
        },
      })
    )
  );

  // Link permissions to roles (restrict to declared permissions only)
  for (const role of createdRoles) {
    const orig = roles.find((r) => r.name === role.name);
    if (!orig) continue;
    if (orig.allowed_actions.includes("*")) continue; // Super Admin / DG

    let permsToCreate = [];

    // Assign only declared permissions
    const basePerms = await prisma.permission.findMany({
      where: { key: { in: orig.allowed_actions.filter((k) => k !== "*") } },
    });
    permsToCreate = basePerms.map((p) => ({ permission_id: p.id }));

    // Deduplicate permission_ids to avoid P2002 unique constraint violations
    const seen = new Set();
    const uniquePerms = [];
    for (const p of permsToCreate) {
      if (!seen.has(p.permission_id)) {
        seen.add(p.permission_id);
        uniquePerms.push(p);
      }
    }

    if (uniquePerms.length) {
      await prisma.role.update({
        where: { id: role.id },
        data: { rolePermissions: { create: uniquePerms } },
      });
    }
  }

  // Seed scale grades
  // Seed employees
  // Seed users - Create accounts for BPS 17+ employees with appropriate roles
  const findEmpId = (name) =>
    createdEmployees.find((e) => e.full_name === name)?.id;
  const getRoleId = (roleName) =>
    createdRoles.find((r) => r.name === roleName)?.id;
  const DEPT_ALIAS = {
    Authority: "Competent Authority",
    Establishment: "Establishment Department",
    Accounts: "Accounts Department",
    Operations: "Operations Department",
    IT: "IT Department",
    "Software Development & Operations": "Devops Department",
    Engineering: "Civil Department",
    Administration: "Admin Department",
    Legal: "Legal Department",
    Audit: "Audit Department",
    Monitoring: "Monitoring Department",
    Media: "Media Department",
    Electrical: "Electrical Department",
  };
  const getDeptId = (deptName) => {
    if (!deptName) return null;
    const target =
      DEPT_ALIAS[deptName] ||
      (String(deptName).endsWith("Department") ? deptName : `${deptName} Department`);
    return (
      createdDepartments.find((d) => d.name === target)?.id ||
      createdDepartments.find((d) => d.name === deptName)?.id ||
      null
    );
  };

  const users = [
    // System Admin - generic admin account not tied to specific employee
    {
      email: "admin@psba.gop.pk",
      password: encrypt("alpha123"),
      role_id: getRoleId("Super Admin"),
      employee_id: null,
      department_id: getDeptId("IT"),
      is_deleted: false,
    },
    // Department-specific users (no employee_id, only department_id)
    {
      email: "establishment@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Establishment"),
      employee_id: null,
      department_id: getDeptId("Establishment"),
      is_deleted: false,
    },
    {
      email: "accounts@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Accounts User"),
      employee_id: null,
      department_id: getDeptId("Accounts"),
      is_deleted: false,
    },
    {
      email: "operations@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Operations"),
      employee_id: null,
      department_id: getDeptId("Operations"),
      is_deleted: false,
    },
    {
      email: "it@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Employee"),
      employee_id: null,
      department_id: getDeptId("IT"),
      is_deleted: false,
    },
    {
      email: "devops@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Employee"),
      employee_id: null,
      department_id: getDeptId("Software Development & Operations"),
      is_deleted: false,
    },

    // DG (BPS 19-20) - Director General
    {
      email: "dg@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Director General"),
      employee_id: findEmpId("Naveed Rafaqat Ahmad"),
      department_id: getDeptId("Authority"),
      is_deleted: false,
    },

    // Senior Management (BPS 18) - Additional Directors
    {
      email: "add.dir.ame@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Senior Management"),
      employee_id: findEmpId("Farhan Dilawar Sheikh"),
      department_id: null,
      is_deleted: false,
    }, // Additional Director Audit, Monitoring & Evaluation
    {
      email: "add.dir.ppi@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Senior Management"),
      employee_id: findEmpId("Roshan Zameer"),
      department_id: null,
      is_deleted: false,
    }, // Additional Director Projects, Planning & Special Initiatives
    {
      email: "add.dir.or@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Senior Management"),
      employee_id: findEmpId("Sadam Khokhar"),
      department_id: null,
      is_deleted: false,
    }, // Additional Director Operations & Revenue
    {
      email: "se.civil@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Senior Management"),
      employee_id: findEmpId("Asad Abbas"),
      department_id: null,
      is_deleted: false,
    }, // Sr. Engineer Civil

    // Department Heads (BPS 17) - Assistant Directors with special roles
    {
      email: "ad.est@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Establishment"),
      employee_id: findEmpId("Mariya Iqbal"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Establishment
    {
      email: "ad.apr@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Accounts Manager"),
      employee_id: findEmpId("Kashif Rasheed"),
      department_id: null,
      is_deleted: false,
    }, // Accounts APR
    {
      email: "ad.orc@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Operations"),
      employee_id: findEmpId("Usman Badar"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Operations (ORC)

    // Other Management (BPS 17) - Assistant Directors
    {
      email: "ad.acc@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Moeen Chishti"),
      department_id: null,
      is_deleted: false,
    }, // Updated email for Moeen
    {
      email: "ad.ppi@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Rizwan Haider Shah"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Projects, Planning & Initiatives
    {
      email: "ad.it@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Muhammad Ahmad"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director IT
    {
      email: "mahassan@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Muhammad Ali Hassan"),
      department_id: null,
      is_deleted: false,
    }, // Exception: updated email
    {
      email: "sd.engineer@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Barkat Ali Laghari"),
      department_id: null,
      is_deleted: false,
    }, // Structural Design Engineer
    {
      email: "architect@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Muhammad Amir"),
      department_id: null,
      is_deleted: false,
    }, // Architect
    {
      email: "ad.legal@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Rab Nawaz Baloch"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Legal
    {
      email: "ad.ss@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Asim Shahbaz"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Security & Surveillance
    {
      email: "ad.bft@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Muhammad Iqbal"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director Budget, Finance & Taxation
    {
      email: "ad.hqao@psba.gop.pk",
      password: encrypt("abc123"),
      role_id: getRoleId("Management"),
      employee_id: findEmpId("Muhammad Ali"),
      department_id: null,
      is_deleted: false,
    }, // Assistant Director HQ Admin/Operations
  ];

  console.log("👤 Seeding users...");
  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    console.log(`✅ Created User: ${createdUser.email}`);
    createdUsers.push(createdUser);
  }

  // Skip generic department accounts - using dedicated user accounts for department heads instead
  console.log(
    "🏢 Department management handled through individual user accounts for department heads..."
  );

  // (Attendance device seeding removed — device management is handled by separate software)

  // 📍 Ensure all requested bazaar locations exist and create location-based users
  console.log(
    "📍 Ensuring all bazaar locations and creating location-based users..."
  );
  const bazaarEmailMap = [
    { name: "Sahulat Bazaar Mian Plaza", email: "mianplaza@psba.gop.pk" },
    { name: "Sahulat Bazaar Raiwind", email: "raiwind@psba.gop.pk" },
    { name: "Sahulat Bazaar Sabzazaar", email: "sabzazaar@psba.gop.pk" },
    { name: "Sahulat Bazaar Township", email: "township@psba.gop.pk" },
    { name: "Sahulat Bazaar Thokar", email: "thokar@psba.gop.pk" },
    { name: "Sahulat Bazaar Chung", email: "chung@psba.gop.pk" },
    { name: "Sahulat Bazaar Shershah", email: "shershah@psba.gop.pk" },
    { name: "Sahulat Bazaar Wahdat Colony", email: "wahdatcolony@psba.gop.pk" },
    { name: "Sahulat Bazaar Sahiwal", email: "sahiwal@psba.gop.pk" },
    { name: "Sahulat Bazaar Vehari", email: "vehari@psba.gop.pk" },
    {
      name: "Sahulat Bazaar Toba Tek Singh",
      email: "tobateksingh@psba.gop.pk",
    },
    { name: "Sahulat Bazaar Bahawalpur", email: "bahawalpur@psba.gop.pk" },
    { name: "Sahulat Bazaar Jampur", email: "jampur@psba.gop.pk" },
    { name: "Sahulat Bazaar DG Khan", email: "dgkhan@psba.gop.pk" },
    { name: "Sahulat Bazaar Layyah", email: "layyah@psba.gop.pk" },
    { name: "Sahulat Bazaar Lodhran", email: "lodhran@psba.gop.pk" },
    { name: "Sahulat Bazaar Kasur", email: "kasur@psba.gop.pk" },
    { name: "Sahulat Bazaar Jhang", email: "jhang@psba.gop.pk" },
    { name: "Sahulat Bazaar Taunsa Sharif", email: "taunsasharif@psba.gop.pk" },
    { name: "Sahulat Bazaar Bhakkar", email: "bhakkar@psba.gop.pk" },
    { name: "Sahulat Bazaar Pakpattan", email: "pakpattan@psba.gop.pk" },
    { name: "Sahulat Bazaar China Scheme", email: "chinascheme@psba.gop.pk" },
    { name: "Sahulat Bazaar Harbanspura", email: "harbanspura@psba.gop.pk" },
    { name: "Sahulat Bazaar Sargodha", email: "sargodha@psba.gop.pk" },
    { name: "Sahulat Bazaar Khushab", email: "khushab@psba.gop.pk" },
    { name: "Sahulat Bazaar Bhera", email: "bhera@psba.gop.pk" },
    { name: "Sahulat Bazaar Millat Road", email: "fsd.millatroad@psba.gop.pk" },
    { name: "Sahulat Bazaar Jhang Road", email: "fsd.jhangroad@psba.gop.pk" },
    { name: "Sahulat Bazaar Mianwali", email: "mianwali@psba.gop.pk" },
    { name: "Sahulat Bazaar Gujranwala", email: "gujranwala@psba.gop.pk" },
    { name: "Sahulat Bazaar Sialkot", email: "sialkot@psba.gop.pk" },
    { name: "Sahulat Bazaar Hafizabad", email: "hafizabad@psba.gop.pk" },
    { name: "Sahulat Bazaar Rawalpindi", email: "rawalpindi@psba.gop.pk" },
    { name: "Sahulat Bazaar Chakwal", email: "chakwal@psba.gop.pk" },
    { name: "Sahulat Bazaar Farooqabad", email: "farooqabad@psba.gop.pk" },
    { name: "Sahulat Bazaar Gujrat", email: "gujrat@psba.gop.pk" },
    {
      name: "Sahulat Bazaar Mandi Bahauddin",
      email: "mandibahauddin@psba.gop.pk",
    },
    { name: "Sahulat Bazaar Muzaffargarh", email: "muzaffargarh@psba.gop.pk" },
    { name: "Sahulat Bazaar Pattoki", email: "pattoki@psba.gop.pk" },
    { name: "Sahulat Bazaar Chunian", email: "chunian@psba.gop.pk" },
    { name: "Sahulat Bazaar Bhalwal", email: "bhalwal@psba.gop.pk" },
    { name: "Sahulat Bazaar Khanewal", email: "khanewal@psba.gop.pk" },
    { name: "Sahulat Bazaar Chiniot", email: "chiniot@psba.gop.pk" },
    { name: "Sahulat Bazaar Wazirabad", email: "wazirabad@psba.gop.pk" },
    { name: "Sahulat Bazaar Sharaqpur Sharif", email: "sharaqpur@psba.gop.pk" },
    { name: "Sahulat Bazaar Jaranwala", email: "jaranwala@psba.gop.pk" },
    { name: "Sahulat Bazaar Okara", email: "okara@psba.gop.pk" },
    { name: "Sahulat Bazaar Nowshera Virkan", email: "nowshera@psba.gop.pk" },
  ];

  // Upsert locations and create users per bazaarEmailMap
  const employeeRoleIdForBazaar = getRoleId("Employee");
  for (const entry of bazaarEmailMap) {
    // Ensure location exists
    let loc = createdLocations.find((l) => l.name === entry.name);
    if (!loc) {
      loc = await prisma.location.create({
        data: {
          name: entry.name,
          type: "BAZAAR",
          is_active: true,
          is_deleted: false,
        },
      });
      createdLocations.push(loc);
      console.log(`✅ Created Bazaar Location: ${loc.name}`);
    }
    // Ensure user exists for email and link to location
    const email = String(entry.email || "").toLowerCase();
    const existingBazaarUser = await prisma.user.findUnique({
      where: { email },
    });
    if (!existingBazaarUser) {
      const u = await prisma.user.create({
        data: {
          email,
          password: encrypt("abc123"),
          role_id: employeeRoleIdForBazaar,
          employee_id: null,
          department_id: null,
          location_id: loc.id,
          is_deleted: false,
        },
      });
      createdUsers.push(u);
      console.log(`👤 Bazaar user created: ${email} → ${entry.name}`);
    } else {
      // If exists, update to link location if not already
      if (!existingBazaarUser.location_id) {
        await prisma.user.update({
          where: { id: existingBazaarUser.id },
          data: { location_id: loc.id },
        });
        console.log(
          `🔗 Linked existing user ${email} to location ${entry.name}`
        );
      }
    }
  }

  // Seed past experiences
  // Seed employee documents
  // Update Head Quarter manager to Mariya Iqbal
  console.log("🏢 Setting Head Quarter manager...");
  const headQuarterLoc = createdLocations.find(
    (l) => l.name === "Head Quarter"
  );
  const mariyaUser = createdUsers.find((u) => u.email === "ad.est@psba.gop.pk");
  if (headQuarterLoc && mariyaUser) {
    await prisma.location.update({
      where: { id: headQuarterLoc.id },
      data: { manager_user_id: mariyaUser.id },
    });
    console.log(`✅ Assigned Mariya Iqbal as Head Quarter manager`);
  }

  const empCount = await prisma.employee.count({ where: { is_deleted: false } });
  const emrCount = await prisma.employment.count({ where: { is_deleted: false } });
  const locCount = await prisma.location.count({ where: { is_deleted: false } });
  const usrCount = await prisma.user.count({ where: { is_deleted: false } });
  console.log("🎉 Database seeding completed successfully!");
  console.log("📊 Summary:");
  console.log(`   - Departments: ${createdDepartments.length}`);
  console.log(`   - Scale Grades: ${createdScaleGrades.length}`);
  console.log(`   - Roles: ${createdRoles.length}`);
  console.log(`   - Locations: ${locCount}`);
  console.log(`   - Employees: ${empCount}`);
  console.log(`   - Employment records: ${emrCount}`);
  console.log(`   - Users: ${usrCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✅ Database seeding complete.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
