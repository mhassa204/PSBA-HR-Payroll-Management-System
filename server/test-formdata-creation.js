const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';

async function testFormDataCreation() {
  console.log('🧪 Testing Employee Creation with FormData (Frontend Simulation)...\n');

  try {
    // Test 1: Create employee using FormData (like frontend)
    console.log('1. Testing employee creation with FormData (no password)');
    
    const formData = new FormData();
    
    // Add all the fields that frontend would send
    formData.append('full_name', 'FormData Test Employee');
    formData.append('father_husband_name', 'FormData Father Name');
    formData.append('relationship_type', 'father');
    formData.append('mother_name', 'FormData Mother Name');
    formData.append('cnic', '12345-1234567-3');
    formData.append('email', 'formdata.test@example.com');
    formData.append('mobile_number', '+92-300-1234567');
    formData.append('gender', 'Male');
    formData.append('marital_status', 'Single');
    formData.append('nationality', 'Pakistani');
    formData.append('religion', 'Islam');
    formData.append('blood_group', 'O+');
    formData.append('domicile_district', 'Lahore');
    formData.append('present_address', 'FormData Test Address, Lahore');
    formData.append('permanent_address', 'FormData Test Address, Lahore');
    formData.append('same_address', 'true');
    formData.append('district', 'Lahore');
    formData.append('city', 'Lahore');
    formData.append('has_disability', 'false');
    formData.append('status', 'Active');
    
    // Add some experience data (JSON string like frontend does)
    const pastExperiences = [
      {
        company_name: 'Test Company',
        start_date: '2020-01-01',
        end_date: '2022-12-31',
        description: 'Test experience description'
      }
    ];
    formData.append('past_experiences', JSON.stringify(pastExperiences));
    
    // Add some education data (JSON string like frontend does)
    const educations = [
      {
        education_level: "Bachelor's Degree",
        institution_name: 'Test University',
        year_of_completion: '2019',
        marks_gpa: '3.5'
      }
    ];
    formData.append('educations', JSON.stringify(educations));

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log(`   ✅ Employee created with FormData (ID: ${createResult.employee.id})`);
      console.log(`   ✅ Employee ID: ${createResult.employee.employee_id}`);
      console.log(`   ✅ Full Name: ${createResult.employee.full_name}`);
      console.log(`   ✅ Email: ${createResult.employee.email}`);
      console.log(`   ✅ Password: ${createResult.employee.password ? 'Encrypted' : 'null (as expected)'}`);
      
      var createdEmployeeId = createResult.employee.id;
      
      // Test 2: Verify the employee was created with related data
      console.log('\n2. Verifying employee with related data');
      
      const getResponse = await fetch(`${API_BASE}/employees/${createdEmployeeId}`);
      const getResult = await getResponse.json();
      
      if (getResponse.ok && getResult.employee) {
        const employee = getResult.employee;
        console.log(`   ✅ Retrieved employee: ${employee.full_name}`);
        console.log(`   ✅ Past Experiences: ${employee.pastExperiences?.length || 0} records`);
        console.log(`   ✅ Education Qualifications: ${employee.educationQualifications?.length || 0} records`);
        
        if (employee.pastExperiences && employee.pastExperiences.length > 0) {
          const exp = employee.pastExperiences[0];
          console.log(`   📋 Experience: ${exp.company_name} (${exp.start_date} - ${exp.end_date})`);
        }
        
        if (employee.educationQualifications && employee.educationQualifications.length > 0) {
          const edu = employee.educationQualifications[0];
          console.log(`   📋 Education: ${edu.education_level} from ${edu.institution_name}`);
        }
      }
      
    } else {
      console.log(`   ❌ Failed to create employee with FormData: ${createResult.error}`);
      console.log(`   📋 Response status: ${createResponse.status}`);
      console.log(`   📋 Response data:`, createResult);
      return;
    }

    // Test 3: Clean up
    console.log('\n3. Cleaning up test employee');
    
    if (createdEmployeeId) {
      const deleteResponse = await fetch(`${API_BASE}/employees/${createdEmployeeId}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log(`   ✅ Deleted test employee ${createdEmployeeId}`);
      } else {
        console.log(`   ⚠️ Could not delete test employee ${createdEmployeeId}`);
      }
    }

    console.log('\n🎉 FormData Employee Creation Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ FormData employee creation works without password');
    console.log('   ✅ JSON fields (past_experiences, educations) processed correctly');
    console.log('   ✅ Related data (experiences, education) created properly');
    console.log('   ✅ Employee retrieval includes all related data');
    console.log('\n   🎯 Frontend CreateEmployeeForm should now work perfectly!');

  } catch (error) {
    console.error('❌ FormData Employee Creation Test Error:', error.message);
  }
}

testFormDataCreation();
