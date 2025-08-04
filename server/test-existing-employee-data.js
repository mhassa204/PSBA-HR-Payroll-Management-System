const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testExistingEmployeeData() {
  console.log('🧪 Testing Existing Employee Data Display...\n');

  try {
    // Test 1: Get all employees and check their data
    console.log('1. Checking existing employees for education/experience data');
    
    const listResponse = await fetch(`${API_BASE}/employees`);
    const listResult = await listResponse.json();
    
    if (listResponse.ok && listResult.employees) {
      console.log(`   📋 Found ${listResult.employees.length} employees`);
      
      let hasEducationData = false;
      let hasExperienceData = false;
      
      for (const emp of listResult.employees) {
        const eduCount = emp.educationQualifications?.length || 0;
        const expCount = emp.pastExperiences?.length || 0;
        
        console.log(`   📋 ${emp.full_name} (ID: ${emp.id}): ${expCount} experiences, ${eduCount} educations`);
        
        if (eduCount > 0) hasEducationData = true;
        if (expCount > 0) hasExperienceData = true;
      }
      
      if (!hasEducationData || !hasExperienceData) {
        console.log('\n   ⚠️ No existing employees with education/experience data found');
        console.log('   📝 Creating a test employee with complete data for frontend testing...');
        
        // Create a test employee with complete data
        const testEmployeeData = {
          full_name: 'Frontend Test Employee',
          father_husband_name: 'Test Father',
          relationship_type: 'father',
          mother_name: 'Test Mother',
          cnic: '12345-1234567-6',
          email: 'frontend.test@example.com',
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
              company_name: 'ABC Technologies',
              start_date: '2020-01-01',
              end_date: '2022-12-31',
              description: 'Senior Software Developer - Worked on web applications using React and Node.js'
            },
            {
              company_name: 'XYZ Solutions',
              start_date: '2018-06-01',
              end_date: '2019-12-31',
              description: 'Junior Developer - Developed mobile applications using React Native'
            },
            {
              company_name: 'Tech Innovators',
              start_date: '2017-01-01',
              end_date: '2018-05-31',
              description: 'Intern - Learned web development fundamentals'
            }
          ],
          educations: [
            {
              education_level: "Bachelor's Degree",
              institution_name: 'University of Engineering and Technology',
              year_of_completion: '2016',
              marks_gpa: '3.7',
              field_of_study: 'Computer Science'
            },
            {
              education_level: "Master's Degree",
              institution_name: 'National University of Computer Sciences',
              year_of_completion: '2018',
              marks_gpa: '3.9',
              field_of_study: 'Software Engineering'
            },
            {
              education_level: 'Intermediate',
              institution_name: 'Government College',
              year_of_completion: '2012',
              marks_gpa: '85%',
              field_of_study: 'Pre-Engineering'
            }
          ]
        };

        const createResponse = await fetch(`${API_BASE}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testEmployeeData),
        });

        const createResult = await createResponse.json();
        
        if (createResponse.ok) {
          console.log(`   ✅ Created test employee (ID: ${createResult.employee.id})`);
          console.log(`   📋 Employee ID: ${createResult.employee.employee_id}`);
          
          // Verify the created employee has the data
          const getResponse = await fetch(`${API_BASE}/employees/${createResult.employee.id}`);
          const getResult = await getResponse.json();
          
          if (getResponse.ok && getResult.employee) {
            const emp = getResult.employee;
            console.log(`   ✅ Verified: ${emp.pastExperiences?.length || 0} experiences, ${emp.educationQualifications?.length || 0} educations`);
            
            console.log('\n   📋 Experience Records:');
            emp.pastExperiences?.forEach((exp, index) => {
              console.log(`   ${index + 1}. ${exp.company_name} (${exp.start_date} - ${exp.end_date})`);
              console.log(`      ${exp.description}`);
            });
            
            console.log('\n   📋 Education Records:');
            emp.educationQualifications?.forEach((edu, index) => {
              console.log(`   ${index + 1}. ${edu.education_level} - ${edu.institution_name} (${edu.year_of_completion})`);
              console.log(`      Field: ${edu.field_of_study || 'N/A'}, GPA: ${edu.marks_gpa}`);
            });
            
            console.log('\n   🎯 Frontend Testing URLs:');
            console.log(`   📋 Employee Profile: http://localhost:5173/employees/view/${createResult.employee.id}`);
            console.log(`   📋 Employee Edit: http://localhost:5173/employees/edit/${createResult.employee.id}`);
            console.log(`   📋 Employee List: http://localhost:5173/employees`);
          }
        } else {
          console.log(`   ❌ Failed to create test employee: ${createResult.error}`);
        }
      }
    }

    console.log('\n🎉 Existing Employee Data Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Test the employee profile page to see if education/experience displays');
    console.log('   2. Test the employee edit form to see if data pre-loads');
    console.log('   3. Test creating new employees through the frontend form');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testExistingEmployeeData();
