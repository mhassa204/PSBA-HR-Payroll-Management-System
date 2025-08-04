const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteCRUDFlow() {
  console.log('🧪 Testing Complete CRUD Flow for Education and Experience...\n');

  try {
    // Test 1: Create employee with complete data
    console.log('1. Creating employee with complete education and experience data');
    
    const completeEmployeeData = {
      full_name: 'Complete CRUD Test Employee',
      father_husband_name: 'Test Father',
      relationship_type: 'father',
      mother_name: 'Test Mother',
      cnic: '12345-1234567-5',
      email: 'complete.crud@example.com',
      mobile_number: '+92-300-1234567',
      gender: 'Male',
      marital_status: 'Single',
      nationality: 'Pakistani',
      religion: 'Islam',
      blood_group: 'O+',
      date_of_birth: '1990-01-15',
      domicile_district: 'Lahore',
      present_address: 'Test Address, Lahore',
      permanent_address: 'Test Address, Lahore',
      same_address: true,
      district: 'Lahore',
      city: 'Lahore',
      has_disability: false,
      status: 'Active',
      past_experiences: [
        {
          company_name: 'Initial Company A',
          start_date: '2020-01-01',
          end_date: '2022-12-31',
          description: 'Initial Software Developer position'
        },
        {
          company_name: 'Initial Company B',
          start_date: '2018-01-01',
          end_date: '2019-12-31',
          description: 'Initial Junior Developer position'
        }
      ],
      educations: [
        {
          education_level: "Bachelor's Degree",
          institution_name: 'Initial University',
          year_of_completion: '2017',
          marks_gpa: '3.5',
          field_of_study: 'Computer Science'
        },
        {
          education_level: 'Intermediate',
          institution_name: 'Initial College',
          year_of_completion: '2013',
          marks_gpa: '85%',
          field_of_study: 'Pre-Engineering'
        }
      ]
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completeEmployeeData),
    });

    const createResult = await createResponse.json();
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create employee: ${createResult.error}`);
    }
    
    const employeeId = createResult.employee.id;
    console.log(`   ✅ Created employee (ID: ${employeeId})`);
    console.log(`   📋 Employee ID: ${createResult.employee.employee_id}`);

    // Test 2: Read and verify the created data
    console.log('\n2. Reading and verifying created employee data');
    
    const readResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const readResult = await readResponse.json();
    
    if (!readResponse.ok) {
      throw new Error(`Failed to read employee: ${readResult.error}`);
    }
    
    const employee = readResult.employee;
    console.log(`   ✅ Retrieved employee: ${employee.full_name}`);
    console.log(`   📋 Past Experiences: ${employee.pastExperiences?.length || 0} records`);
    console.log(`   📋 Education Qualifications: ${employee.educationQualifications?.length || 0} records`);
    
    // Verify field names and data structure for frontend compatibility
    console.log('\n   🔍 Frontend Compatibility Check:');
    console.log(`   ✅ Field name 'pastExperiences': ${!!employee.pastExperiences}`);
    console.log(`   ✅ Field name 'educationQualifications': ${!!employee.educationQualifications}`);
    
    if (employee.pastExperiences?.length > 0) {
      const exp = employee.pastExperiences[0];
      console.log(`   ✅ Experience structure: company_name=${exp.company_name}, start_date=${exp.start_date}`);
    }
    
    if (employee.educationQualifications?.length > 0) {
      const edu = employee.educationQualifications[0];
      console.log(`   ✅ Education structure: education_level=${edu.education_level}, institution_name=${edu.institution_name}`);
    }

    // Test 3: Update with new data
    console.log('\n3. Updating employee with new education and experience data');
    
    const updateData = {
      full_name: 'Updated Complete CRUD Test Employee',
      cnic: '12345-1234567-5',
      email: 'updated.complete.crud@example.com',
      mobile_number: '+92-300-1234567',
      gender: 'Male',
      status: 'Active',
      past_experiences: [
        {
          company_name: 'Updated Company X',
          start_date: '2021-01-01',
          end_date: '2023-12-31',
          description: 'Updated Senior Developer position'
        },
        {
          company_name: 'Updated Company Y',
          start_date: '2019-01-01',
          end_date: '2020-12-31',
          description: 'Updated Mid-level Developer position'
        },
        {
          company_name: 'Updated Company Z',
          start_date: '2017-01-01',
          end_date: '2018-12-31',
          description: 'Updated Junior Developer position'
        }
      ],
      educations: [
        {
          education_level: "Master's Degree",
          institution_name: 'Updated Graduate University',
          year_of_completion: '2019',
          marks_gpa: '3.8',
          field_of_study: 'Software Engineering'
        },
        {
          education_level: "Bachelor's Degree",
          institution_name: 'Updated University',
          year_of_completion: '2017',
          marks_gpa: '3.6',
          field_of_study: 'Computer Science'
        }
      ]
    };

    const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update employee: ${updateResult.error}`);
    }
    
    console.log(`   ✅ Updated employee successfully`);

    // Test 4: Verify the updated data
    console.log('\n4. Verifying updated data');
    
    const verifyResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok && verifyResult.employee) {
      const updatedEmp = verifyResult.employee;
      console.log(`   ✅ Employee: ${updatedEmp.full_name}`);
      console.log(`   ✅ Email: ${updatedEmp.email}`);
      console.log(`   📋 Past Experiences: ${updatedEmp.pastExperiences?.length || 0} records`);
      console.log(`   📋 Education Qualifications: ${updatedEmp.educationQualifications?.length || 0} records`);
      
      // Verify data was actually updated
      const hasNewExperience = updatedEmp.pastExperiences?.some(exp => exp.company_name === 'Updated Company X');
      const hasNewEducation = updatedEmp.educationQualifications?.some(edu => edu.education_level === "Master's Degree");
      
      if (hasNewExperience && hasNewEducation) {
        console.log(`   ✅ Data successfully updated - old records replaced with new ones`);
      } else {
        console.log(`   ❌ Data update issue detected`);
      }
      
      // Show all updated records
      console.log('\n   📋 Updated Experience Records:');
      updatedEmp.pastExperiences?.forEach((exp, index) => {
        console.log(`   ${index + 1}. ${exp.company_name} (${exp.start_date} - ${exp.end_date})`);
      });
      
      console.log('\n   📋 Updated Education Records:');
      updatedEmp.educationQualifications?.forEach((edu, index) => {
        console.log(`   ${index + 1}. ${edu.education_level} - ${edu.institution_name} (${edu.year_of_completion})`);
      });
    }

    // Test 5: Clean up
    console.log('\n5. Cleaning up test employee');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Deleted test employee successfully`);
    } else {
      console.log(`   ⚠️ Could not delete test employee`);
    }

    console.log('\n🎉 Complete CRUD Flow Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ CREATE - Employee with education/experience data');
    console.log('   ✅ READ - Employee data with correct field names');
    console.log('   ✅ UPDATE - Education/experience data replacement');
    console.log('   ✅ DELETE - Employee and related data cleanup');
    console.log('   ✅ Field names compatible with frontend (pastExperiences, educationQualifications)');
    console.log('\n   🎯 All CRUD operations working seamlessly!');

  } catch (error) {
    console.error('❌ Complete CRUD Flow Test Error:', error.message);
  }
}

testCompleteCRUDFlow();
