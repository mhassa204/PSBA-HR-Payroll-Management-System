const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Employee Creation Flow...\n');

  try {
    // Test creating an employee with all related data
    console.log('1. Creating employee with complete data');
    const employeeData = {
      full_name: 'Complete Test Employee',
      father_husband_name: 'Test Father',
      relationship_type: 'father',
      mother_name: 'Test Mother',
      cnic: '12345-6789012-3',
      cnic_issue_date: '2020-01-01',
      cnic_expire_date: '2030-01-01',
      date_of_birth: '1990-05-15',
      gender: 'Male',
      marital_status: 'Single',
      nationality: 'Pakistani',
      religion: 'Islam',
      blood_group: 'O+',
      domicile_district: 'Islamabad',
      mobile_number: '+92-300-9876543',
      whatsapp_number: '+92-300-9876543',
      email: 'complete.test@example.com',
      present_address: 'Test Address, Islamabad',
      permanent_address: 'Test Address, Islamabad',
      same_address: true,
      district: 'Islamabad',
      city: 'Islamabad',
      has_disability: false,
      password: 'testpassword123',
      status: 'Active',
      // Past experiences
      past_experiences: [
        {
          company_name: 'Previous Company Ltd',
          start_date: '2018-01-01',
          end_date: '2020-12-31',
          description: 'Software Developer position'
        },
        {
          company_name: 'Another Company',
          start_date: '2021-01-01',
          end_date: '2023-06-30',
          description: 'Senior Developer position'
        }
      ],
      // Education qualifications
      educations: [
        {
          education_level: 'Bachelor\'s Degree',
          institution_name: 'Test University',
          year_of_completion: '2017',
          marks_gpa: '3.5'
        },
        {
          education_level: 'Master\'s Degree',
          institution_name: 'Advanced University',
          year_of_completion: '2019',
          marks_gpa: '3.8'
        }
      ]
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });

    if (createResponse.ok) {
      const createdEmployee = await createResponse.json();
      console.log(`   ✅ Employee created with ID: ${createdEmployee.employee?.id}`);
      console.log(`   ✅ Name: ${createdEmployee.employee?.full_name}`);
      console.log(`   ✅ Past experiences: ${createdEmployee.employee?.pastExperiences?.length || 0}`);
      console.log(`   ✅ Education qualifications: ${createdEmployee.employee?.educationQualifications?.length || 0}\n`);

      const employeeId = createdEmployee.employee?.id;

      if (employeeId) {
        // Test 2: Create employment record with salary and location
        console.log('2. Creating employment record with salary and location');
        const employmentData = {
          employee_id: employeeId,
          organization: 'PSBA',
          department_id: 1, // Engineering department
          designation_id: 1, // Junior Engineer
          employment_type: 'Regular',
          effective_from: '2024-01-01',
          role_tag: 'Software Engineer',
          office_location: 'Islamabad Office',
          remarks: 'New hire with excellent qualifications',
          salary: {
            basic_salary: 60000,
            medical_allowance: 6000,
            house_rent: 18000,
            conveyance_allowance: 4000,
            other_allowances: 2000,
            bank_account_primary: '1111222233334444',
            bank_name_primary: 'Test Bank',
            bank_branch_code: '1111',
            payment_mode: 'Bank Transfer',
            payroll_status: 'Active'
          },
          location: {
            district: 'Islamabad',
            city: 'Islamabad',
            type: 'HEAD_OFFICE',
            full_address: 'PSBA Head Office, Blue Area, Islamabad'
          }
        };

        const empCreateResponse = await fetch(`${API_BASE}/employment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employmentData),
        });

        if (empCreateResponse.ok) {
          const createdEmployment = await empCreateResponse.json();
          console.log(`   ✅ Employment created with ID: ${createdEmployment.employment?.id}`);
          console.log(`   ✅ Organization: ${createdEmployment.employment?.organization}`);
          console.log(`   ✅ Has salary data: ${!!createdEmployment.employment?.salary}`);
          console.log(`   ✅ Has location data: ${!!createdEmployment.employment?.location}\n`);

          // Test 3: Retrieve complete employee data
          console.log('3. Retrieving complete employee data');
          const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
          const completeEmployee = await getResponse.json();
          
          console.log(`   ✅ Retrieved employee: ${completeEmployee.employee?.full_name}`);
          console.log(`   ✅ Past experiences: ${completeEmployee.employee?.pastExperiences?.length || 0}`);
          console.log(`   ✅ Education qualifications: ${completeEmployee.employee?.educationQualifications?.length || 0}`);
          console.log(`   ✅ Employment records: ${completeEmployee.employee?.employmentRecords?.length || 0}`);
          console.log(`   ✅ Documents: ${completeEmployee.employee?.documents?.length || 0}\n`);

          // Test 4: Update employee data
          console.log('4. Updating employee data');
          const updateData = {
            mobile_number: '+92-300-1111111',
            email: 'updated.complete.test@example.com',
            status: 'Active'
          };

          const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          });

          if (updateResponse.ok) {
            const updatedEmployee = await updateResponse.json();
            console.log(`   ✅ Employee updated successfully`);
            console.log(`   ✅ New mobile: ${updatedEmployee.employee?.mobile_number}`);
            console.log(`   ✅ New email: ${updatedEmployee.employee?.email}\n`);
          }

          // Test 5: Clean up
          console.log('5. Cleaning up test data');
          const deleteEmpResponse = await fetch(`${API_BASE}/employment/${createdEmployment.employment?.id}`, {
            method: 'DELETE',
          });
          console.log(`   ✅ Employment deleted: ${deleteEmpResponse.status === 200}`);

          const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
            method: 'DELETE',
          });
          console.log(`   ✅ Employee deleted: ${deleteResponse.status === 200}\n`);

        } else {
          console.log(`   ❌ Employment creation failed: ${empCreateResponse.status}`);
        }
      }
    } else {
      const errorData = await createResponse.text();
      console.log(`   ❌ Employee creation failed: ${createResponse.status}`);
      console.log(`   Error: ${errorData}`);
    }

    console.log('🎉 Complete flow test finished!');

  } catch (error) {
    console.error('❌ Complete flow test error:', error.message);
  }
}

testCompleteFlow();
