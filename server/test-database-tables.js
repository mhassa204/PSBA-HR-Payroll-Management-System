const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllTables() {
  console.log('🧪 Testing all database tables...\n');

  try {
    // Test Employee table
    console.log('1. Testing Employee table');
    const employees = await prisma.employee.findMany({
      include: {
        pastExperiences: true,
        educationQualifications: true,
        documents: true,
        employmentRecords: {
          include: {
            department: true,
            designation: true,
            salary: true,
            location: true
          }
        }
      }
    });
    console.log(`   ✅ Employee records: ${employees.length}`);
    console.log(`   ✅ First employee: ${employees[0]?.full_name || 'None'}`);
    console.log(`   ✅ Past experiences: ${employees[0]?.pastExperiences?.length || 0}`);
    console.log(`   ✅ Education qualifications: ${employees[0]?.educationQualifications?.length || 0}`);
    console.log(`   ✅ Documents: ${employees[0]?.documents?.length || 0}`);
    console.log(`   ✅ Employment records: ${employees[0]?.employmentRecords?.length || 0}\n`);

    // Test Department table
    console.log('2. Testing Department table');
    const departments = await prisma.department.findMany({
      include: {
        designations: true,
        employmentRecords: true
      }
    });
    console.log(`   ✅ Department records: ${departments.length}`);
    console.log(`   ✅ First department: ${departments[0]?.name || 'None'}`);
    console.log(`   ✅ Designations in first dept: ${departments[0]?.designations?.length || 0}\n`);

    // Test Designation table
    console.log('3. Testing Designation table');
    const designations = await prisma.designation.findMany({
      include: {
        department: true,
        employmentRecords: true
      }
    });
    console.log(`   ✅ Designation records: ${designations.length}`);
    console.log(`   ✅ First designation: ${designations[0]?.title || 'None'}`);
    console.log(`   ✅ Department: ${designations[0]?.department?.name || 'None'}\n`);

    // Test Employment table
    console.log('4. Testing Employment table');
    const employments = await prisma.employment.findMany({
      include: {
        employee: true,
        department: true,
        designation: true,
        salary: true,
        location: true
      }
    });
    console.log(`   ✅ Employment records: ${employments.length}`);
    console.log(`   ✅ First employment: ${employments[0]?.organization || 'None'}`);
    console.log(`   ✅ Employee: ${employments[0]?.employee?.full_name || 'None'}`);
    console.log(`   ✅ Has salary: ${!!employments[0]?.salary}`);
    console.log(`   ✅ Has location: ${!!employments[0]?.location}\n`);

    // Test EmploymentSalary table
    console.log('5. Testing EmploymentSalary table');
    const salaries = await prisma.employmentSalary.findMany({
      include: {
        employment: {
          include: {
            employee: true
          }
        }
      }
    });
    console.log(`   ✅ Salary records: ${salaries.length}`);
    console.log(`   ✅ First salary: ${salaries[0]?.basic_salary || 0}`);
    console.log(`   ✅ Employee: ${salaries[0]?.employment?.employee?.full_name || 'None'}\n`);

    // Test EmploymentLocation table
    console.log('6. Testing EmploymentLocation table');
    const locations = await prisma.employmentLocation.findMany({
      include: {
        employment: {
          include: {
            employee: true
          }
        }
      }
    });
    console.log(`   ✅ Location records: ${locations.length}`);
    console.log(`   ✅ First location: ${locations[0]?.city || 'None'}`);
    console.log(`   ✅ Type: ${locations[0]?.type || 'None'}\n`);

    // Test PastExperience table
    console.log('7. Testing PastExperience table');
    const experiences = await prisma.pastExperience.findMany({
      include: {
        employee: true
      }
    });
    console.log(`   ✅ Experience records: ${experiences.length}`);
    console.log(`   ✅ First experience: ${experiences[0]?.company_name || 'None'}`);
    console.log(`   ✅ Employee: ${experiences[0]?.employee?.full_name || 'None'}\n`);

    // Test EducationQualification table
    console.log('8. Testing EducationQualification table');
    const qualifications = await prisma.educationQualification.findMany({
      include: {
        employee: true
      }
    });
    console.log(`   ✅ Qualification records: ${qualifications.length}`);
    console.log(`   ✅ First qualification: ${qualifications[0]?.education_level || 'None'}`);
    console.log(`   ✅ Institution: ${qualifications[0]?.institution_name || 'None'}\n`);

    // Test EmployeeDocument table
    console.log('9. Testing EmployeeDocument table');
    const documents = await prisma.employeeDocument.findMany({
      include: {
        employee: true
      }
    });
    console.log(`   ✅ Document records: ${documents.length}`);
    console.log(`   ✅ First document: ${documents[0]?.file_type || 'None'}`);
    console.log(`   ✅ Employee: ${documents[0]?.employee?.full_name || 'None'}\n`);

    console.log('🎉 All database tables are working correctly!');
    console.log('\n📊 Summary:');
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Designations: ${designations.length}`);
    console.log(`   - Employment Records: ${employments.length}`);
    console.log(`   - Salary Records: ${salaries.length}`);
    console.log(`   - Location Records: ${locations.length}`);
    console.log(`   - Past Experiences: ${experiences.length}`);
    console.log(`   - Education Qualifications: ${qualifications.length}`);
    console.log(`   - Documents: ${documents.length}`);

  } catch (error) {
    console.error('❌ Database test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllTables();
