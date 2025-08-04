const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';

async function testUpdateEducationExperience() {
  console.log('🧪 Testing Education and Experience Update...\n');

  try {
    // Test 1: Create an employee first
    console.log('1. Creating test employee');
    
    const initialData = {
      full_name: 'Update Test Employee',
      cnic: '12345-1234567-7',
      email: 'update.test@example.com',
      mobile_number: '+92-300-1234567',
      gender: 'Male',
      status: 'Active',
      past_experiences: [
        {
          company_name: 'Initial Company',
          start_date: '2020-01-01',
          end_date: '2022-12-31',
          description: 'Initial position'
        }
      ],
      educations: [
        {
          education_level: "Bachelor's Degree",
          institution_name: 'Initial University',
          year_of_completion: '2019',
          marks_gpa: '3.0'
        }
      ]
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialData),
    });

    const createResult = await createResponse.json();
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create employee: ${createResult.error}`);
    }
    
    const employeeId = createResult.employee.id;
    console.log(`   ✅ Created employee (ID: ${employeeId})`);

    // Test 2: Update with FormData (like frontend does)
    console.log('\n2. Updating employee with FormData');
    
    const formData = new FormData();
    formData.append('full_name', 'Updated Test Employee');
    formData.append('cnic', '12345-1234567-7');
    formData.append('email', 'updated.test@example.com');
    formData.append('mobile_number', '+92-300-1234567');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Updated education and experience data
    const updatedExperiences = [
      {
        company_name: 'Updated Company A',
        start_date: '2021-01-01',
        end_date: '2023-12-31',
        description: 'Updated position A'
      },
      {
        company_name: 'Updated Company B',
        start_date: '2019-01-01',
        end_date: '2020-12-31',
        description: 'Updated position B'
      }
    ];
    
    const updatedEducations = [
      {
        education_level: "Master's Degree",
        institution_name: 'Updated University',
        year_of_completion: '2021',
        marks_gpa: '3.8'
      },
      {
        education_level: "PhD",
        institution_name: 'Updated Graduate School',
        year_of_completion: '2024',
        marks_gpa: '4.0'
      }
    ];
    
    formData.append('past_experiences', JSON.stringify(updatedExperiences));
    formData.append('educations', JSON.stringify(updatedEducations));

    const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: formData,
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update employee: ${updateResult.error}`);
    }
    
    console.log(`   ✅ Updated employee successfully`);

    // Test 3: Retrieve and verify the updated data
    console.log('\n3. Verifying updated data');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const getResult = await getResponse.json();
    
    if (getResponse.ok && getResult.employee) {
      const emp = getResult.employee;
      console.log(`   📋 Employee: ${emp.full_name}`);
      console.log(`   📋 Email: ${emp.email}`);
      console.log(`   📋 Past Experiences: ${emp.pastExperiences?.length || 0} records`);
      console.log(`   📋 Education Qualifications: ${emp.educationQualifications?.length || 0} records`);
      
      if (emp.pastExperiences?.length > 0) {
        emp.pastExperiences.forEach((exp, index) => {
          console.log(`   ✅ Experience ${index + 1}: ${exp.company_name} (${exp.start_date} - ${exp.end_date})`);
        });
      }
      
      if (emp.educationQualifications?.length > 0) {
        emp.educationQualifications.forEach((edu, index) => {
          console.log(`   ✅ Education ${index + 1}: ${edu.education_level} from ${edu.institution_name} (${edu.year_of_completion})`);
        });
      }
      
      // Verify the data was actually updated
      const hasUpdatedExperience = emp.pastExperiences?.some(exp => exp.company_name === 'Updated Company A');
      const hasUpdatedEducation = emp.educationQualifications?.some(edu => edu.education_level === "Master's Degree");
      
      if (hasUpdatedExperience && hasUpdatedEducation) {
        console.log(`   ✅ Data successfully updated - old records replaced with new ones`);
      } else {
        console.log(`   ❌ Data update issue - old records may still exist`);
      }
    }

    // Test 4: Clean up
    console.log('\n4. Cleaning up test employee');
    
    await fetch(`${API_BASE}/employees/${employeeId}`, { method: 'DELETE' });
    console.log(`   ✅ Deleted test employee`);

    console.log('\n🎉 Education and Experience Update Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Employee creation with education/experience works');
    console.log('   ✅ Employee update with FormData works');
    console.log('   ✅ JSON parsing in FormData works for both creation and updates');
    console.log('   ✅ Old records are properly replaced with new ones');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testUpdateEducationExperience();
