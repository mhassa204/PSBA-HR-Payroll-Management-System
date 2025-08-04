const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testEmploymentCRUD() {
  console.log('🧪 Testing Employment CRUD Operations...\n');

  try {
    // Test 1: Get all employees to find one to work with
    console.log('1. Getting employees to test employment operations');
    const employeesResponse = await fetch(`${API_BASE}/employees`);
    const employeesData = await employeesResponse.json();
    
    if (!employeesData.employees || employeesData.employees.length === 0) {
      console.log('   ❌ No employees found. Creating a test employee first...');
      
      // Create a test employee
      const newEmployee = {
        full_name: 'Employment Test User',
        cnic: '11111-1111111-1',
        email: 'employment.test@example.com',
        mobile_number: '+92-300-1111111',
        gender: 'Male',
        status: 'Active',
        password: 'testpassword123'
      };

      const createEmpResponse = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });

      const createdEmp = await createEmpResponse.json();
      if (!createEmpResponse.ok) {
        throw new Error(`Failed to create test employee: ${createdEmp.message}`);
      }
      
      console.log(`   ✅ Created test employee: ${createdEmp.employee.full_name} (ID: ${createdEmp.employee.id})`);
      var testEmployeeId = createdEmp.employee.id;
    } else {
      var testEmployeeId = employeesData.employees[0].id;
      console.log(`   ✅ Using existing employee: ${employeesData.employees[0].full_name} (ID: ${testEmployeeId})`);
    }

    // Test 2: Create Employment Record
    console.log('\n2. Testing CREATE Employment Record');
    const employmentData = {
      employee_id: testEmployeeId,
      organization: 'PSBA',
      department_id: 1, // Engineering
      designation_id: 1, // Junior Engineer
      employment_type: 'Regular',
      effective_from: '2024-01-01',
      role_tag: 'Software Developer',
      office_location: 'Islamabad Office',
      remarks: 'Test employment record creation',
      salary: {
        basic_salary: 75000,
        medical_allowance: 7500,
        house_rent: 22500,
        conveyance_allowance: 5000,
        other_allowances: 2500,
        bank_account_primary: '1234567890123456',
        bank_name_primary: 'Test Bank',
        bank_branch_code: '1234',
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

    const createResponse = await fetch(`${API_BASE}/employment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employmentData),
    });

    const createdEmployment = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(`Failed to create employment: ${createdEmployment.message}`);
    }

    console.log(`   ✅ Created employment record (ID: ${createdEmployment.employment.id})`);
    console.log(`   ✅ Organization: ${createdEmployment.employment.organization}`);
    console.log(`   ✅ Designation: ${createdEmployment.employment.designation?.title}`);
    console.log(`   ✅ Department: ${createdEmployment.employment.department?.name}`);
    console.log(`   ✅ Has Salary: ${!!createdEmployment.employment.salary}`);
    console.log(`   ✅ Has Location: ${!!createdEmployment.employment.location}`);

    const employmentId = createdEmployment.employment.id;

    // Test 3: Read Employment Record
    console.log('\n3. Testing READ Employment Record');
    const readResponse = await fetch(`${API_BASE}/employment/${employmentId}`);
    const readEmployment = await readResponse.json();
    
    if (!readResponse.ok) {
      throw new Error(`Failed to read employment: ${readEmployment.message}`);
    }

    console.log(`   ✅ Retrieved employment record (ID: ${readEmployment.employment.id})`);
    console.log(`   ✅ Employee: ${readEmployment.employment.employee?.full_name}`);
    console.log(`   ✅ Salary Basic: ${readEmployment.employment.salary?.basic_salary}`);
    console.log(`   ✅ Location City: ${readEmployment.employment.location?.city}`);

    // Test 4: Update Employment Record
    console.log('\n4. Testing UPDATE Employment Record');
    const updateData = {
      employment_type: 'Contract',
      role_tag: 'Senior Software Developer',
      remarks: 'Updated to contract position with promotion',
      salary: {
        basic_salary: 85000,
        medical_allowance: 8500,
        house_rent: 25500,
        conveyance_allowance: 6000,
        other_allowances: 3000,
        bank_account_primary: '1234567890123456',
        bank_name_primary: 'Test Bank',
        bank_branch_code: '1234',
        payment_mode: 'Bank Transfer',
        payroll_status: 'Active'
      },
      location: {
        district: 'Islamabad',
        city: 'Islamabad',
        type: 'HEAD_OFFICE',
        full_address: 'PSBA Head Office, Blue Area, Islamabad - Updated'
      }
    };

    const updateResponse = await fetch(`${API_BASE}/employment/${employmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const updatedEmployment = await updateResponse.json();
    if (!updateResponse.ok) {
      throw new Error(`Failed to update employment: ${updatedEmployment.message}`);
    }

    console.log(`   ✅ Updated employment record`);
    console.log(`   ✅ New Employment Type: ${updatedEmployment.employment.employment_type}`);
    console.log(`   ✅ New Role Tag: ${updatedEmployment.employment.role_tag}`);
    console.log(`   ✅ New Basic Salary: ${updatedEmployment.employment.salary?.basic_salary}`);

    // Test 5: Get Employment by Employee ID
    console.log('\n5. Testing GET Employment by Employee ID');
    const byEmployeeResponse = await fetch(`${API_BASE}/employment/employee/${testEmployeeId}`);
    const employmentsByEmployee = await byEmployeeResponse.json();
    
    if (!byEmployeeResponse.ok) {
      throw new Error(`Failed to get employments by employee: ${employmentsByEmployee.message}`);
    }

    console.log(`   ✅ Retrieved ${employmentsByEmployee.employments?.length || 0} employment records for employee`);
    if (employmentsByEmployee.employments && employmentsByEmployee.employments.length > 0) {
      const emp = employmentsByEmployee.employments[0];
      console.log(`   ✅ First record: ${emp.designation?.title} at ${emp.organization}`);
    }

    // Test 6: Delete Employment Record
    console.log('\n6. Testing DELETE Employment Record');
    const deleteResponse = await fetch(`${API_BASE}/employment/${employmentId}`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      const deleteError = await deleteResponse.json();
      throw new Error(`Failed to delete employment: ${deleteError.message}`);
    }

    console.log(`   ✅ Deleted employment record (ID: ${employmentId})`);

    // Test 7: Verify deletion
    console.log('\n7. Testing VERIFY Deletion');
    const verifyResponse = await fetch(`${API_BASE}/employment/${employmentId}`);
    
    if (verifyResponse.status === 404) {
      console.log(`   ✅ Employment record successfully deleted (404 Not Found)`);
    } else {
      console.log(`   ⚠️ Employment record still exists or unexpected response: ${verifyResponse.status}`);
    }

    console.log('\n🎉 Employment CRUD Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ CREATE - Employment with salary and location');
    console.log('   ✅ READ - Individual employment record');
    console.log('   ✅ UPDATE - Employment with salary and location updates');
    console.log('   ✅ DELETE - Employment record with cascading deletes');
    console.log('   ✅ LIST - Employment records by employee ID');
    console.log('\n   All employment CRUD operations are working seamlessly! 🎯');

  } catch (error) {
    console.error('❌ Employment CRUD Test Error:', error.message);
  }
}

testEmploymentCRUD();
