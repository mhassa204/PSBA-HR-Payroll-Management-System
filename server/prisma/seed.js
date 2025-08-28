const { PrismaClient } = require("@prisma/client");

const HardDeleteUtil = require("../src/utils/hardDeleteUtil");
const { encrypt } = require("../src/utils/cryptoUtil");
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data using hard delete utility
  console.log('🧹 Cleaning existing data using hard delete...');
  
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

  // Seed departments
  const departments = [
    { name: "Engineering", code: "ENG", description: "Engineering and Technical Services" },
    { name: "IT", code: "IT", description: "Information Technology" },
    { name: "HR", code: "HR", description: "Human Resources" },
    { name: "Administration", code: "ADMIN", description: "Administrative Services" },
    { name: "Finance", code: "FIN", description: "Finance and Accounts" },
    { name: "Legal", code: "LEGAL", description: "Legal Affairs" },
    { name: "Operations", code: "OPS", description: "Operations Management" }
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
    { title: "Operations Manager", department_name: "Operations", level: 3 }
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
    const roleTag = await prisma.roleTag.create({
      data: {
        ...tag,
        is_deleted: false
      }
    });
    console.log(`✅ Created Role Tag: ${roleTag.name} (${roleTag.category})`);
    createdRoleTags.push(roleTag);
  }

  // Seed roles
  const roles = [
    { 
      name: "Super Admin", 
      type: "system", 
      allowed_actions: ["*"], 
      enabled: true, 
      fields: ["*"] 
    },
    { 
      name: "HR Admin", 
      type: "system", 
      allowed_actions: [
        "employees.read","employees.create","employees.update","employees.delete",
        "employment.read","employment.create","employment.update","employment.delete",
        "employment.salary.read","employment.salary.create","employment.salary.update","employment.salary.delete",
        "employment.location.read","employment.location.create","employment.location.update","employment.location.delete",
        "employment.contract.read","employment.contract.create","employment.contract.update","employment.contract.delete",
        "departments.read","departments.create","departments.update","departments.delete",
        "designations.read","designations.create","designations.update","designations.delete",
        "role-tags.read","role-tags.create","role-tags.update","role-tags.delete",
        "scale-grades.read","scale-grades.create","scale-grades.update","scale-grades.delete",
        "locations.read","locations.create","locations.update","locations.delete",
        "reports.read",
        "users.read","users.manage",
        "audit.read",
        "roster.read","roster.create","roster.update","roster.delete"
      ], 
      enabled: true, 
      fields: ["employee_personal", "employee_employment", "employee_salary", "employee_documents"] 
    },
    { 
      name: "HR Officer", 
      type: "custom", 
      allowed_actions: ["employees.read","employees.create","employees.update","reports.read"], 
      enabled: true, 
      fields: ["employee_personal", "employee_employment"] 
    },
    { 
      name: "Manager", 
      type: "custom", 
      allowed_actions: ["employees.read","reports.read","requests.approve","roster.read","roster.create","roster.update"], 
      enabled: true, 
      fields: ["employee_basic", "employee_employment"] 
    },
    { 
      name: "Employee", 
      type: "custom", 
      allowed_actions: ["profile.read","profile.update"], 
      enabled: true, 
      fields: ["own_personal", "own_employment"] 
    }
  ];

  console.log('🛡️ Seeding roles...');
  const createdRoles = [];
  for (const role of roles) {
    const createdRole = await prisma.role.create({
      data: {
        name: role.name,
        type: role.type,
        enabled: role.enabled,
        fields: role.fields || [],
        is_deleted: false
      }
    });
    console.log(`✅ Created Role: ${createdRole.name} (${createdRole.type})`);
    createdRoles.push(createdRole);
  }

  // Add permissions based on allowed_actions
  const allPermKeys = Array.from(new Set(roles.flatMap(r => r.allowed_actions).filter(k => k !== '*')));
  for (const key of allPermKeys) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, resource: key.split('.')[0], action: key.split('.')[1] || 'read' },
      update: {},
    });
  }
  // Ensure roster.approve permission exists
  await prisma.permission.upsert({
    where: { key: 'roster.approve' },
    create: { key: 'roster.approve', resource: 'roster', action: 'approve' },
    update: {},
  });
  // Link permissions to roles
  for (const role of createdRoles) {
    const orig = roles.find(r => r.name === role.name);
    if (!orig) continue;
    if (orig.allowed_actions.includes('*')) continue;
    const perms = await prisma.permission.findMany({ where: { key: { in: orig.allowed_actions } } });
    await prisma.role.update({
      where: { id: role.id },
      data: { rolePermissions: { create: perms.map(p => ({ permission_id: p.id })) } }
    });
  }
  // Grant roster.approve only to Super Admin
  const approvePerm = await prisma.permission.findUnique({ where: { key: 'roster.approve' } });
  const superAdminRole = createdRoles.find(r => r.name === 'Super Admin');
  if (approvePerm && superAdminRole) {
    const existing = await prisma.rolePermission.findUnique({ where: { role_id_permission_id: { role_id: superAdminRole.id, permission_id: approvePerm.id } } }).catch(() => null);
    if (!existing) {
      await prisma.rolePermission.create({ data: { role_id: superAdminRole.id, permission_id: approvePerm.id } });
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
    const scaleGrade = await prisma.scaleGrade.create({
      data: {
        ...grade,
        is_deleted: false
      }
    });
    console.log(`✅ Created Scale Grade: ${scaleGrade.name} (${scaleGrade.category})`);
    createdScaleGrades.push(scaleGrade);
  }

  // Seed employees
  const employees = [
    {
      employee_id: "EMP2024001",
      full_name: "Ahmed Ali Khan",
      father_husband_name: "Muhammad Ali Khan",
      relationship_type: "father",
      mother_name: "Fatima Khan",
      cnic: "35202-1234567-1",
      cnic_issue_date: new Date("2015-01-15"),
      cnic_expire_date: new Date("2030-01-15"),
      date_of_birth: new Date("1985-03-20"),
      gender: "Male",
      marital_status: "Married",
      nationality: "Pakistani",
      religion: "Islam",
      blood_group: "B+",
      domicile_district: "Lahore",
      mobile_number: "+92-300-1234567",
      whatsapp_number: "+92-300-1234567",
      email: "ahmed.ali@example.com",
      present_address: "House 123, Block A, Johar Town, Lahore",
      permanent_address: "Village Chak 45, Tehsil Kasur, District Kasur",
      district: "Lahore",
      city: "Lahore",
      status: "Active",
      is_deleted: false
    },
    {
      employee_id: "EMP2024002",
      full_name: "Fatima Sheikh",
      father_husband_name: "Abdul Rahman Sheikh",
      relationship_type: "father",
      mother_name: "Khadija Sheikh",
      cnic: "35202-2345678-2",
      cnic_issue_date: new Date("2016-05-20"),
      cnic_expire_date: new Date("2031-05-20"),
      date_of_birth: new Date("1990-07-15"),
      gender: "Female",
      marital_status: "Single",
      nationality: "Pakistani",
      religion: "Islam",
      blood_group: "A+",
      domicile_district: "Karachi",
      mobile_number: "+92-301-2345678",
      whatsapp_number: "+92-301-2345678",
      email: "fatima.sheikh@example.com",
      present_address: "Flat 45, Block B, Gulshan-e-Iqbal, Karachi",
      permanent_address: "House 67, Nazimabad, Karachi",
      district: "Karachi",
      city: "Karachi",
      has_disability: true,
      disability_type: "Visual",
      disability_description: "Partial vision impairment",
      status: "Active",
      is_deleted: false
    },
    {
      employee_id: "EMP2024003",
      full_name: "Muhammad Hassan",
      father_husband_name: "Ali Hassan",
      relationship_type: "father",
      cnic: "35202-3456789-3",
      date_of_birth: new Date("1988-12-10"),
      gender: "Male",
      marital_status: "Married",
      nationality: "Pakistani",
      religion: "Islam",
      mobile_number: "+92-302-3456789",
      email: "hassan.muhammad@example.com",
      present_address: "House 89, Model Town, Lahore",
      permanent_address: "House 89, Model Town, Lahore",
      same_address: true,
      district: "Lahore",
      city: "Lahore",
      status: "Active",
      is_deleted: false
    },
    {
      employee_id: "EMP2024004",
      full_name: "Ayesha Malik",
      father_husband_name: "Malik Ahmed",
      relationship_type: "father",
      cnic: "35202-4567890-4",
      date_of_birth: new Date("1992-04-25"),
      gender: "Female",
      marital_status: "Single",
      nationality: "Pakistani",
      religion: "Islam",
      blood_group: "O+",
      domicile_district: "Islamabad",
      mobile_number: "+92-303-4567890",
      email: "ayesha.malik@example.com",
      present_address: "Apartment 12, Blue Area, Islamabad",
      permanent_address: "House 34, Sector F-7, Islamabad",
      district: "Islamabad",
      city: "Islamabad",
      status: "Active",
      is_deleted: false
    },
    {
      employee_id: "EMP2024005",
      full_name: "Usman Khan",
      father_husband_name: "Khan Saeed",
      relationship_type: "father",
      cnic: "35202-5678901-5",
      date_of_birth: new Date("1987-09-18"),
      gender: "Male",
      marital_status: "Married",
      nationality: "Pakistani",
      religion: "Islam",
      blood_group: "AB+",
      domicile_district: "Peshawar",
      mobile_number: "+92-304-5678901",
      email: "usman.khan@example.com",
      present_address: "House 56, University Town, Peshawar",
      permanent_address: "House 56, University Town, Peshawar",
      same_address: true,
      district: "Peshawar",
      city: "Peshawar",
      status: "Active",
      is_deleted: false
    }
  ];

  console.log('👥 Seeding employees...');
  const createdEmployees = [];
  for (const emp of employees) {
    const employee = await prisma.employee.create({ data: emp });
    console.log(`✅ Created Employee: ${employee.full_name} (${employee.employee_id})`);
    createdEmployees.push(employee);
  }

  // Seed users
  const users = [
    {
      email: "admin@psba.com",
      password: encrypt("admin123"),
      role_id: createdRoles[0].id, // Super Admin
      employee_id: createdEmployees[0].id, // Ahmed Ali Khan
      is_deleted: false
    },
    {
      email: "hr@psba.com",
      password: encrypt("hr123"),
      role_id: createdRoles[1].id, // HR Admin
      employee_id: createdEmployees[1].id, // Fatima Sheikh
      is_deleted: false
    },
    {
      email: "officer@psba.com",
      password: encrypt("officer123"),
      role_id: createdRoles[2].id, // HR Officer
      employee_id: createdEmployees[2].id, // Muhammad Hassan
      is_deleted: false
    }
  ];

  console.log('👤 Seeding users...');
  const createdUsers = [];
  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    console.log(`✅ Created User: ${createdUser.email}`);
    createdUsers.push(createdUser);
  }

  // New: Seed master locations (Location table)
  console.log('📍 Seeding master locations...');
  const masterLocations = [
    {
      name: 'Lahore Head Office',
      type: 'HEAD_OFFICE',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Main Office Building, Gulberg III, Lahore',
      is_active: true,
      manager_user_id: createdUsers[0]?.id || null
    },
    {
      name: 'Karachi Regional Office',
      type: 'HEAD_OFFICE',
      district: 'Karachi',
      city: 'Karachi',
      full_address: 'Regional Office, Shahrah-e-Faisal, Karachi',
      is_active: true,
      manager_user_id: createdUsers[1]?.id || null
    },
    {
      name: 'Liberty Market Bazaar',
      type: 'BAZAAR',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Liberty Market, Gulberg III, Lahore',
      is_active: true,
      manager_user_id: null
    },
    {
      name: 'Anarkali Bazaar',
      type: 'BAZAAR',
      district: 'Lahore',
      city: 'Lahore',
      full_address: 'Anarkali Bazar, Near Mall Road, Lahore',
      is_active: true,
      manager_user_id: null
    },
    {
      name: 'Saddar Bazaar Karachi',
      type: 'BAZAAR',
      district: 'Karachi',
      city: 'Karachi',
      full_address: 'Saddar Bazaar, M. A. Jinnah Road, Karachi',
      is_active: true,
      manager_user_id: null
    }
  ];
  const createdLocations = [];
  for (const loc of masterLocations) {
    const created = await prisma.location.create({ data: loc });
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
  for (const edu of educationQualifications) {
    const qualification = await prisma.educationQualification.create({ data: edu });
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

  // Seed employment records
  const employmentRecords = [
    {
      employee_id: createdEmployees[0].id,
      organization: "MBWO",
      department_id: createdDepartments.find(d => d.name === "Engineering").id,
      designation_id: createdDesignations.find(d => d.title === "Senior Engineer").id,
      employment_type: "Regular",
      effective_from: new Date("2020-01-15"),
      role_tag_id: createdRoleTags.find(rt => rt.name === "Software Engineer").id,
      office_location: "Lahore Head Office",
      remarks: "Promoted to Senior Engineer after excellent performance",
      scale_grade_id: createdScaleGrades.find(sg => sg.name === "BPS-17").id,
      employment_status: "active",
      is_current: true,
      filer_status: "filer",
      filer_active_status: "active",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[1].id,
      organization: "PMBMC",
      department_id: createdDepartments.find(d => d.name === "IT").id,
      designation_id: createdDesignations.find(d => d.title === "Senior Software Developer").id,
      employment_type: "Contract",
      effective_from: new Date("2021-03-01"),
      effective_till: new Date("2024-02-29"),
      role_tag_id: createdRoleTags.find(rt => rt.name === "Software Engineer").id,
      office_location: "Karachi Regional Office",
      is_on_probation: false,
      remarks: "Contract employee with excellent technical skills",
      scale_grade_id: createdScaleGrades.find(sg => sg.name === "Grade-A").id,
      employment_status: "active",
      is_current: true,
      filer_status: "non_filer",
      is_deleted: false
    },
    {
      employee_id: createdEmployees[2].id,
      organization: "PSBA",
      department_id: createdDepartments.find(d => d.name === "Operations").id,
      designation_id: createdDesignations.find(d => d.title === "Operations Manager").id,
      employment_type: "Regular",
      effective_from: new Date("2022-06-01"),
      role_tag_id: createdRoleTags.find(rt => rt.name === "Project Manager").id,
      office_location: "Lahore Regional Office",
      is_on_probation: true,
      probation_end_date: new Date("2024-06-01"),
      remarks: "Currently on probation period",
      scale_grade_id: createdScaleGrades.find(sg => sg.name === "BPS-18").id,
      employment_status: "active",
      is_current: true,
      filer_status: "filer",
      filer_active_status: "active",
      is_deleted: false
    },
    // New: Employees reporting to HR Admin (createdEmployees[1]) for Duty Roster testing
    {
      employee_id: createdEmployees[3].id, // Ayesha Malik
      organization: "PSBA",
      department_id: createdDepartments.find(d => d.name === "Operations").id,
      designation_id: createdDesignations.find(d => d.title === "Operations Officer").id,
      employment_type: "Regular",
      effective_from: new Date("2023-01-01"),
      role_tag_id: createdRoleTags.find(rt => rt.name === "Project Manager").id,
      office_location: "Karachi Field",
      remarks: "Reports to HR Admin",
      scale_grade_id: createdScaleGrades.find(sg => sg.name === "BPS-17").id,
      employment_status: "active",
      is_current: true,
      filer_status: "non_filer",
      // critical for roster filtering: reporting officer is HR Admin's employee id as string
      reporting_officer_id: String(createdEmployees[1].id),
      is_deleted: false
    },
    {
      employee_id: createdEmployees[4].id, // Usman Khan
      organization: "PSBA",
      department_id: createdDepartments.find(d => d.name === "Operations").id,
      designation_id: createdDesignations.find(d => d.title === "Operations Officer").id,
      employment_type: "Regular",
      effective_from: new Date("2023-02-01"),
      role_tag_id: createdRoleTags.find(rt => rt.name === "Project Manager").id,
      office_location: "Karachi Field",
      remarks: "Reports to HR Admin",
      scale_grade_id: createdScaleGrades.find(sg => sg.name === "BPS-17").id,
      employment_status: "active",
      is_current: true,
      filer_status: "non_filer",
      reporting_officer_id: String(createdEmployees[1].id),
      is_deleted: false
    }
  ];

  console.log('💼 Seeding employment records...');
  const createdEmployments = [];
  for (const emp of employmentRecords) {
    const employment = await prisma.employment.create({ data: emp });
    console.log(`✅ Created Employment: ${employment.organization} - Employee ${employment.employee_id}`);
    createdEmployments.push(employment);
  }

  // Seed employment salaries
  const salaryRecords = [
    {
      employment_id: createdEmployments[0].id,
      basic_salary: 75000.0,
      medical_allowance: 8000.0,
      house_rent: 25000.0,
      conveyance_allowance: 5000.0,
      other_allowances: 3000.0,
      bank_account_primary: "1234567890123456",
      bank_name_primary: "HBL",
      bank_branch_code: "1234",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2020-01-15"),
      payroll_status: "Active",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[1].id,
      basic_salary: 85000.0,
      medical_allowance: 10000.0,
      house_rent: 30000.0,
      conveyance_allowance: 6000.0,
      other_allowances: 4000.0,
      bank_account_primary: "2345678901234567",
      bank_name_primary: "UBL",
      bank_branch_code: "5678",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2021-03-01"),
      salary_effective_till: new Date("2024-02-29"),
      payroll_status: "Active",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[2].id,
      basic_salary: 95000.0,
      medical_allowance: 12000.0,
      house_rent: 35000.0,
      conveyance_allowance: 7000.0,
      other_allowances: 5000.0,
      daily_wage_rate: null,
      bank_account_primary: "3456789012345678",
      bank_name_primary: "MCB",
      bank_branch_code: "9012",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2022-06-01"),
      payroll_status: "Active",
      is_deleted: false
    }
  ];

  console.log('💰 Seeding employment salaries...');
  for (const salary of salaryRecords) {
    const employmentSalary = await prisma.employmentSalary.create({ data: salary });
    console.log(`✅ Created Salary Record: Employment ${employmentSalary.employment_id} - Basic: ${employmentSalary.basic_salary}`);
  }

  // Seed employment locations
  const locationRecords = [
    {
      employment_id: createdEmployments[0].id,
      district: "Lahore",
      city: "Lahore",
      type: "HEAD_OFFICE",
      full_address: "Main Office Building, Gulberg III, Lahore",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[1].id,
      district: "Karachi",
      city: "Karachi",
      bazaar_name: "Saddar Bazaar",
      type: "BAZAAR",
      full_address: "Saddar Bazaar Complex, Karachi",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[2].id,
      district: "Lahore",
      city: "Lahore",
      type: "HEAD_OFFICE",
      full_address: "Regional Office, Model Town, Lahore",
      is_deleted: false
    },
    // New: Locations for subordinates (set to Karachi bazaar context)
    {
      employment_id: createdEmployments[3].id,
      district: "Karachi",
      city: "Karachi",
      bazaar_name: "Saddar Bazaar",
      type: "BAZAAR",
      full_address: "Saddar Bazaar, Karachi",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[4].id,
      district: "Karachi",
      city: "Karachi",
      bazaar_name: "Saddar Bazaar",
      type: "BAZAAR",
      full_address: "Saddar Bazaar, Karachi",
      is_deleted: false
    }
  ];

  console.log('📍 Seeding employment locations...');
  for (const location of locationRecords) {
    const employmentLocation = await prisma.employmentLocation.create({ data: location });
    console.log(`✅ Created Location Record: Employment ${employmentLocation.employment_id} - ${employmentLocation.city}`);
  }

  // Seed employment contracts
  const contractRecords = [
    {
      employment_id: createdEmployments[0].id,
      contract_type: "Permanent",
      contract_number: "MBWO-EMP2024001-2020",
      start_date: new Date("2020-01-15"),
      confirmation_status: "Confirmed",
      confirmation_date: new Date("2020-07-15"),
      is_deleted: false
    },
    {
      employment_id: createdEmployments[1].id,
      contract_type: "Fixed-term",
      contract_number: "PMBMC-EMP2024002-2021",
      start_date: new Date("2021-03-01"),
      end_date: new Date("2024-02-29"),
      confirmation_status: "Confirmed",
      confirmation_date: new Date("2021-09-01"),
      is_deleted: false
    },
    {
      employment_id: createdEmployments[2].id,
      contract_type: "Probation",
      contract_number: "PSBA-EMP2024003-2022",
      start_date: new Date("2022-06-01"),
      probation_start: new Date("2022-06-01"),
      probation_end: new Date("2024-06-01"),
      is_deleted: false
    }
  ];

  console.log('📝 Seeding employment contracts...');
  for (const contract of contractRecords) {
    const employmentContract = await prisma.employmentContract.create({ data: contract });
    console.log(`✅ Created Contract Record: Employment ${employmentContract.employment_id} - ${employmentContract.contract_type}`);
  }

  // Seed employment documents
  const employmentDocuments = [
    {
      employment_id: createdEmployments[0].id,
      file_path: "/uploads/employment/ahmed_medical_fitness.pdf",
      file_type: "medical_fitness",
      document_name: "ahmed_medical_fitness.pdf",
      file_size: 3145728,
      mime_type: "application/pdf",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[0].id,
      file_path: "/uploads/employment/ahmed_police_certificate.pdf",
      file_type: "police_character",
      document_name: "ahmed_police_certificate.pdf",
      file_size: 2097152,
      mime_type: "application/pdf",
      is_deleted: false
    },
    {
      employment_id: createdEmployments[1].id,
      file_path: "/uploads/employment/fatima_contract.pdf",
      file_type: "contract_document",
      document_name: "fatima_contract.pdf",
      file_size: 4194304,
      mime_type: "application/pdf",
      associated_id: createdEmployments[1].id,
      is_deleted: false
    }
  ];

  console.log('📄 Seeding employment documents...');
  for (const doc of employmentDocuments) {
    const employmentDocument = await prisma.employmentDocument.create({ data: doc });
    console.log(`✅ Created Employment Document: ${employmentDocument.file_type} for employment ${employmentDocument.employment_id}`);
  }

  // After roles and users: Seed normalized permissions and attach to roles
  console.log('🔑 Seeding permissions and role-permissions...');
  // collect unique keys from roles (excluding '*') + system settings keys
  const systemKeys = [
    'system.database.read',
    'system.security.read','system.security.update'
  ];
  const moduleKeys = [
    'locations.read','locations.create','locations.update','locations.delete'
  ];
  const keys = Array.from(new Set([
    ...roles.flatMap(r => r.allowed_actions).filter(k => k !== '*'),
    ...systemKeys,
    ...moduleKeys
  ]));
  const permissionRecords = await prisma.$transaction(keys.map((key) =>
    prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, resource: key.split('.')[0] || 'custom', action: key.split('.')[1] || 'custom' }
    })
  ));

  // build a quick lookup of permission key -> id
  const permIdByKey = Object.fromEntries(permissionRecords.map(p => [p.key, p.id]));

  // Attach permissions per role (skip Super Admin)
  for (const r of createdRoles) {
    const roleSeed = roles.find(rr => rr.name === r.name);
    if (!roleSeed) continue;
    if (roleSeed.allowed_actions.includes('*')) continue; // Super Admin
    const roleKeys = roleSeed.allowed_actions.filter(k => k !== '*');
    const data = roleKeys
      .filter(k => permIdByKey[k])
      .map(k => ({ role_id: r.id, permission_id: permIdByKey[k] }));
    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
  }

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
  console.log(`   - Location Records: ${locationRecords.length}`);
  console.log(`   - Contract Records: ${contractRecords.length}`);
  console.log(`   - Employment Documents: ${employmentDocuments.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(`❌ Seeding failed: ${e}`);
    await prisma.$disconnect();
    process.exit(1);
  });