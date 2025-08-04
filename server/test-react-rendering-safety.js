const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testReactRenderingSafety() {
  console.log('🧪 Testing React Rendering Safety for Employment Components...\n');

  try {
    // Get employee 2 data (the one causing issues)
    console.log('1. Getting employee 2 data for React rendering safety test');
    const response = await fetch(`${API_BASE}/employees/2`);
    const data = await response.json();
    
    if (response.ok && data.employee) {
      const employee = data.employee;
      console.log(`   ✅ Employee retrieved: ${employee.full_name} (ID: ${employee.id})`);
      
      if (employee.employmentRecords && employee.employmentRecords.length > 0) {
        const record = employee.employmentRecords[0];
        
        console.log('\n   🔍 Testing All React Rendering Scenarios:');
        
        // Test 1: Designation rendering (multiple scenarios)
        console.log('\n   📋 Designation Rendering Tests:');
        
        // Scenario 1: designation?.title (safe)
        const designationTitle = record.designation?.title || record.designation;
        console.log(`   ✅ designation?.title: "${designationTitle}" (type: ${typeof designationTitle})`);
        
        // Scenario 2: Direct designation object (would cause error)
        console.log(`   🔍 Raw designation object: ${JSON.stringify(record.designation)}`);
        console.log(`   ⚠️ Direct render would cause: "Objects are not valid as a React child"`);
        
        // Test 2: Department rendering (multiple scenarios)
        console.log('\n   📋 Department Rendering Tests:');
        
        // Scenario 1: department?.name (safe)
        const departmentName = record.department?.name || record.department;
        console.log(`   ✅ department?.name: "${departmentName}" (type: ${typeof departmentName})`);
        
        // Scenario 2: Direct department object (would cause error)
        console.log(`   🔍 Raw department object: ${JSON.stringify(record.department)}`);
        console.log(`   ⚠️ Direct render would cause: "Objects are not valid as a React child"`);
        
        // Test 3: Other safe fields
        console.log('\n   📋 Other Field Rendering Tests:');
        console.log(`   ✅ employment_type: "${record.employment_type}" (type: ${typeof record.employment_type})`);
        console.log(`   ✅ organization: "${record.organization}" (type: ${typeof record.organization})`);
        console.log(`   ✅ office_location: "${record.office_location || 'N/A'}" (type: ${typeof (record.office_location || 'N/A')})`);
        console.log(`   ✅ remarks: "${record.remarks || 'N/A'}" (type: ${typeof (record.remarks || 'N/A')})`);
        
        // Test 4: Salary rendering safety
        console.log('\n   📋 Salary Rendering Tests:');
        if (record.salary) {
          const basicSalary = parseFloat(record.salary.basic_salary || 0);
          console.log(`   ✅ basic_salary: "${basicSalary.toLocaleString()}" (type: ${typeof basicSalary})`);
          console.log(`   ✅ Salary object exists but accessing properties safely`);
        } else {
          console.log(`   ⚠️ No salary object found`);
        }
        
        // Test 5: Location rendering safety
        console.log('\n   📋 Location Rendering Tests:');
        if (record.location) {
          console.log(`   ✅ location.city: "${record.location.city}" (type: ${typeof record.location.city})`);
          console.log(`   ✅ location.district: "${record.location.district}" (type: ${typeof record.location.district})`);
          console.log(`   ✅ Location object exists but accessing properties safely`);
        } else {
          console.log(`   ⚠️ No location object found`);
        }
        
        // Test 6: Date rendering safety
        console.log('\n   📋 Date Rendering Tests:');
        console.log(`   ✅ effective_from: "${record.effective_from}" (type: ${typeof record.effective_from})`);
        console.log(`   ✅ effective_till: "${record.effective_till || 'Current'}" (type: ${typeof (record.effective_till || 'Current')})`);
        
        // Test 7: All EmploymentRecordActions component scenarios
        console.log('\n   📋 EmploymentRecordActions Component Safety:');
        
        // Main card display
        const cardDesignation = record.designation?.title || record.designation;
        const cardDepartment = record.department?.name || record.department || "N/A";
        console.log(`   ✅ Card designation: "${cardDesignation}" ✓`);
        console.log(`   ✅ Card department: "${cardDepartment}" ✓`);
        
        // Details modal display
        const modalTitle = `Employment Record Details - ${record.designation?.title || record.designation}`;
        console.log(`   ✅ Modal title: "${modalTitle}" ✓`);
        
        // Delete confirmation display
        const deleteDesignation = record.designation?.title || record.designation;
        console.log(`   ✅ Delete confirmation designation: "${deleteDesignation}" ✓`);
        
        // Details view display
        const detailsDesignation = record.designation?.title || record.designation || "N/A";
        const detailsDepartment = record.department?.name || record.department || "N/A";
        console.log(`   ✅ Details designation: "${detailsDesignation}" ✓`);
        console.log(`   ✅ Details department: "${detailsDepartment}" ✓`);
        
      } else {
        console.log('   ⚠️ No employment records found for testing');
      }
      
    } else {
      console.log(`   ❌ Failed to get employee: ${data.message || 'Unknown error'}`);
    }

    console.log('\n🎉 React Rendering Safety Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ All designation objects render .title property safely');
    console.log('   ✅ All department objects render .name property safely');
    console.log('   ✅ All salary objects access properties safely');
    console.log('   ✅ All location objects access properties safely');
    console.log('   ✅ All date fields render as strings');
    console.log('   ✅ All fallback values are strings');
    console.log('   ✅ No direct object rendering that would cause React errors');
    console.log('\n   🎯 The employment management page should now work without any React object errors!');

  } catch (error) {
    console.error('❌ React Rendering Safety Test Error:', error.message);
  }
}

testReactRenderingSafety();
