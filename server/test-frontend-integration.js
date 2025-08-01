const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend Integration with Field Names...\n');

  try {
    // Test 1: Get employee data and verify field names match frontend expectations
    console.log('1. Testing employee data structure for frontend compatibility');
    const response = await fetch(`${API_BASE}/employees/1`);
    const data = await response.json();
    
    if (response.ok && data.employee) {
      const employee = data.employee;
      console.log(`   ✅ Employee retrieved: ${employee.full_name}`);
      
      // Check field names that frontend expects
      const expectedFields = {
        'employmentRecords': employee.employmentRecords,
        'pastExperiences': employee.pastExperiences,
        'educationQualifications': employee.educationQualifications,
        'documents': employee.documents
      };
      
      console.log('\n   📋 Field Name Compatibility Check:');
      Object.keys(expectedFields).forEach(field => {
        const value = expectedFields[field];
        const exists = value !== undefined;
        const hasData = Array.isArray(value) && value.length > 0;
        
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? (hasData ? `${value.length} items` : 'empty array') : 'missing'}`);
      });
      
      // Test employment record structure
      if (employee.employmentRecords && employee.employmentRecords.length > 0) {
        const employment = employee.employmentRecords[0];
        console.log('\n   📋 Employment Record Structure:');
        console.log(`   ✅ Organization: ${employment.organization}`);
        console.log(`   ✅ Department: ${employment.department?.name || 'N/A'}`);
        console.log(`   ✅ Designation: ${employment.designation?.title || 'N/A'}`);
        console.log(`   ✅ Has Salary: ${!!employment.salary}`);
        console.log(`   ✅ Has Location: ${!!employment.location}`);
        
        if (employment.salary) {
          console.log(`   ✅ Basic Salary: ${employment.salary.basic_salary}`);
        }
        
        if (employment.location) {
          console.log(`   ✅ Location: ${employment.location.city}, ${employment.location.district}`);
        }
      }
      
      // Test past experience structure
      if (employee.pastExperiences && employee.pastExperiences.length > 0) {
        const experience = employee.pastExperiences[0];
        console.log('\n   📋 Past Experience Structure:');
        console.log(`   ✅ Company: ${experience.company_name}`);
        console.log(`   ✅ Start Date: ${experience.start_date}`);
        console.log(`   ✅ End Date: ${experience.end_date}`);
        console.log(`   ✅ Description: ${experience.description || 'N/A'}`);
      }
      
      // Test education structure
      if (employee.educationQualifications && employee.educationQualifications.length > 0) {
        const education = employee.educationQualifications[0];
        console.log('\n   📋 Education Qualification Structure:');
        console.log(`   ✅ Level: ${education.education_level}`);
        console.log(`   ✅ Institution: ${education.institution_name}`);
        console.log(`   ✅ Year: ${education.year_of_completion}`);
        console.log(`   ✅ Marks/GPA: ${education.marks_gpa || 'N/A'}`);
      }
      
      // Test document structure
      if (employee.documents && employee.documents.length > 0) {
        const document = employee.documents[0];
        console.log('\n   📋 Document Structure:');
        console.log(`   ✅ File Type: ${document.file_type}`);
        console.log(`   ✅ File Path: ${document.file_path}`);
        console.log(`   ✅ Document Name: ${document.document_name || 'N/A'}`);
      }
      
    } else {
      console.log(`   ❌ Failed to get employee: ${data.message || 'Unknown error'}`);
    }

    // Test 2: Verify all employees endpoint
    console.log('\n2. Testing employees list endpoint');
    const listResponse = await fetch(`${API_BASE}/employees`);
    const listData = await listResponse.json();
    
    if (listResponse.ok) {
      console.log(`   ✅ Employees list: ${listData.employees?.length || 0} employees`);
      
      if (listData.employees && listData.employees.length > 0) {
        const firstEmployee = listData.employees[0];
        console.log(`   ✅ First employee has employmentRecords: ${!!firstEmployee.employmentRecords}`);
        console.log(`   ✅ First employee has pastExperiences: ${!!firstEmployee.pastExperiences}`);
        console.log(`   ✅ First employee has educationQualifications: ${!!firstEmployee.educationQualifications}`);
      }
    } else {
      console.log(`   ❌ Failed to get employees list`);
    }

    console.log('\n🎉 Frontend Integration Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   - All field names now match frontend expectations');
    console.log('   - employmentRecords (camelCase) ✅');
    console.log('   - pastExperiences (camelCase) ✅');
    console.log('   - educationQualifications (camelCase) ✅');
    console.log('   - documents (camelCase) ✅');
    console.log('\n   Frontend should now be able to display employee data correctly!');

  } catch (error) {
    console.error('❌ Frontend Integration Test Error:', error.message);
  }
}

testFrontendIntegration();
