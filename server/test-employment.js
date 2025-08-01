const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testEmploymentAPI() {
  console.log('🧪 Testing Employment API Integration...\n');

  try {
    // First create an employee to use for employment records
    console.log('1. Creating test employee for employment records');
    const newEmployee = {
      full_name: 'Employment Test Employee',
      cnic: '54321-7654321-1',
      email: 'employment@example.com',
      mobile_number: '+92-300-7654321',
      gender: 'Female',
      status: 'Active',
      password: 'testpassword123'
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee),
    });

    const createdEmployee = await createResponse.json();
    console.log(`   Created employee ID: ${createdEmployee.employee?.id}`);
    console.log(`   ✅ Employee created for testing\n`);

    if (!createdEmployee.employee?.id) {
      throw new Error('Failed to create test employee');
    }

    const employeeId = createdEmployee.employee.id;

    // Test 2: Create employment record
    console.log('2. Testing POST /employment (create employment record)');
    const employmentData = {
      employee_id: employeeId,
      organization: 'PSBA',
      department_id: 1, // Assuming department ID 1 exists
      designation_id: 1, // Assuming designation ID 1 exists
      employment_type: 'Regular',
      effective_from: '2024-01-01',
      role_tag: 'Manager',
      office_location: 'Head Office',
      remarks: 'Initial appointment',
      salary: {
        basic_salary: 50000,
        medical_allowance: 5000,
        house_rent: 15000,
        conveyance_allowance: 3000,
        payment_mode: 'Bank Transfer',
        payroll_status: 'Active'
      },
      location: {
        district: 'Lahore',
        city: 'Lahore',
        type: 'HEAD_OFFICE',
        full_address: 'PSBA Head Office, Lahore'
      }
    };

    const empCreateResponse = await fetch(`${API_BASE}/employment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employmentData),
    });

    if (empCreateResponse.ok) {
      const createdEmployment = await empCreateResponse.json();
      console.log(`   Status: ${empCreateResponse.status}`);
      console.log(`   Created employment ID: ${createdEmployment.employment?.id}`);
      console.log(`   ✅ POST /employment working\n`);

      const employmentId = createdEmployment.employment?.id;

      if (employmentId) {
        // Test 3: Get employment by ID
        console.log('3. Testing GET /employment/:id');
        const getEmpResponse = await fetch(`${API_BASE}/employment/${employmentId}`);
        const getEmployment = await getEmpResponse.json();
        console.log(`   Status: ${getEmpResponse.status}`);
        console.log(`   Retrieved employment org: ${getEmployment.employment?.organization}`);
        console.log(`   Has salary data: ${!!getEmployment.employment?.salary}`);
        console.log(`   Has location data: ${!!getEmployment.employment?.location}`);
        console.log(`   ✅ GET /employment/:id working\n`);

        // Test 4: Get employment by employee ID
        console.log('4. Testing GET /employment/employee/:id');
        const getByEmpResponse = await fetch(`${API_BASE}/employment/employee/${employeeId}`);
        const employmentsByEmployee = await getByEmpResponse.json();
        console.log(`   Status: ${getByEmpResponse.status}`);
        console.log(`   Employment records count: ${employmentsByEmployee.employments?.length || 0}`);
        console.log(`   ✅ GET /employment/employee/:id working\n`);

        // Test 5: Update employment record
        console.log('5. Testing PUT /employment/:id');
        const updateData = {
          employment_type: 'Contract',
          remarks: 'Updated to contract position',
          salary: {
            basic_salary: 55000,
            medical_allowance: 6000,
            house_rent: 16000,
            conveyance_allowance: 3500,
            payment_mode: 'Bank Transfer',
            payroll_status: 'Active'
          }
        };

        const updateEmpResponse = await fetch(`${API_BASE}/employment/${employmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (updateEmpResponse.ok) {
          const updatedEmployment = await updateEmpResponse.json();
          console.log(`   Status: ${updateEmpResponse.status}`);
          console.log(`   Updated employment type: ${updatedEmployment.employment?.employment_type}`);
          console.log(`   ✅ PUT /employment/:id working\n`);
        } else {
          console.log(`   ❌ PUT /employment/:id failed with status: ${updateEmpResponse.status}\n`);
        }

        // Test 6: Delete employment record
        console.log('6. Testing DELETE /employment/:id');
        const deleteEmpResponse = await fetch(`${API_BASE}/employment/${employmentId}`, {
          method: 'DELETE',
        });

        console.log(`   Status: ${deleteEmpResponse.status}`);
        if (deleteEmpResponse.ok) {
          console.log(`   ✅ DELETE /employment/:id working\n`);
        } else {
          console.log(`   ❌ DELETE /employment/:id failed\n`);
        }
      }
    } else {
      const errorData = await empCreateResponse.text();
      console.log(`   ❌ POST /employment failed with status: ${empCreateResponse.status}`);
      console.log(`   Error: ${errorData}\n`);
    }

    // Clean up: Delete the test employee
    console.log('7. Cleaning up test employee');
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE',
    });
    console.log(`   Cleanup status: ${deleteResponse.status}`);
    console.log(`   ✅ Test employee cleaned up\n`);

    console.log('🎉 Employment API Integration Test Complete!');

  } catch (error) {
    console.error('❌ Employment API Test Error:', error.message);
  }
}

testEmploymentAPI();
