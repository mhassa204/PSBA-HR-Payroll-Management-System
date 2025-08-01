const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in reverse dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.employmentLocation.deleteMany();
  await prisma.employmentSalary.deleteMany();
  await prisma.employment.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.educationQualification.deleteMany();
  await prisma.pastExperience.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();
  await prisma.employee.deleteMany();

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
    const department = await prisma.department.create({ data: dept });
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
          level: des.level
        }
      });
      console.log(`✅ Created Designation: ${designation.title} (${department.name})`);
      createdDesignations.push(designation);
    }
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
      password: await bcrypt.hash("password123", 10),
      status: "Active"
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
      password: await bcrypt.hash("password123", 10),
      status: "Active"
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
      password: await bcrypt.hash("password123", 10),
      status: "Active"
    }
  ];

  console.log('👥 Seeding employees...');
  const createdEmployees = [];
  for (const emp of employees) {
    const employee = await prisma.employee.create({ data: emp });
    console.log(`✅ Created Employee: ${employee.full_name} (${employee.employee_id})`);
    createdEmployees.push(employee);
  }

  // Seed past experiences
  const pastExperiences = [
    {
      employee_id: createdEmployees[0].id,
      company_name: "Government of Punjab",
      start_date: "2008-01-15",
      end_date: "2010-12-31",
      description: "Junior Engineer in Public Works Department"
    },
    {
      employee_id: createdEmployees[1].id,
      company_name: "Tech Solutions Ltd",
      start_date: "2012-06-01",
      end_date: "2015-08-30",
      description: "Software Developer specializing in web applications"
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
      marks_gpa: "3.2"
    },
    {
      employee_id: createdEmployees[1].id,
      education_level: "Master's Degree",
      institution_name: "Karachi University",
      year_of_completion: "2012",
      marks_gpa: "3.8"
    },
    {
      employee_id: createdEmployees[2].id,
      education_level: "Bachelor's Degree",
      institution_name: "Punjab University",
      year_of_completion: "2010",
      marks_gpa: "3.5"
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
      mime_type: "image/jpeg"
    },
    {
      employee_id: createdEmployees[0].id,
      file_path: "/uploads/cnic/ahmed_cnic_front.jpg",
      file_type: "cnic_front",
      document_name: "ahmed_cnic_front.jpg",
      file_size: 189440,
      mime_type: "image/jpeg"
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
      role_tag: "Technical Lead",
      office_location: "Lahore Head Office",
      remarks: "Promoted to Senior Engineer after excellent performance"
    },
    {
      employee_id: createdEmployees[1].id,
      organization: "PMBMC",
      department_id: createdDepartments.find(d => d.name === "IT").id,
      designation_id: createdDesignations.find(d => d.title === "Senior Software Developer").id,
      employment_type: "Contract",
      effective_from: new Date("2021-03-01"),
      effective_till: new Date("2024-02-29"),
      role_tag: "Full Stack Developer",
      office_location: "Karachi Regional Office",
      is_on_probation: false,
      remarks: "Contract employee with excellent technical skills"
    },
    {
      employee_id: createdEmployees[2].id,
      organization: "PSBA",
      department_id: createdDepartments.find(d => d.name === "Operations").id,
      designation_id: createdDesignations.find(d => d.title === "Operations Manager").id,
      employment_type: "Regular",
      effective_from: new Date("2022-06-01"),
      role_tag: "Regional Manager",
      office_location: "Lahore Regional Office",
      is_on_probation: true,
      probation_end_date: new Date("2024-06-01"),
      remarks: "Currently on probation period"
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
      basic_salary: 75000,
      medical_allowance: 8000,
      house_rent: 25000,
      conveyance_allowance: 5000,
      other_allowances: 3000,
      bank_account_primary: "1234567890123456",
      bank_name_primary: "HBL",
      bank_branch_code: "1234",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2020-01-15"),
      payroll_status: "Active"
    },
    {
      employment_id: createdEmployments[1].id,
      basic_salary: 85000,
      medical_allowance: 10000,
      house_rent: 30000,
      conveyance_allowance: 6000,
      other_allowances: 4000,
      bank_account_primary: "2345678901234567",
      bank_name_primary: "UBL",
      bank_branch_code: "5678",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2021-03-01"),
      salary_effective_till: new Date("2024-02-29"),
      payroll_status: "Active"
    },
    {
      employment_id: createdEmployments[2].id,
      basic_salary: 95000,
      medical_allowance: 12000,
      house_rent: 35000,
      conveyance_allowance: 7000,
      other_allowances: 5000,
      daily_wage_rate: null,
      bank_account_primary: "3456789012345678",
      bank_name_primary: "MCB",
      bank_branch_code: "9012",
      payment_mode: "Bank Transfer",
      salary_effective_from: new Date("2022-06-01"),
      payroll_status: "Active"
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
      full_address: "Main Office Building, Gulberg III, Lahore"
    },
    {
      employment_id: createdEmployments[1].id,
      district: "Karachi",
      city: "Karachi",
      bazaar_name: "Saddar Bazaar",
      type: "BAZAAR",
      full_address: "Saddar Bazaar Complex, Karachi"
    },
    {
      employment_id: createdEmployments[2].id,
      district: "Lahore",
      city: "Lahore",
      type: "HEAD_OFFICE",
      full_address: "Regional Office, Model Town, Lahore"
    }
  ];

  console.log('📍 Seeding employment locations...');
  for (const location of locationRecords) {
    const employmentLocation = await prisma.employmentLocation.create({ data: location });
    console.log(`✅ Created Location Record: Employment ${employmentLocation.employment_id} - ${employmentLocation.city}`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Departments: ${createdDepartments.length}`);
  console.log(`   - Designations: ${createdDesignations.length}`);
  console.log(`   - Employees: ${createdEmployees.length}`);
  console.log(`   - Employment Records: ${createdEmployments.length}`);
  console.log(`   - Past Experiences: ${pastExperiences.length}`);
  console.log(`   - Education Qualifications: ${educationQualifications.length}`);
  console.log(`   - Documents: ${documents.length}`);
  console.log(`   - Salary Records: ${salaryRecords.length}`);
  console.log(`   - Location Records: ${locationRecords.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });