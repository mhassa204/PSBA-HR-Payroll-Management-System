const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';

async function testEducationExperienceData() {
  console.log('🧪 Testing Education and Experience Data Flow...\n');

  try {
    // Test 1: Create employee with education and experience data using JSON
    console.log('1. Testing with JSON data (like frontend sends)');
    
    const employeeData = {
      full_name: 'Education Experience Test',
      cnic: '12345-1234567-9',
      email: 'edu.exp.test@example.com',
      mobile_number: '+92-300-1234567',
      gender: 'Male',
      status: 'Active',
      past_experiences: [
        {
          company_name: 'Test Company A',
          start_date: '2020-01-01',
          end_date: '2022-12-31',
          description: 'Software Developer position'
        },
        {
          company_name: 'Test Company B',
          start_date: '2018-01-01',
          end_date: '2019-12-31',
          description: 'Junior Developer position'
        }
      ],
      educations: [
        {
          education_level: "Bachelor's Degree",
          institution_name: 'Test University',
          year_of_completion: '2017',
          marks_gpa: '3.5'
        },
        {
          education_level: "Master's Degree",
          institution_name: 'Test Graduate School',
          year_of_completion: '2019',
          marks_gpa: '3.8'
        }
      ]
    };

    // Test with JSON (direct API call)
    const jsonResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });

    const jsonResult = await jsonResponse.json();
    
    if (jsonResponse.ok) {
      console.log(`   ✅ JSON: Employee created (ID: ${jsonResult.employee.id})`);
      var jsonEmployeeId = jsonResult.employee.id;
    } else {
      console.log(`   ❌ JSON: Failed - ${jsonResult.error}`);
    }

    // Test 2: Create employee with FormData (like frontend actually sends)
    console.log('\n2. Testing with FormData (simulating frontend)');
    
    const formData = new FormData();
    formData.append('full_name', 'FormData Education Experience Test');
    formData.append('cnic', '12345-1234567-8');
    formData.append('email', 'formdata.edu.exp.test@example.com');
    formData.append('mobile_number', '+92-300-1234567');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add education and experience as JSON strings (like frontend does)
    formData.append('past_experiences', JSON.stringify(employeeData.past_experiences));
    formData.append('educations', JSON.stringify(employeeData.educations));

    const formDataResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    const formDataResult = await formDataResponse.json();
    
    if (formDataResponse.ok) {
      console.log(`   ✅ FormData: Employee created (ID: ${formDataResult.employee.id})`);
      var formDataEmployeeId = formDataResult.employee.id;
    } else {
      console.log(`   ❌ FormData: Failed - ${formDataResult.error}`);
    }

    // Test 3: Retrieve and check the data
    console.log('\n3. Checking retrieved employee data');
    
    if (jsonEmployeeId) {
      const getJsonResponse = await fetch(`${API_BASE}/employees/${jsonEmployeeId}`);
      const getJsonResult = await getJsonResponse.json();
      
      if (getJsonResponse.ok) {
        const emp = getJsonResult.employee;
        console.log(`   📋 JSON Employee: ${emp.full_name}`);
        console.log(`   📋 Past Experiences: ${emp.pastExperiences?.length || 0} records`);
        console.log(`   📋 Education Qualifications: ${emp.educationQualifications?.length || 0} records`);
        
        if (emp.pastExperiences?.length > 0) {
          console.log(`   ✅ Experience 1: ${emp.pastExperiences[0].company_name}`);
        }
        if (emp.educationQualifications?.length > 0) {
          console.log(`   ✅ Education 1: ${emp.educationQualifications[0].education_level}`);
        }
      }
    }
    
    if (formDataEmployeeId) {
      const getFormDataResponse = await fetch(`${API_BASE}/employees/${formDataEmployeeId}`);
      const getFormDataResult = await getFormDataResponse.json();
      
      if (getFormDataResponse.ok) {
        const emp = getFormDataResult.employee;
        console.log(`   📋 FormData Employee: ${emp.full_name}`);
        console.log(`   📋 Past Experiences: ${emp.pastExperiences?.length || 0} records`);
        console.log(`   📋 Education Qualifications: ${emp.educationQualifications?.length || 0} records`);
        
        if (emp.pastExperiences?.length > 0) {
          console.log(`   ✅ Experience 1: ${emp.pastExperiences[0].company_name}`);
        } else {
          console.log(`   ❌ No past experiences found - this indicates the JSON parsing issue`);
        }
        
        if (emp.educationQualifications?.length > 0) {
          console.log(`   ✅ Education 1: ${emp.educationQualifications[0].education_level}`);
        } else {
          console.log(`   ❌ No education qualifications found - this indicates the JSON parsing issue`);
        }
      }
    }

    // Test 4: Clean up
    console.log('\n4. Cleaning up test employees');
    
    if (jsonEmployeeId) {
      await fetch(`${API_BASE}/employees/${jsonEmployeeId}`, { method: 'DELETE' });
      console.log(`   ✅ Deleted JSON test employee`);
    }
    
    if (formDataEmployeeId) {
      await fetch(`${API_BASE}/employees/${formDataEmployeeId}`, { method: 'DELETE' });
      console.log(`   ✅ Deleted FormData test employee`);
    }

    console.log('\n🎉 Education and Experience Data Test Complete!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testEducationExperienceData();
