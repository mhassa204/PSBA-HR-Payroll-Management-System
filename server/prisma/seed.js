const { PrismaClient } = require("@prisma/client");

const HardDeleteUtil = require("../src/utils/hardDeleteUtil");
const { encrypt } = require("../src/utils/cryptoUtil");
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

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

  // Clear existing data using hard delete utility
  console.log('🧹 Cleaning existing data using hard delete...');

  // First: purge Travel (TADA) module to avoid FK violations on Employee delete
  console.log('🧹 Purging Travel (TADA) data...');
  // Updated for new expense claim schema (removed travelClaimItem & travelClaimReceipt)
  await prisma.travelClaimDocument.deleteMany({});
  await prisma.travelClaimSegment.deleteMany({});
  await prisma.travelClaim.deleteMany({});
  await prisma.travelRequestStatusEntry.deleteMany({});
  await prisma.travelRequestEmployee.deleteMany({});
  await prisma.travelRequest.deleteMany({});
  
  // Get all existing records to hard delete them
  const existingEmployees = await prisma.employee.findMany({
    select: { id: true, full_name: true }
  });
  
  console.log(`Found ${existingEmployees.length} existing employees to clean up...`);
  
  for (const employee of existingEmployees) {
    console.log(`🗑️ Hard deleting employee: ${employee.full_name} (ID: ${employee.id})`);
    await HardDeleteUtil.hardDeleteEmployee(employee.id);
  }

  // New: Clean Duty Rosters (entries then rosters) to avoid FK issues with users/locations
  const existingRosterEntries = await prisma.dutyRosterEntry.deleteMany({});
  const existingRosters = await prisma.dutyRoster.deleteMany({});

  // Hard delete any remaining departments and designations
  const existingDepartments = await prisma.department.findMany({
    select: { id: true, name: true }
  });
  
  for (const dept of existingDepartments) {
    console.log(`🗑️ Hard deleting department: ${dept.name} (ID: ${dept.id})`);
    await HardDeleteUtil.hardDeleteDepartment(dept.id);
  }

  // Hard delete any remaining role tags and scale grades
  const existingRoleTags = await prisma.roleTag.findMany({
    select: { id: true, name: true }
  });
  
  for (const tag of existingRoleTags) {
    console.log(`🗑️ Hard deleting role tag: ${tag.name} (ID: ${tag.id})`);
    await prisma.roleTag.delete({ where: { id: tag.id } });
  }

  const existingScaleGrades = await prisma.scaleGrade.findMany({
    select: { id: true, name: true }
  });
  
  for (const grade of existingScaleGrades) {
    console.log(`🗑️ Hard deleting scale grade: ${grade.name} (ID: ${grade.id})`);
    await prisma.scaleGrade.delete({ where: { id: grade.id } });
  }

  // Hard delete any existing users and roles
  console.log('🗑️ Cleaning existing users and roles...');
  
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  
  for (const user of existingUsers) {
    console.log(`🗑️ Hard deleting user: ${user.email} (ID: ${user.id})`);
    await prisma.user.delete({ where: { id: user.id } });
  }

  // NEW: clear role-permissions and permissions before deleting roles
  console.log('🧹 Clearing role-permissions and permissions...');
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});

  const existingRoles = await prisma.role.findMany({
    select: { id: true, name: true }
  });
  
  for (const role of existingRoles) {
    console.log(`🗑️ Hard deleting role: ${role.name} (ID: ${role.id})`);
    await prisma.role.delete({ where: { id: role.id } });
  }

  // Hard delete any existing master locations
  const existingLocations = await prisma.location.findMany({ select: { id: true, name: true } });
  for (const loc of existingLocations) {
    console.log(`🗑️ Hard deleting location: ${loc.name} (ID: ${loc.id})`);
    await prisma.location.delete({ where: { id: loc.id } });
  }

  // NEW: Clear Districts, Cities, and EducationLevels before seeding
  console.log('🧹 Clearing districts, cities, and education levels...');
  await prisma.city.deleteMany({});
  await prisma.district.deleteMany({});
  await prisma.educationLevel.deleteMany({});

  // Seed Districts
  console.log('🗺️ Seeding districts...');
  const districtNames = ['Lahore', 'Faisalabad', 'Jhang', 'Layyah'];
  createdDistricts = [];
  for (const name of districtNames) {
    const d = await prisma.district.create({ data: { name, is_active: true, is_deleted: false } });
    createdDistricts.push(d);
  }

  // Seed Cities
  console.log('🏙️ Seeding cities...');
  const citySeeds = [
    { name: 'Lahore', district: 'Lahore' },
    { name: 'Faisalabad', district: 'Faisalabad' },
    { name: 'Jhang', district: 'Jhang' },
    { name: 'Layyah', district: 'Layyah' }
  ];
  createdCities = [];
  for (const c of citySeeds) {
    const dist = createdDistricts.find(d => d.name === c.district);
    const city = await prisma.city.create({ data: { name: c.name, district_id: dist?.id, is_active: true, is_deleted: false } });
    createdCities.push(city);
  }

  // Seed Education Levels
  console.log('🎓 Seeding education levels...');
  const educationLevelSeeds = [
    { name: 'Matric', description: 'Matriculation', order: 1 },
    { name: 'Intermediate (FA/FSc)', description: 'Intermediate', order: 2 },
    { name: 'Bachelor', description: 'Bachelor Degree', order: 3 },
    { name: 'Master', description: 'Master Degree', order: 4 },
    { name: 'MPhil', description: 'Master of Philosophy', order: 5 },
    { name: 'PhD', description: 'Doctorate', order: 6 }
  ];
  createdEducationLevels = [];
  for (const lvl of educationLevelSeeds) {
    const level = await prisma.educationLevel.create({ data: { ...lvl, is_active: true, is_deleted: false } });
    createdEducationLevels.push(level);
  }

  // Seed departments
  const departments = [
    { name: "Engineering", code: "ENG", description: "Engineering and Technical Services" },
    { name: "IT", code: "IT", description: "Information Technology" },
    { name: "HR", code: "HR", description: "Human Resources" },
    { name: "Administration", code: "ADMIN", description: "Administrative Services" },
    { name: "Finance", code: "FIN", description: "Finance and Accounts" },
    { name: "Legal", code: "LEGAL", description: "Legal Affairs" },
    { name: "Operations", code: "OPS", description: "Operations Management" },
    // New: Authority umbrella and specific functional departments as per org chart
    { name: "Authority", code: "AUTH", description: "Authority Leadership (DG/AD)" },
    { name: "Audit, Compliance & Control", code: "AUD", description: "Audit, Compliance & Control" },
    { name: "Projects, Planning & Initiatives", code: "PPI", description: "Projects, Planning & Initiatives" },
    { name: "Software Development & Operations", code: "SDO", description: "Software Development & Operations" },
    { name: "Structural Design", code: "STRUCT", description: "Structural Design" },
    { name: "Architecture", code: "ARCH", description: "Architecture" },
    { name: "Ops & Revenue – Central/North", code: "OPS-CN", description: "Operations & Revenue – Central/North" },
    { name: "Establishment", code: "EST", description: "Establishment" },
    { name: "Security & Surveillance", code: "SEC", description: "Security & Surveillance" },
    { name: "Budget, Finance & Taxation", code: "BFT", description: "Budget, Finance & Taxation" },
    { name: "Accounts, Payroll & Reconciliation", code: "APR", description: "Accounts, Payroll & Reconciliation" },
    { name: "HQ Admin / Operations", code: "HQOPS", description: "HQ Admin / Operations" }
  ];

  console.log('📁 Seeding departments...');
  const createdDepartments = [];
  for (const dept of departments) {
    const department = await prisma.department.create({ 
      data: { 
        ...dept,
        is_deleted: false 
      } 
    });
    console.log(`✅ Created Department: ${department.name}`);
    createdDepartments.push(department);
  }

  // Seed designations
  const designations = [
    // Engineering hierarchy
    { title: "Junior Engineer", department_name: "Engineering", level: 1 },
    { title: "Assistant Engineer", department_name: "Engineering", level: 2 },
    { title: "Engineer", department_name: "Engineering", level: 3 },
    { title: "Senior Engineer", department_name: "Engineering", level: 4 },
    { title: "Assistant Manager", department_name: "Engineering", level: 5 },
    { title: "Manager", department_name: "Engineering", level: 6 },
    { title: "Deputy Director Engineering", department_name: "Engineering", level: 7 },

    // IT hierarchy
    { title: "Software Developer", department_name: "IT", level: 1 },
    { title: "Senior Software Developer", department_name: "IT", level: 2 },
    { title: "IT Manager", department_name: "IT", level: 3 },

    // HR hierarchy
    { title: "HR Officer", department_name: "HR", level: 1 },
    { title: "Senior HR Officer", department_name: "HR", level: 2 },
    { title: "HR Manager", department_name: "HR", level: 3 },

    // Administration hierarchy
    { title: "Administrative Officer", department_name: "Administration", level: 1 },
    { title: "Senior Administrative Officer", department_name: "Administration", level: 2 },
    { title: "Administrative Manager", department_name: "Administration", level: 3 },

    // Finance hierarchy
    { title: "Accounts Officer", department_name: "Finance", level: 1 },
    { title: "Senior Accounts Officer", department_name: "Finance", level: 2 },
    { title: "Finance Manager", department_name: "Finance", level: 3 },

    // Legal hierarchy
    { title: "Legal Officer", department_name: "Legal", level: 1 },
    { title: "Senior Legal Officer", department_name: "Legal", level: 2 },
    { title: "Legal Manager", department_name: "Legal", level: 3 },

    // Operations hierarchy
    { title: "Operations Officer", department_name: "Operations", level: 1 },
    { title: "Senior Operations Officer", department_name: "Operations", level: 2 },
    { title: "Operations Manager", department_name: "Operations", level: 3 },

    // New leadership and specialized roles
    { title: "Director General", department_name: "Authority", level: 19 },
    { title: "Additional Director", department_name: "Authority", level: 18 },
    { title: "Sr. Engineer, Civil", department_name: "Engineering", level: 18 },
    { title: "Structural Design Engineer", department_name: "Structural Design", level: 17 },
    { title: "Architect", department_name: "Architecture", level: 17 }
  ];

  console.log('👔 Seeding designations...');
  const createdDesignations = [];
  for (const des of designations) {
    const department = createdDepartments.find(d => d.name === des.department_name);
    if (department) {
      const designation = await prisma.designation.create({
        data: {
          title: des.title,
          department_id: department.id,
          level: des.level,
          is_deleted: false
        }
      });
      console.log(`✅ Created Designation: ${designation.title} (${department.name})`);
      createdDesignations.push(designation);
    }
  }

  // Ensure Assistant Director designation exists for all departments (level 17)
  for (const dept of createdDepartments) {
    const exists = createdDesignations.find(d => d.title === 'Assistant Director' && d.department_id === dept.id);
    if (!exists) {
      const ad = await prisma.designation.create({
        data: { title: 'Assistant Director', department_id: dept.id, level: 17, is_deleted: false }
      });
      createdDesignations.push(ad);
      console.log(`✅ Created Designation: Assistant Director (${dept.name})`);
    }
  }

  // Seed role tags
  const roleTags = [
    { name: "Software Engineer", description: "Software development and programming", category: "Technical" },
    { name: "Project Manager", description: "Project planning and management", category: "Management" },
    { name: "Business Analyst", description: "Business requirements analysis", category: "Administrative" },
    { name: "Data Scientist", description: "Data analysis and machine learning", category: "Technical" },
    { name: "UI/UX Designer", description: "User interface and experience design", category: "Technical" },
    { name: "DevOps Engineer", description: "Development operations and infrastructure", category: "Technical" },
    { name: "Quality Assurance", description: "Software testing and quality control", category: "Technical" },
    { name: "System Administrator", description: "System maintenance and administration", category: "Technical" },
    { name: "Network Engineer", description: "Network infrastructure and security", category: "Technical" },
    { name: "Database Administrator", description: "Database management and optimization", category: "Technical" }
  ];

  console.log('🏷️ Seeding role tags...');
  const createdRoleTags = [];
  for (const tag of roleTags) {
    const roleTag = await prisma.roleTag.create({ data: { ...tag, is_deleted: false } });
    console.log(`✅ Created Role Tag: ${roleTag.name} (${roleTag.category})`);
    createdRoleTags.push(roleTag);
  }

  // Seed roles
  const roles = [
    { name: "Super Admin", type: "system", allowed_actions: ["*"], enabled: true, fields: ["*"] },
    { name: "HR Admin", type: "system", allowed_actions: [
        "employees.read","employees.create","employees.update","employees.delete",
        "employment.read","employment.create","employment.update","employment.delete",
        "employment.salary.read","employment.salary.create","employment.salary.update","employment.salary.delete",
        "employment.location.read","employment.location.create","employment.location.update","employment.location.delete",
        "employment.contract.read","employment.contract.create","employment.contract.update","employment.contract.delete",
        "departments.read","departments.create","departments.update","departments.delete",
        "designations.read","designations.create","designations.update","designations.delete",
        "districts.read","districts.create","districts.update","districts.delete",
        "cities.read","cities.create","cities.update","cities.delete",
        "education-levels.read","education-levels.create","education-levels.update","education-levels.delete",
        "role-tags.read","role-tags.create","role-tags.update","role-tags.delete",
        "scale-grades.read","scale-grades.create","scale-grades.update","scale-grades.delete",
        "locations.read","locations.create","locations.update","locations.delete",
        "devices.read","devices.create","devices.update","devices.delete",
        "attendance.read","attendance.fetch",
        "reports.read",
        "users.read","users.manage",
        "audit.read",
        "roster.read","roster.create","roster.update","roster.delete","roster.status",
        "travel.read","travel.create","travel.update","travel.delete","travel.submit","travel.cancel","travel.status","travel.manage",
        "travel.claim.read","travel.claim.create","travel.claim.update","travel.claim.delete","travel.claim.submit","travel.claim.status","travel.claim.settle",
        "travel.rates.read","travel.rates.manage",
        // granular claim approval permissions
        "travel.request.approve.ops","travel.request.approve.dg","travel.claim.approve.ops","travel.claim.approve.dg","travel.claim.approve.hr","travel.claim.approve.accounts"
      ], enabled: true, fields: ["employee_personal", "employee_employment", "employee_salary", "employee_documents"] },
    { name: "HR Officer", type: "custom", allowed_actions: ["employees.read","employees.create","employees.update","reports.read","travel.read","travel.claim.read","travel.claim.approve.hr"], enabled: true, fields: ["employee_personal", "employee_employment"] },
    { name: "Manager", type: "custom", allowed_actions: ["employees.read","reports.read","requests.approve","roster.read","roster.create","roster.update","travel.read","travel.claim.read","travel.request.approve.ops","travel.claim.approve.ops"], enabled: true, fields: ["employee_basic", "employee_employment"] },
    { name: "Accounts Approver", type: "custom", allowed_actions: ["travel.read","travel.claim.read","travel.claim.approve.accounts"], enabled: true, fields: ["employee_basic"] },
    { name: "Employee", type: "custom", allowed_actions: ["profile.read","profile.update"], enabled: true, fields: ["own_personal", "own_employment"] }
  ];

  console.log('🛡️ Seeding roles...');
  const createdRoles = [];
  for (const role of roles) {
    const createdRole = await prisma.role.create({ data: { name: role.name, type: role.type, enabled: role.enabled, fields: role.fields || [], is_deleted: false } });
    console.log(`✅ Created Role: ${createdRole.name} (${createdRole.type})`);
    createdRoles.push(createdRole);
  }

  // Permissions catalog (routes + domain actions)
  const ROUTE_PERMISSION_KEYS = [
    'employees.read','employees.create','employees.update','employees.delete',
    'employment.read','employment.create','employment.update','employment.delete',
    'employment.salary.create','employment.salary.update','employment.salary.delete',
    'employment.location.create','employment.location.update','employment.location.delete',
    'employment.contract.create','employment.contract.update','employment.contract.delete',
    'departments.read','departments.create','departments.update','departments.delete',
    'designations.read','designations.create','designations.update','designations.delete',
    'districts.read','districts.create','districts.update','districts.delete',
    'cities.read','cities.create','cities.update','cities.delete',
    'education-levels.read','education-levels.create','education-levels.update','education-levels.delete',
    'role-tags.read','role-tags.create','role-tags.update','role-tags.delete',
    'scale-grades.read','scale-grades.create','scale-grades.update','scale-grades.delete',
    'locations.read','locations.create','locations.update','locations.delete',
    'devices.read','devices.create','devices.update','devices.delete',
    'attendance.read','attendance.fetch','attendance.map',
    'roster.read','roster.create','roster.update','roster.delete','roster.status',
    'leaves.read','leaves.create','leaves.update','leaves.delete','leaves.status','leaves.apply',
    'leave-banks.read','leave-banks.create','leave-banks.update','leave-banks.delete',
    'leave-types.read','leave-types.create','leave-types.update','leave-types.delete',
    'users.read','users.manage',
    'roles.read','roles.manage',
    'permissions.read','permissions.manage',
    'system.database.read','system.security.read','system.security.update','system.themes.read','system.themes.update',
    'admin.tools',
    'travel.read','travel.create','travel.update','travel.delete','travel.submit','travel.cancel','travel.status','travel.manage',
    'travel.claim.read','travel.claim.create','travel.claim.update','travel.claim.delete','travel.claim.submit','travel.claim.status','travel.claim.settle',
    'travel.rates.read','travel.rates.manage',
    // granular stage permissions
    'travel.request.approve.ops','travel.request.approve.dg','travel.claim.approve.ops','travel.claim.approve.dg','travel.claim.approve.hr','travel.claim.approve.accounts',
    'reports.read','audit.read','requests.approve','profile.read','profile.update'
  ];

  console.log('🔑 Seeding permissions catalog...');
  const ALL_PERMISSION_KEYS = Array.from(new Set([
    ...ROUTE_PERMISSION_KEYS,
    ...roles.flatMap(r => r.allowed_actions).filter(k => k !== '*')
  ]));
  await prisma.$transaction(
    ALL_PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, resource: key.split('.')[0] || 'custom', action: key.split('.')[1] || 'custom' }
      })
    )
  );

  // Link permissions to roles (skip Super Admin explicit perms)
  for (const role of createdRoles) {
    const orig = roles.find(r => r.name === role.name);
    if (!orig) continue;
    if (orig.allowed_actions.includes('*')) continue;

    const basePerms = await prisma.permission.findMany({ where: { key: { in: orig.allowed_actions.filter(k => k !== '*') } } });
    const permsToCreate = basePerms.map(p => ({ permission_id: p.id }));

    if (orig.name === 'HR Admin') {
      const extraKeys = [
        'attendance.map','leaves.read','leaves.create','leaves.update','leaves.delete','leaves.status','leaves.apply','leave-banks.read','leave-banks.create','leave-banks.update','leave-banks.delete','leave-types.read','leave-types.create','leave-types.update','leave-types.delete',
        'travel.read','travel.create','travel.update','travel.delete','travel.submit','travel.cancel','travel.status','travel.manage',
        'travel.claim.read','travel.claim.create','travel.claim.update','travel.claim.delete','travel.claim.submit','travel.claim.status','travel.claim.settle',
        'travel.rates.read','travel.rates.manage'
      ];
      const extraPerms = await prisma.permission.findMany({ where: { key: { in: extraKeys } } });
      for (const p of extraPerms) permsToCreate.push({ permission_id: p.id });
    }
    if (orig.name === 'Manager') {
      const extraPerms = await prisma.permission.findMany({ where: { key: { in: [
        'leaves.apply','leaves.read',
        'travel.read','travel.create','travel.update','travel.submit','travel.status',
        'travel.claim.read','travel.claim.create','travel.claim.update','travel.claim.submit','travel.claim.status'
      ] } } });
      for (const p of extraPerms) permsToCreate.push({ permission_id: p.id });
    }
    if (orig.name === 'Accounts Approver') {
      const extraPerms = await prisma.permission.findMany({ where: { key: { in: ['travel.read','travel.claim.read'] } } });
      for (const p of extraPerms) permsToCreate.push({ permission_id: p.id });
    }

    // Deduplicate permission_ids to avoid P2002 unique constraint violations
    const seen = new Set();
    const uniquePerms = [];
    for (const p of permsToCreate) {
      if (!seen.has(p.permission_id)) { seen.add(p.permission_id); uniquePerms.push(p); }
    }

    if (uniquePerms.length) {
      await prisma.role.update({ where: { id: role.id }, data: { rolePermissions: { create: uniquePerms } } });
    }
  }

  // Seed scale grades
  const scaleGrades = [
    { name: "BPS-17", description: "Basic Pay Scale 17", level: 17, category: "BPS" },
    { name: "BPS-18", description: "Basic Pay Scale 18", level: 18, category: "BPS" },
    { name: "BPS-19", description: "Basic Pay Scale 19", level: 19, category: "BPS" },
    { name: "BPS-20", description: "Basic Pay Scale 20", level: 20, category: "BPS" },
    { name: "Grade-A", description: "Grade A level", level: 1, category: "Grade" },
    { name: "Grade-B", description: "Grade B level", level: 2, category: "Grade" },
    { name: "Grade-C", description: "Grade C level", level: 3, category: "Grade" },
    { name: "Level-1", description: "Entry level position", level: 1, category: "Level" },
    { name: "Level-2", description: "Intermediate level position", level: 2, category: "Level" },
    { name: "Level-3", description: "Senior level position", level: 3, category: "Level" }
  ];

  console.log('📊 Seeding scale grades...');
  const createdScaleGrades = [];
  for (const grade of scaleGrades) {
    const scaleGrade = await prisma.scaleGrade.create({ data: { ...grade, is_deleted: false } });
    console.log(`✅ Created Scale Grade: ${scaleGrade.name} (${scaleGrade.category})`);
    createdScaleGrades.push(scaleGrade);
  }

  // Seed employees
  const employees = [
    // Leadership
    { employee_id: "EMPDG001", full_name: "Naveed Rafaqat Ahmad", father_husband_name: "Rafaqat Ahmad", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345671", cnic_issue_date: new Date("2012-03-15"), cnic_expire_date: new Date("2032-03-14"), date_of_birth: new Date("1972-11-05"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", blood_group: "A+", domicile_district: "Lahore", mobile_number: "03001234567", whatsapp_number: "03001234567", email: "naveed.ahmad@psba.gop.pk", present_address: "Gulberg III, Lahore", permanent_address: "Gulberg III, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPAD001", full_name: "Farhan Dilawar Sheikh", father_husband_name: "Dilawar Sheikh", relationship_type: "father", mother_name: "Sania", cnic: "3520212345689", cnic_issue_date: new Date("2015-05-20"), cnic_expire_date: new Date("2035-05-19"), date_of_birth: new Date("1980-02-12"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", blood_group: "B+", domicile_district: "Lahore", mobile_number: "03011234567", whatsapp_number: "03011234567", email: "farhan.sheikh@psba.gop.pk", present_address: "Johar Town, Lahore", permanent_address: "Johar Town, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPAD002", full_name: "Roshan Zameer", father_husband_name: "Zameer Ahmed", relationship_type: "father", mother_name: "Nusrat", cnic: "3520212345697", cnic_issue_date: new Date("2015-07-10"), cnic_expire_date: new Date("2035-07-09"), date_of_birth: new Date("1981-08-21"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", blood_group: "O+", domicile_district: "Lahore", mobile_number: "03021234567", whatsapp_number: "03021234567", email: "roshan.zameer@psba.gop.pk", present_address: "DHA, Lahore", permanent_address: "DHA, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPAD003", full_name: "Sadam Hussain", father_husband_name: "Hussain Ahmed", relationship_type: "father", mother_name: "Shazia", cnic: "3520212345701", cnic_issue_date: new Date("2016-01-18"), cnic_expire_date: new Date("2036-01-17"), date_of_birth: new Date("1982-03-09"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", blood_group: "AB+", domicile_district: "Lahore", mobile_number: "03031234567", whatsapp_number: "03031234567", email: "sadam.hussain@psba.gop.pk", present_address: "Model Town, Lahore", permanent_address: "Model Town, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPSE001", full_name: "Asad Abbas", father_husband_name: "Abbas Ali", relationship_type: "father", mother_name: "Razia", cnic: "3520212345719", cnic_issue_date: new Date("2014-09-01"), cnic_expire_date: new Date("2034-08-31"), date_of_birth: new Date("1979-06-14"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", blood_group: "B+", domicile_district: "Lahore", mobile_number: "03041234567", whatsapp_number: "03041234567", email: "asad.abbas@psba.gop.pk", present_address: "Garden Town, Lahore", permanent_address: "Garden Town, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },

    // Assistant Directors under Farhan
    { employee_id: "EMPADF001", full_name: "Moeen Chishti", father_husband_name: "Chishti Ahmed", relationship_type: "father", cnic: "3520212345727", cnic_issue_date: new Date("2018-04-10"), cnic_expire_date: new Date("2038-04-09"), date_of_birth: new Date("1990-10-10"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03051234567", whatsapp_number: "03051234567", email: "moeen.chishti@psba.gop.pk", present_address: "Township, Lahore", permanent_address: "Township, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },

    // Assistant Directors under Roshan
    { employee_id: "EMPADR001", full_name: "Rizwan Haider Shah", father_husband_name: "Haider Shah", relationship_type: "father", mother_name: "Nusrat", cnic: "3520212345735", cnic_issue_date: new Date("2017-07-21"), cnic_expire_date: new Date("2037-07-20"), date_of_birth: new Date("1991-01-22"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03061234567", whatsapp_number: "03061234567", email: "rizwan.shah@psba.gop.pk", present_address: "Gulshan-e-Ravi, Lahore", permanent_address: "Gulshan-e-Ravi, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADR002", full_name: "Muhammad Ahmad", father_husband_name: "Muhammad Akram", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345743", cnic_issue_date: new Date("2017-05-02"), cnic_expire_date: new Date("2037-05-01"), date_of_birth: new Date("1992-02-15"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03071234567", whatsapp_number: "03071234567", email: "m.ahmad@psba.gop.pk", present_address: "Allama Iqbal Town, Lahore", permanent_address: "Allama Iqbal Town, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADR003", full_name: "Muhammad Ali Hassan", father_husband_name: "Ali Hassan", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345750", cnic_issue_date: new Date("2016-11-11"), cnic_expire_date: new Date("2036-11-10"), date_of_birth: new Date("1992-09-09"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03081234567", whatsapp_number: "03081234567", email: "m.ali.hassan@psba.gop.pk", present_address: "Wapda Town, Lahore", permanent_address: "Wapda Town, Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADR004", full_name: "Barkat Ali Laghari", father_husband_name: "Ali Laghari", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345768", cnic_issue_date: new Date("2018-08-18"), cnic_expire_date: new Date("2038-08-17"), date_of_birth: new Date("1993-03-03"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03091234567", whatsapp_number: "03091234567", email: "barkat.laghari@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADR005", full_name: "Muhammad Amir", father_husband_name: "Amir Khan", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345776", cnic_issue_date: new Date("2018-12-01"), cnic_expire_date: new Date("2038-11-30"), date_of_birth: new Date("1993-12-12"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03101234567", whatsapp_number: "03101234567", email: "m.amir@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },

    // Assistant Directors under Sadam
    { employee_id: "EMPADS001", full_name: "Usman Badar", father_husband_name: "Badar Hussain", relationship_type: "father", mother_name: "Razia", cnic: "3520212345784", cnic_issue_date: new Date("2019-03-25"), cnic_expire_date: new Date("2039-03-24"), date_of_birth: new Date("1991-07-07"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03111234567", whatsapp_number: "03111234567", email: "usman.badar@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },

    // Assistant Directors reporting to DG
    { employee_id: "EMPADG001", full_name: "Mariya Iqbal", father_husband_name: "Iqbal Ahmed", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345792", cnic_issue_date: new Date("2016-06-06"), cnic_expire_date: new Date("2036-06-05"), date_of_birth: new Date("1990-04-18"), gender: "Female", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03121234567", whatsapp_number: "03121234567", email: "mariya.iqbal@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADG002", full_name: "Rab Nawaz Baloch", father_husband_name: "Nawaz Baloch", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345806", cnic_issue_date: new Date("2016-04-14"), cnic_expire_date: new Date("2036-04-13"), date_of_birth: new Date("1989-05-28"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03131234567", whatsapp_number: "03131234567", email: "rab.baloch@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADG003", full_name: "Asim Shahbaz", father_husband_name: "Shahbaz Ahmed", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345814", cnic_issue_date: new Date("2016-02-20"), cnic_expire_date: new Date("2036-02-19"), date_of_birth: new Date("1989-08-08"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03141234567", whatsapp_number: "03141234567", email: "asim.shahbaz@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADG004", full_name: "Muhammad Iqbal", father_husband_name: "Muhammad Saleem", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345822", cnic_issue_date: new Date("2017-01-01"), cnic_expire_date: new Date("2037-12-31"), date_of_birth: new Date("1990-10-01"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03151234567", whatsapp_number: "03151234567", email: "m.iqbal@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADG005", full_name: "Kashif Rasheed", father_husband_name: "Rasheed Ahmed", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345830", cnic_issue_date: new Date("2017-05-05"), cnic_expire_date: new Date("2037-05-04"), date_of_birth: new Date("1991-11-11"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03161234567", whatsapp_number: "03161234567", email: "kashif.rasheed@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    { employee_id: "EMPADG006", full_name: "Muhammad Ali", father_husband_name: "Muhammad Rafiq", relationship_type: "father", mother_name: "Khadija", cnic: "3520212345849", cnic_issue_date: new Date("2017-09-09"), cnic_expire_date: new Date("2037-09-08"), date_of_birth: new Date("1992-12-20"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03171234567", whatsapp_number: "03171234567", email: "m.ali@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },

    // Added: Bazaar Manager (BAZAAR location employee)
    { employee_id: "EMPBZ001", full_name: "Bazaar Manager One", father_husband_name: "Akhtar Ali", relationship_type: "father", mother_name: "Ayesha", cnic: "3520212345900", cnic_issue_date: new Date("2019-01-01"), cnic_expire_date: new Date("2039-01-01"), date_of_birth: new Date("1990-01-01"), gender: "Male", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03211234567", whatsapp_number: "03211234567", email: "bazaar.manager@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    // Added: Head Office staff (BPS < 17 equivalent)
    { employee_id: "EMPHO001", full_name: "Head Office Staff", father_husband_name: "Rashid Khan", relationship_type: "father", mother_name: "Saira", cnic: "3520212345918", cnic_issue_date: new Date("2020-02-02"), cnic_expire_date: new Date("2040-02-01"), date_of_birth: new Date("1996-05-10"), gender: "Male", marital_status: "Single", nationality: "Pakistani", religion: "Islam", mobile_number: "03221234567", whatsapp_number: "03221234567", email: "hostaff.emp@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false },
    // Added: HR viewer (for Manage view)
    { employee_id: "EMPHR001", full_name: "HR Viewer Test", father_husband_name: "Ijaz Ahmed", relationship_type: "father", mother_name: "Samina", cnic: "3520212345926", cnic_issue_date: new Date("2018-03-03"), cnic_expire_date: new Date("2038-03-02"), date_of_birth: new Date("1993-07-21"), gender: "Female", marital_status: "Married", nationality: "Pakistani", religion: "Islam", mobile_number: "03231234567", whatsapp_number: "03231234567", email: "hr.viewer@psba.gop.pk", present_address: "Lahore", permanent_address: "Lahore", district: "Lahore", city: "Lahore", status: "Active", is_deleted: false }
  ];

  console.log('👥 Seeding employees...');
  for (const emp of employees) {
    const dist = createdDistricts.find((d) => d.name === emp.district);
    const city = createdCities.find((c) => c.name === emp.city && (!dist || c.district_id === dist.id))
              || createdCities.find((c) => c.name === emp.city);

    // Normalize CNIC and mobile formats
    const cnic = String(emp.cnic || '').replace(/\D/g, '').slice(-13);
    const normalizeMobile = (v) => {
      let num = String(v || '').replace(/\D/g, '');
      // strip leading country code 92 if present
      if (num.startsWith('92')) num = num.slice(2);
      if (num.length === 10) num = '0' + num;
      if (num.length > 11) num = num.slice(-11);
      return num;
    };
    const mobile = normalizeMobile(emp.mobile_number);
    const whatsapp = normalizeMobile(emp.whatsapp_number ?? emp.mobile_number);

    const employee = await prisma.employee.create({ 
      data: { 
        ...emp, 
        cnic,
        mobile_number: mobile,
        whatsapp_number: whatsapp,
        district_id: dist?.id || null, 
        city_id: city?.id || null 
      } 
    });
    console.log(`✅ Created Employee: ${employee.full_name} (${employee.employee_id})`);
    createdEmployees.push(employee);
  }

  // Expense Claim Test Data will be added after employees are created later

  // Seed users (mapped by full_name for stability)
  const findEmpId = (name) => createdEmployees.find(e => e.full_name === name)?.id;
  const users = [
    { email: "admin@psba.gop.pk", password: encrypt("admin123"), role_id: createdRoles[0].id, employee_id: findEmpId("Muhammad Ali Hassan"), is_deleted: false },
    { email: "hr@psba.gop.pk", password: encrypt("hr123"), role_id: createdRoles[1].id, employee_id: findEmpId("Mariya Iqbal"), is_deleted: false },
    { email: "officer@psba.gop.pk", password: encrypt("officer123"), role_id: createdRoles[2].id, employee_id: findEmpId("Muhammad Ahmad"), is_deleted: false },
    // Added: DG (approves Head Office requests)
    { email: "dg@psba.gop.pk", password: encrypt("dg123"), role_id: (createdRoles.find(r => r.name === 'Manager')?.id || createdRoles[2].id), employee_id: findEmpId("Naveed Rafaqat Ahmad"), is_deleted: false },
    // Added: Ops approver (department contains Operations)
    { email: "ops@psba.gop.pk", password: encrypt("ops123"), role_id: (createdRoles.find(r => r.name === 'Manager')?.id || createdRoles[2].id), employee_id: findEmpId("Muhammad Ali"), is_deleted: false },
    // Added: Bazaar Manager (manager of a Bazaar location)
    { email: "bazaar@psba.gop.pk", password: encrypt("bazaar123"), role_id: (createdRoles.find(r => r.name === 'Manager')?.id || createdRoles[2].id), employee_id: findEmpId("Bazaar Manager One"), is_deleted: false },
    // Added: Head Office staff (should NOT be able to create TADA due to grade < 17)
    { email: "hostaff@psba.gop.pk", password: encrypt("staff123"), role_id: (createdRoles.find(r => r.name === 'Employee')?.id || createdRoles[4].id), employee_id: findEmpId("Head Office Staff"), is_deleted: false },
    // Added: HR viewer (can view/manage list but cannot approve)
    { email: "hrviewer@psba.gop.pk", password: encrypt("hrviewer123"), role_id: (createdRoles.find(r => r.name === 'HR Officer')?.id || createdRoles[2].id), employee_id: findEmpId("HR Viewer Test"), is_deleted: false }
  ];

  console.log('👤 Seeding users...');
  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    console.log(`✅ Created User: ${createdUser.email}`);
    createdUsers.push(createdUser);
  }

  // New: Seed master locations (Location table)
  console.log('📍 Seeding master locations...');
  const masterLocations = [
    {
      name: 'Head Quarter',
      type: 'HEAD_OFFICE',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Johar Town Phase 1, Lahore',
      is_active: true,
      manager_user_id: createdUsers[0]?.id || null
    },
    {
      name: 'Sahulat Bazaar Mian Plaza',
      type: 'BAZAAR',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Mian Plaza, Johar Town, Lahore',
      is_active: true,
      manager_user_id: (createdUsers.find(u => u.email === 'bazaar@psba.gop.pk')?.id) || null
    },
    {
      name: 'Sahulat Bazaar Township Bazaar',
      type: 'BAZAAR',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Township, Lahore',
      is_active: true,
      manager_user_id: null
    },
    {
      name: 'Sahulat Bazaar Jhang',
      type: 'BAZAAR',
      district: 'Jhang',
      city: 'Jhang',
      full_address: 'Jhang City',
      is_active: true,
      manager_user_id: null
    },
    {
      name: 'Sahulat Bazaar Faisalabad',
      type: 'BAZAAR',
      district: 'Faisalabad',
      city: 'Faisalabad',
      full_address: 'Faisalabad City',
      is_active: true,
      manager_user_id: null
    },
    {
      name: 'Sahulat Bazaar Layyah',
      type: 'BAZAAR',
      district: 'Layyah',
      city: 'Layyah',
      full_address: 'Layyah City',
      is_active: true,
      manager_user_id: null
    }
  ];
  const createdLocations = [];
  for (const loc of masterLocations) {
    const dist = createdDistricts.find(d => d.name === loc.district);
    const city = createdCities.find(c => c.name === loc.city && (!dist || c.district_id === dist.id)) || createdCities.find(c => c.name === loc.city);
    const created = await prisma.location.create({ data: { name: loc.name, type: loc.type, district_id: dist?.id || null, city_id: city?.id || null, full_address: loc.full_address, is_active: loc.is_active, manager_user_id: loc.manager_user_id } });
    console.log(`✅ Created Location: ${created.name} (${created.type})`);
    createdLocations.push(created);
  }

  // Seed past experiences
  const pastExperiences = [
    {
      employee_id: createdEmployees[0].id,
      company_name: "Government of Punjab",
      position: "Junior Engineer",
      start_date: "2008-01-15",
      end_date: "2010-12-31",
      description: "Junior Engineer in Public Works Department",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[1].id,
      company_name: "Tech Solutions Ltd",
      position: "Software Developer",
      start_date: "2012-06-01",
      end_date: "2015-08-30",
      description: "Software Developer specializing in web applications",
      is_deleted: false
    }
  ];

  console.log('💼 Seeding past experiences...');
  for (const exp of pastExperiences) {
    const experience = await prisma.pastExperience.create({ data: exp });
    console.log(`✅ Created Past Experience: ${experience.company_name}`);
  }

  // Seed education qualifications
  const educationQualifications = [
    {
      employee_id: createdEmployees[0].id,
      education_level: "Bachelor's Degree",
      institution_name: "University of Engineering and Technology, Lahore",
      year_of_completion: "2007",
      marks_gpa: "3.2",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[1].id,
      education_level: "Master's Degree",
      institution_name: "Karachi University",
      year_of_completion: "2012",
      marks_gpa: "3.8",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[2].id,
      education_level: "Bachelor's Degree",
      institution_name: "Punjab University",
      year_of_completion: "2010",
      marks_gpa: "3.5",
      is_deleted: false
    }
  ];

  console.log('🎓 Seeding education qualifications...');
  const mapLevelName = (txt) => {
    if (!txt) return null;
    const t = txt.toLowerCase();
    if (t.includes('matric')) return 'Matric';
    if (t.includes('inter') || t.includes('fsc') || t.includes('fa')) return 'Intermediate (FA/FSc)';
    if (t.includes('bachelor')) return 'Bachelor';
    if (t.includes('master')) return 'Master';
    if (t.includes('mphil')) return 'MPhil';
    if (t.includes('phd') || t.includes('doctor')) return 'PhD';
    return null;
  };
  const levelIdByName = Object.fromEntries(createdEducationLevels.map((l) => [l.name, l.id]));

  for (const edu of educationQualifications) {
    const mappedName = mapLevelName(edu.education_level);
    const levelId = mappedName ? levelIdByName[mappedName] : null;
    // Attempt to generate a start_date approximately 4 years before completion year
    let start_date = null;
    const yr = parseInt(edu.year_of_completion);
    if (!isNaN(yr)) {
      try { start_date = new Date(`${yr - 4}-01-01`); } catch (_) { start_date = null; }
    }
    const qualification = await prisma.educationQualification.create({ data: { ...edu, education_level_id: levelId || null, start_date } });
    console.log(`✅ Created Education: ${qualification.education_level} - ${qualification.institution_name}`);
  }

  // Seed employee documents
  const documents = [
    {
      employee_id: createdEmployees[0].id,
      file_path: "/uploads/profiles/ahmed_profile.jpg",
      file_type: "profile_picture",
      document_name: "ahmed_profile.jpg",
      file_size: 245760,
      mime_type: "image/jpeg",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[0].id,
      file_path: "/uploads/cnic/ahmed_cnic_front.jpg",
      file_type: "cnic_front",
      document_name: "ahmed_cnic_front.jpg",
      file_size: 189440,
      mime_type: "image/jpeg",
      is_deleted: false
    }
  ];

  console.log('📄 Seeding employee documents...');
  for (const doc of documents) {
    const document = await prisma.employeeDocument.create({ data: doc });
    console.log(`✅ Created Document: ${document.file_type} for employee ${document.employee_id}`);
  }

  // Helper to find a master location id by name
  const findLocationId = (name) => createdLocations.find(l => l.name === name)?.id || null;

  // Seed employment records (now referencing main Location via location_id)
  // Replace with org chart mapping
  const deptId = (n) => createdDepartments.find(d => d.name === n)?.id;
  const desigId = (title, deptName) => {
    const did = deptId(deptName);
    return createdDesignations.find(d => d.title === title && d.department_id === did)?.id;
  };
  const empId = (name) => createdEmployees.find(e => e.full_name === name)?.id;

  const employmentRecords = [
    // DG
    { employee_id: empId('Naveed Rafaqat Ahmad'), organization: 'PSBA', department_id: deptId('Authority'), designation_id: desigId('Director General', 'Authority'), employment_type: 'Regular', effective_from: new Date('2019-01-01'), office_location: 'Head Quarter', remarks: 'Head of Authority', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-19').id, employment_status: 'active', is_current: true, filer_status: 'filer', location_id: findLocationId('Head Quarter'), is_deleted: false },
    // Additional Directors reporting to DG
    { employee_id: empId('Farhan Dilawar Sheikh'), organization: 'PSBA', department_id: deptId('Authority'), designation_id: desigId('Additional Director', 'Authority'), employment_type: 'Regular', effective_from: new Date('2020-01-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-18').id, employment_status: 'active', is_current: true, filer_status: 'filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Roshan Zameer'), organization: 'PSBA', department_id: deptId('Authority'), designation_id: desigId('Additional Director', 'Authority'), employment_type: 'Regular', effective_from: new Date('2020-01-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-18').id, employment_status: 'active', is_current: true, filer_status: 'filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Sadam Hussain'), organization: 'PSBA', department_id: deptId('Authority'), designation_id: desigId('Additional Director', 'Authority'), employment_type: 'Regular', effective_from: new Date('2020-01-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-18').id, employment_status: 'active', is_current: true, filer_status: 'filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    // Senior Head (Sr. Engineer, Civil) reporting to DG
    { employee_id: empId('Asad Abbas'), organization: 'PSBA', department_id: deptId('Engineering'), designation_id: desigId('Sr. Engineer, Civil', 'Engineering'), employment_type: 'Regular', effective_from: new Date('2019-06-01'), office_location: 'Head Quarter', remarks: 'Sr. Engineer (Civil), reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-18').id, employment_status: 'active', is_current: true, filer_status: 'filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },

    // Under Farhan
    { employee_id: empId('Moeen Chishti'), organization: 'PSBA', department_id: deptId('Audit, Compliance & Control'), designation_id: desigId('Assistant Director', 'Audit, Compliance & Control'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Farhan Dilawar Sheikh', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Farhan Dilawar Sheikh')), location_id: findLocationId('Head Quarter'), is_deleted: false },

    // Under Roshan
    { employee_id: empId('Rizwan Haider Shah'), organization: 'PSBA', department_id: deptId('Projects, Planning & Initiatives'), designation_id: desigId('Assistant Director', 'Projects, Planning & Initiatives'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Roshan Zameer', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Roshan Zameer')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Muhammad Ahmad'), organization: 'PSBA', department_id: deptId('IT'), designation_id: desigId('Assistant Director', 'IT'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Roshan Zameer', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Roshan Zameer')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Muhammad Ali Hassan'), organization: 'PSBA', department_id: deptId('Software Development & Operations'), designation_id: desigId('Assistant Director', 'Software Development & Operations'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Roshan Zameer', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Roshan Zameer')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Barkat Ali Laghari'), organization: 'PSBA', department_id: deptId('Structural Design'), designation_id: desigId('Structural Design Engineer', 'Structural Design'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Roshan Zameer', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Roshan Zameer')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Muhammad Amir'), organization: 'PSBA', department_id: deptId('Architecture'), designation_id: desigId('Architect', 'Architecture'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Roshan Zameer', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Roshan Zameer')), location_id: findLocationId('Head Quarter'), is_deleted: false },

    // Under Sadam
    { employee_id: empId('Usman Badar'), organization: 'PSBA', department_id: deptId('Ops & Revenue – Central/North'), designation_id: desigId('Assistant Director', 'Ops & Revenue – Central/North'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to Additional Director Sadam Hussain', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Sadam Hussain')), location_id: findLocationId('Head Quarter'), is_deleted: false },

    // Reporting to DG directly
    { employee_id: empId('Mariya Iqbal'), organization: 'PSBA', department_id: deptId('Establishment'), designation_id: desigId('Assistant Director', 'Establishment'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Rab Nawaz Baloch'), organization: 'PSBA', department_id: deptId('Legal'), designation_id: desigId('Assistant Director', 'Legal'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Asim Shahbaz'), organization: 'PSBA', department_id: deptId('Security & Surveillance'), designation_id: desigId('Assistant Director', 'Security & Surveillance'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Muhammad Iqbal'), organization: 'PSBA', department_id: deptId('Budget, Finance & Taxation'), designation_id: desigId('Assistant Director', 'Budget, Finance & Taxation'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Kashif Rasheed'), organization: 'PSBA', department_id: deptId('Accounts, Payroll & Reconciliation'), designation_id: desigId('Assistant Director', 'Accounts, Payroll & Reconciliation'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    { employee_id: empId('Muhammad Ali'), organization: 'PSBA', department_id: deptId('HQ Admin / Operations'), designation_id: desigId('Assistant Director', 'HQ Admin / Operations'), employment_type: 'Regular', effective_from: new Date('2021-03-01'), office_location: 'Head Quarter', remarks: 'Reports to DG', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'BPS-17').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false },

    // Added: Bazaar Manager employed at a BAZAAR location
    { employee_id: empId('Bazaar Manager One'), organization: 'PSBA', department_id: deptId('HQ Admin / Operations'), designation_id: desigId('Assistant Director', 'HQ Admin / Operations'), employment_type: 'Regular', effective_from: new Date('2022-01-01'), office_location: 'Sahulat Bazaar Mian Plaza', remarks: 'Bazaar Manager at Bazaar location', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'Level-3').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Muhammad Ali')), location_id: findLocationId('Sahulat Bazaar Mian Plaza'), is_deleted: false },
    // Added: HO staff (grade < 17) at Head Office
    { employee_id: empId('Head Office Staff'), organization: 'PSBA', department_id: deptId('Engineering'), designation_id: desigId('Junior Engineer', 'Engineering'), employment_type: 'Regular', effective_from: new Date('2022-02-01'), office_location: 'Head Quarter', remarks: 'HO staff with Level-3 (below BPS-17)', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'Level-3').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Asad Abbas')), location_id: findLocationId('Head Quarter'), is_deleted: false },
    // Added: HR viewer in HR department at Head Office
    { employee_id: empId('HR Viewer Test'), organization: 'PSBA', department_id: deptId('HR'), designation_id: desigId('HR Officer', 'HR'), employment_type: 'Regular', effective_from: new Date('2022-03-01'), office_location: 'Head Quarter', remarks: 'HR viewer for Manage list', scale_grade_id: createdScaleGrades.find(sg => sg.name === 'Level-3').id, employment_status: 'active', is_current: true, filer_status: 'non_filer', reporting_officer_id: String(empId('Naveed Rafaqat Ahmad')), location_id: findLocationId('Head Quarter'), is_deleted: false }
  ];

  // NOTE: Employees already seeded earlier; removed duplicate employee creation loop to avoid P2002 errors.
  // Now seed employment records.
  console.log('🧑‍💼 Seeding employment records...');
  // reuse existing createdEmployments array declared earlier
  for (const rec of employmentRecords) {
    const employment = await prisma.employment.create({ data: rec });
    createdEmployments.push(employment);
    console.log(`✅ Employment created for employee_id ${rec.employee_id}`);
  }

  // After base employees seeded, add extra HR Approver if not present
  const existingHrApprover = createdEmployees.find(e => e.full_name === 'HR Approver');
  if(!existingHrApprover){
    const hrApproverEmp = await prisma.employee.create({ data: {
      employee_id: 'EMPHR002', full_name: 'HR Approver', father_husband_name: 'Karim', relationship_type: 'father', cnic: '3520212345934', cnic_issue_date: new Date('2018-04-04'), cnic_expire_date: new Date('2038-04-03'), date_of_birth: new Date('1991-09-09'), gender: 'Male', marital_status: 'Married', nationality: 'Pakistani', religion: 'Islam', mobile_number: '03241234567', whatsapp_number: '03241234567', email: 'hrapprover.emp@psba.gop.pk', present_address: 'Lahore', permanent_address: 'Lahore', district: 'Lahore', city: 'Lahore', status: 'Active', is_deleted: false }
    });
    createdEmployees.push(hrApproverEmp);
    console.log('✅ Created Employee: HR Approver (EMPHR002)');
  }

  // 👤 Seeding users (additional)...
  const findEmpIdLater = (name) => createdEmployees.find(e => e.full_name === name)?.id;
  const extraUsers = [];
  if(!createdUsers.find(u => u.email === 'hrapprover@psba.gop.pk')){
    extraUsers.push({ email: 'hrapprover@psba.gop.pk', password: encrypt('hrapp123'), role_id: (createdRoles.find(r => r.name === 'HR Admin')?.id || createdRoles[1].id), employee_id: findEmpIdLater('HR Approver'), is_deleted: false });
  }
  if(!createdUsers.find(u => u.email === 'accounts@psba.gop.pk')){
    extraUsers.push({ email: 'accounts@psba.gop.pk', password: encrypt('accounts123'), role_id: (createdRoles.find(r => r.name === 'Manager')?.id || createdRoles[2].id), employee_id: findEmpIdLater('Kashif Rasheed'), is_deleted: false });
  }
  for(const u of extraUsers){ const cu = await prisma.user.create({ data: u }); createdUsers.push(cu); console.log('✅ Created User:', cu.email); }



  // Ensure employment record for HR Approver (after base employment seeding)
  const hrDept = createdDepartments.find(d=> d.name==='HR');
  const hrManagerDesig = createdDesignations.find(d=> d.title==='HR Manager' && d.department_id===hrDept?.id) || createdDesignations.find(d=> d.title==='HR Officer' && d.department_id===hrDept?.id);
  const scaleBps18 = await prisma.scaleGrade.findFirst({ where: { name: 'BPS-18' } });
  const hrApproverEmpId = findEmpIdLater('HR Approver');
  if(hrApproverEmpId && !await prisma.employment.findFirst({ where: { employee_id: hrApproverEmpId, is_current: true } })){
    const locHQ = await prisma.location.findFirst({ where: { type: 'HEAD_OFFICE' } });
    const hrEmp = await prisma.employment.create({ data: { employee_id: hrApproverEmpId, organization: 'PSBA', department_id: hrDept?.id, designation_id: hrManagerDesig?.id, employment_type: 'Regular', effective_from: new Date('2022-05-01'), office_location: 'Head Quarter', remarks: 'HR Approver Seed', scale_grade_id: scaleBps18?.id, employment_status: 'active', is_current: true, filer_status: 'filer', location_id: locHQ?.id, is_deleted: false } });
    createdEmployments.push(hrEmp);
    console.log('✅ Created Employment: HR Approver');
  }

  // Permissions are already seeded above; proceed to system settings only
  // Seed default system settings (security/ui)
  await prisma.systemSetting.upsert({
    where: { key: 'security' },
    update: {},
    create: {
      key: 'security',
      category: 'security',
      value: {
        passwordPolicy: { minLength: 8, requireNumber: true, requireUppercase: true, requireSymbol: false },
        sessionMaxAgeMinutes: 60,
        lockoutThreshold: 5,
        twoFactorEnabled: false
      }
    }
  });

  // Seed Travel Requests test data (TADA)
  console.log('🧳 Seeding travel requests (test data)...');
  const empByName = (n) => createdEmployees.find(e => e.full_name === n)?.id;
  const daysFromNow = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt; };

  // 1) Head Office request (PENDING/CREATED) by BPS-17 applicant
  const t1 = await prisma.travelRequest.create({ data: {
    applicant_id: empByName('Muhammad Ahmad'),
    departure_date: daysFromNow(1),
    departure_time: '09:30',
    expected_return_date: daysFromNow(3),
    purpose: 'HO visit for IT coordination',
    destination: 'Lahore HQ',
    total_days: 2,
    status: 'CREATED'
  }});
  await prisma.travelRequestEmployee.createMany({ data: [
    { request_id: t1.id, employee_id: empByName('Muhammad Ahmad') },
    { request_id: t1.id, employee_id: empByName('Muhammad Ali Hassan') }
  ]});
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t1.id, action: 'CREATED', actor_employee_id: empByName('Muhammad Ahmad') } });

  // 2) Bazaar request (PENDING/CREATED) by Bazaar Manager at BAZAAR location
  const t2 = await prisma.travelRequest.create({ data: {
    applicant_id: empByName('Bazaar Manager One'),
    departure_date: daysFromNow(2),
    departure_time: '10:00',
    expected_return_date: daysFromNow(2),
    purpose: 'Bazaar operations visit',
    destination: 'Mian Plaza',
    total_days: 1,
    status: 'CREATED'
  }});
  await prisma.travelRequestEmployee.createMany({ data: [
    { request_id: t2.id, employee_id: empByName('Bazaar Manager One') },
    { request_id: t2.id, employee_id: empByName('Head Office Staff') }
  ]});
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t2.id, action: 'CREATED', actor_employee_id: empByName('Bazaar Manager One') } });

  // 3) HO request already APPROVED by DG
  const t3 = await prisma.travelRequest.create({ data: {
    applicant_id: empByName('Muhammad Ahmad'),
    departure_date: daysFromNow(-5),
    departure_time: '08:00',
    expected_return_date: daysFromNow(-3),
    purpose: 'Approved HO trip',
    destination: 'Islamabad',
    total_days: 2,
    status: 'APPROVED'
  }});
  await prisma.travelRequestEmployee.createMany({ data: [
    { request_id: t3.id, employee_id: empByName('Muhammad Ahmad') }
  ]});
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t3.id, action: 'CREATED', actor_employee_id: empByName('Muhammad Ahmad') } });
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t3.id, action: 'APPROVED', actor_employee_id: empByName('Naveed Rafaqat Ahmad') } });

  // 4) Bazaar request REJECTED by Ops approver
  const t4 = await prisma.travelRequest.create({ data: {
    applicant_id: empByName('Bazaar Manager One'),
    departure_date: daysFromNow(-4),
    departure_time: '08:30',
    expected_return_date: daysFromNow(-4),
    purpose: 'Rejected bazaar trip',
    destination: 'Faisalabad Bazaar',
    total_days: 1,
    status: 'REJECTED'
  }});
  await prisma.travelRequestEmployee.createMany({ data: [
    { request_id: t4.id, employee_id: empByName('Bazaar Manager One') }
  ]});
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t4.id, action: 'CREATED', actor_employee_id: empByName('Bazaar Manager One') } });
  await prisma.travelRequestStatusEntry.create({ data: { request_id: t4.id, action: 'REJECTED', actor_employee_id: empByName('Muhammad Ali') } });

  // ✅ Insert sample approved travel request + expense claims (with segments & documents)
  console.log('🧪 Seeding sample expense claim data...');
  const sampleApplicantId = empByName('Muhammad Ahmad');
  const sampleAttendeeId = empByName('Muhammad Ali Hassan');
  if(sampleApplicantId && sampleAttendeeId){
    const recentApprovedReq = await prisma.travelRequest.create({ data: {
      applicant_id: sampleApplicantId,
      departure_date: daysFromNow(-2),
      departure_time: '07:45',
      expected_return_date: daysFromNow(-1),
      purpose: 'Field inspection for expense claim demo',
      destination: 'Sheikhupura',
      total_days: 1,
      status: 'APPROVED'
    }});
    await prisma.travelRequestEmployee.createMany({ data: [
      { request_id: recentApprovedReq.id, employee_id: sampleApplicantId },
      { request_id: recentApprovedReq.id, employee_id: sampleAttendeeId }
    ]});
    await prisma.travelRequestStatusEntry.create({ data: { request_id: recentApprovedReq.id, action: 'CREATED', actor_employee_id: sampleApplicantId } });
    await prisma.travelRequestStatusEntry.create({ data: { request_id: recentApprovedReq.id, action: 'APPROVED', actor_employee_id: empByName('Naveed Rafaqat Ahmad') } });

    // Create claim for attendee (not applicant) to demonstrate multi-attendee scenario
    const claim = await prisma.travelClaim.create({ data: {
      employee_id: sampleAttendeeId,
      travel_request_id: recentApprovedReq.id,
      from_date: recentApprovedReq.departure_date,
      to_date: recentApprovedReq.expected_return_date,
      per_diem_days: 0,
      per_diem_rate: 1500,
      rate_per_km: 35,
      toll_tax_total: 500,
      status: 'DRAFT'
    }});

    // Segments
    await prisma.travelClaimSegment.createMany({ data: [
      { claim_id: claim.id, departure_from: 'Lahore', departure_to: 'Sheikhupura', depart_time: '07:45', arrive_time: '09:00', mode: 'Car', distance_km: 55 },
      { claim_id: claim.id, departure_from: 'Sheikhupura', departure_to: 'Lahore', depart_time: '17:30', arrive_time: '18:40', mode: 'Car', distance_km: 55 }
    ]});

    // Documents (include mandatory REPORT and one FUEL)
    await prisma.travelClaimDocument.createMany({ data: [
      { claim_id: claim.id, category: 'REPORT', file_path: 'uploads/Travel/Claims/demo/report.pdf', mime_type: 'application/pdf', file_size: 12000 },
      { claim_id: claim.id, category: 'FUEL', file_path: 'uploads/Travel/Claims/demo/fuel_receipt.jpg', mime_type: 'image/jpeg', file_size: 8000 }
    ]});

    // Recompute totals
    const segs = await prisma.travelClaimSegment.findMany({ where: { claim_id: claim.id } });
    const total_distance = segs.reduce((s,a)=> s + Number(a.distance_km||0),0);
    const distance_amount = total_distance * 35;
    const travel_total = distance_amount + 500;
    const per_diem_amount = 1 * 1500;
    const grand_total = travel_total + per_diem_amount;
    await prisma.travelClaim.update({ where: { id: claim.id }, data: { total_distance_km: total_distance, distance_amount, travel_total, per_diem_amount, grand_total } });
    console.log('✅ Sample expense claim seeded: Request', recentApprovedReq.id, 'Claim', claim.id);
  } else {
    console.log('⚠️ Skipped sample expense claim seeding (missing employees)');
  }

  // Seed Travel Rates (sample)
  console.log('🧮 Seeding travel rates...');
  const sampleGrades = await prisma.scaleGrade.findMany({ where: { name: { in: ['BPS-17','BPS-18','BPS-19','Level-3'] } } });
  for(const g of sampleGrades){
    const exists = await prisma.travelRate.findFirst({ where: { scale_grade_id: g.id } });
    if(!exists){
      await prisma.travelRate.create({ data: { scale_grade_id: g.id, rate_per_km: g.name==='BPS-17'?300: g.name==='BPS-18'?320: g.name==='BPS-19'?350: 150, per_diem_rate: g.name==='BPS-17'?1500: g.name==='BPS-18'?1700: g.name==='BPS-19'?2000: 800 } });
      console.log('  • Rate added for', g.name);
    }
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Departments: ${createdDepartments.length}`);
  console.log(`   - Designations: ${createdDesignations.length}`);
  console.log(`   - Role Tags: ${createdRoleTags.length}`);
  console.log(`   - Roles: ${createdRoles.length}`);
  console.log(`   - Scale Grades: ${createdScaleGrades.length}`);
  console.log(`   - Employees: ${createdEmployees.length}`);
  console.log(`   - Users: ${createdUsers.length}`);
  console.log(`   - Master Locations: ${createdLocations.length}`);
  console.log(`   - Employment Records: ${createdEmployments.length}`);
  console.log(`   - Past Experiences: ${pastExperiences.length}`);
  console.log(`   - Education Qualifications: ${educationQualifications.length}`);
  console.log(`   - Employee Documents: ${documents.length}`);
  console.log(`   - Salary Records: ${salaryRecords.length}`);
  console.log(`   - Contract Records: ${contractRecords.length}`);
  console.log(`   - Employment Documents: ${employmentDocuments.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Database seeding complete.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });