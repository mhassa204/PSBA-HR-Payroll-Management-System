const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testGetEmployee() {
  console.log('🧪 Testing Get Employee API...\n');

  try {
    // Test 1: Get all employees first to see what IDs exist
    console.log('1. Getting all employees to see available IDs');
    const allResponse = await fetch(`${API_BASE}/employees`);
    const allData = await allResponse.json();
    console.log(`   Status: ${allResponse.status}`);
    console.log(`   Total employees: ${allData.employees?.length || 0}`);
    
    if (allData.employees && allData.employees.length > 0) {
      console.log('   Available employee IDs:');
      allData.employees.forEach(emp => {
        console.log(`     - ID: ${emp.id}, Name: ${emp.full_name}`);
      });
      console.log('');

      // Test 2: Get first employee by ID
      const firstEmployeeId = allData.employees[0].id;
      console.log(`2. Getting employee by ID: ${firstEmployeeId}`);
      const getResponse = await fetch(`${API_BASE}/employees/${firstEmployeeId}`);
      const employeeData = await getResponse.json();
      
      console.log(`   Status: ${getResponse.status}`);
      if (getResponse.ok) {
        console.log(`   ✅ Employee retrieved successfully`);
        console.log(`   Name: ${employeeData.employee?.full_name}`);
        console.log(`   Email: ${employeeData.employee?.email}`);
        console.log(`   CNIC: ${employeeData.employee?.cnic}`);
        console.log(`   Past Experiences: ${employeeData.employee?.pastExperiences?.length || 0}`);
        console.log(`   Education Qualifications: ${employeeData.employee?.educationQualifications?.length || 0}`);
        console.log(`   Employment Records: ${employeeData.employee?.employmentRecords?.length || 0}`);
        console.log(`   Documents: ${employeeData.employee?.documents?.length || 0}`);
        
        // Show detailed structure
        console.log('\n   📋 Complete Employee Data Structure:');
        console.log(JSON.stringify(employeeData.employee, null, 2));
      } else {
        console.log(`   ❌ Failed to get employee: ${employeeData.message || 'Unknown error'}`);
      }
    } else {
      console.log('   ⚠️ No employees found in database');
    }

    console.log('\n🎉 Get Employee Test Complete!');

  } catch (error) {
    console.error('❌ Get Employee Test Error:', error.message);
  }
}

testGetEmployee();
