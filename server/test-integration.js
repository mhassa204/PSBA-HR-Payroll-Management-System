const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing API Integration...\n');

  try {
    // Test 1: Get all employees
    console.log('1. Testing GET /employees');
    const employeesResponse = await fetch(`${API_BASE}/employees`);
    const employeesData = await employeesResponse.json();
    console.log(`   Status: ${employeesResponse.status}`);
    console.log(`   Employees count: ${employeesData.employees?.length || 0}`);
    console.log(`   ✅ GET /employees working\n`);

    // Test 2: Get departments
    console.log('2. Testing GET /departments');
    const deptResponse = await fetch(`${API_BASE}/departments`);
    const deptData = await deptResponse.json();
    console.log(`   Status: ${deptResponse.status}`);
    console.log(`   Departments count: ${deptData.departments?.length || 0}`);
    console.log(`   ✅ GET /departments working\n`);

    // Test 3: Get designations
    console.log('3. Testing GET /designations');
    const desigResponse = await fetch(`${API_BASE}/designations`);
    const desigData = await desigResponse.json();
    console.log(`   Status: ${desigResponse.status}`);
    console.log(`   Designations count: ${desigData.designations?.length || 0}`);
    console.log(`   ✅ GET /designations working\n`);

    // Test 4: Get employment records
    console.log('4. Testing GET /employment');
    const empResponse = await fetch(`${API_BASE}/employment`);
    const empData = await empResponse.json();
    console.log(`   Status: ${empResponse.status}`);
    console.log(`   Employment records count: ${empData.data?.length || 0}`);
    console.log(`   ✅ GET /employment working\n`);

    // Test 5: Create a test employee
    console.log('5. Testing POST /employees (create employee)');
    const newEmployee = {
      full_name: 'Test Employee',
      cnic: '12345-1234567-1',
      email: 'test@example.com',
      mobile_number: '+92-300-1234567',
      gender: 'Male',
      status: 'Active',
      password: 'testpassword123'
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEmployee),
    });

    if (createResponse.ok) {
      const createdEmployee = await createResponse.json();
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Created employee ID: ${createdEmployee.employee?.id}`);
      console.log(`   ✅ POST /employees working\n`);

      // Test 6: Get the created employee
      if (createdEmployee.employee?.id) {
        console.log('6. Testing GET /employees/:id');
        const getResponse = await fetch(`${API_BASE}/employees/${createdEmployee.employee.id}`);
        const getEmployee = await getResponse.json();
        console.log(`   Status: ${getResponse.status}`);
        console.log(`   Retrieved employee: ${getEmployee.employee?.full_name}`);
        console.log(`   ✅ GET /employees/:id working\n`);

        // Test 7: Update the employee
        console.log('7. Testing PUT /employees/:id');
        const updateData = {
          full_name: 'Updated Test Employee',
          email: 'updated@example.com'
        };

        const updateResponse = await fetch(`${API_BASE}/employees/${createdEmployee.employee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (updateResponse.ok) {
          const updatedEmployee = await updateResponse.json();
          console.log(`   Status: ${updateResponse.status}`);
          console.log(`   Updated employee name: ${updatedEmployee.employee?.full_name}`);
          console.log(`   ✅ PUT /employees/:id working\n`);
        } else {
          console.log(`   ❌ PUT /employees/:id failed with status: ${updateResponse.status}\n`);
        }

        // Test 8: Delete the employee
        console.log('8. Testing DELETE /employees/:id');
        const deleteResponse = await fetch(`${API_BASE}/employees/${createdEmployee.employee.id}`, {
          method: 'DELETE',
        });

        console.log(`   Status: ${deleteResponse.status}`);
        if (deleteResponse.ok) {
          console.log(`   ✅ DELETE /employees/:id working\n`);
        } else {
          console.log(`   ❌ DELETE /employees/:id failed\n`);
        }
      }
    } else {
      const errorData = await createResponse.text();
      console.log(`   ❌ POST /employees failed with status: ${createResponse.status}`);
      console.log(`   Error: ${errorData}\n`);
    }

    console.log('🎉 API Integration Test Complete!');

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testAPI();
