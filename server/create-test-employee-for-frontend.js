const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function createTestEmployeeForFrontend() {
  console.log('🧪 Creating Test Employee for Frontend Testing...\n');

  try {
    // Check if we already have employees with education/experience data
    console.log('1. Checking existing employees');
    
    const listResponse = await fetch(`${API_BASE}/employees`);
    const listResult = await listResponse.json();
    
    if (listResponse.ok && listResult.employees) {
      const employeesWithData = listResult.employees.filter(emp => 
        (emp.pastExperiences?.length > 0) || (emp.educationQualifications?.length > 0)
      );
      
      console.log(`   📋 Found ${employeesWithData.length} employees with education/experience data`);
      
      if (employeesWithData.length > 0) {
        const emp = employeesWithData[0];
        console.log(`   ✅ Using existing employee: ${emp.full_name} (ID: ${emp.id})`);
        console.log(`   📋 Past Experiences: ${emp.pastExperiences?.length || 0}`);
        console.log(`   📋 Education Qualifications: ${emp.educationQualifications?.length || 0}`);
        
        console.log('\n🎯 Frontend Testing URLs:');
        console.log(`   📋 Employee Profile: http://localhost:5173/employees/view/${emp.id}`);
        console.log(`   📋 Employee Edit: http://localhost:5173/employees/edit/${emp.id}`);
        console.log(`   📋 Employee List: http://localhost:5173/employees`);
        return;
      }
    }

    // Create a comprehensive test employee
    console.log('\n2. Creating comprehensive test employee for frontend testing');
    
    const testEmployeeData = {
      full_name: 'Frontend Testing Employee',
      father_husband_name: 'Muhammad Ali Khan',
      relationship_type: 'father',
      mother_name: 'Fatima Begum',
      cnic: '42101-1234567-1',
      cnic_issue_date: '2010-01-15',
      cnic_expire_date: '2030-01-15',
      date_of_birth: '1985-03-20',
      email: 'frontend.testing@psba.gov.pk',
      mobile_number: '+92-300-1234567',
      whatsapp_number: '+92-300-1234567',
      gender: 'Male',
      marital_status: 'Married',
      nationality: 'Pakistani',
      religion: 'Islam',
      blood_group: 'B+',
      domicile_district: 'Islamabad',
      present_address: 'House No. 123, Street 45, Sector G-10/4, Islamabad',
      permanent_address: 'House No. 123, Street 45, Sector G-10/4, Islamabad',
      same_address: true,
      district: 'Islamabad',
      city: 'Islamabad',
      has_disability: false,
      status: 'Active',
      past_experiences: [
        {
          company_name: 'Tech Solutions Pvt Ltd',
          start_date: '2020-01-01',
          end_date: '2023-12-31',
          description: 'Senior Software Engineer - Led development of web applications using React, Node.js, and PostgreSQL. Managed a team of 5 developers and implemented CI/CD pipelines.'
        },
        {
          company_name: 'Digital Innovations Inc',
          start_date: '2018-06-01',
          end_date: '2019-12-31',
          description: 'Full Stack Developer - Developed and maintained e-commerce platforms using MERN stack. Integrated payment gateways and implemented security best practices.'
        },
        {
          company_name: 'StartupXYZ',
          start_date: '2016-01-01',
          end_date: '2018-05-31',
          description: 'Junior Developer - Worked on mobile applications using React Native. Collaborated with UI/UX designers to implement responsive designs.'
        }
      ],
      educations: [
        {
          education_level: "Master's Degree",
          institution_name: 'National University of Computer and Emerging Sciences',
          year_of_completion: '2015',
          marks_gpa: '3.8',
          field_of_study: 'Computer Science'
        },
        {
          education_level: "Bachelor's Degree",
          institution_name: 'University of Engineering and Technology',
          year_of_completion: '2013',
          marks_gpa: '3.5',
          field_of_study: 'Software Engineering'
        },
        {
          education_level: 'Intermediate',
          institution_name: 'Government College University',
          year_of_completion: '2009',
          marks_gpa: '85%',
          field_of_study: 'Pre-Engineering'
        },
        {
          education_level: 'Matriculation',
          institution_name: 'Islamabad Model School',
          year_of_completion: '2007',
          marks_gpa: '90%',
          field_of_study: 'Science'
        }
      ]
    };

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEmployeeData),
    });

    const createResult = await createResponse.json();
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create employee: ${createResult.error}`);
    }
    
    const employeeId = createResult.employee.id;
    console.log(`   ✅ Created test employee (ID: ${employeeId})`);
    console.log(`   📋 Employee ID: ${createResult.employee.employee_id}`);
    console.log(`   📋 Full Name: ${createResult.employee.full_name}`);

    // Verify the created employee
    console.log('\n3. Verifying created employee data');
    
    const verifyResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok && verifyResult.employee) {
      const emp = verifyResult.employee;
      console.log(`   ✅ Verified employee: ${emp.full_name}`);
      console.log(`   📋 Past Experiences: ${emp.pastExperiences?.length || 0} records`);
      console.log(`   📋 Education Qualifications: ${emp.educationQualifications?.length || 0} records`);
      
      console.log('\n   📋 Experience Summary:');
      emp.pastExperiences?.forEach((exp, index) => {
        console.log(`   ${index + 1}. ${exp.company_name} (${exp.start_date} - ${exp.end_date})`);
      });
      
      console.log('\n   📋 Education Summary:');
      emp.educationQualifications?.forEach((edu, index) => {
        console.log(`   ${index + 1}. ${edu.education_level} - ${edu.institution_name} (${edu.year_of_completion})`);
      });
    }

    console.log('\n🎯 Frontend Testing URLs:');
    console.log(`   📋 Employee Profile: http://localhost:5173/employees/view/${employeeId}`);
    console.log(`   📋 Employee Edit: http://localhost:5173/employees/edit/${employeeId}`);
    console.log(`   📋 Employee List: http://localhost:5173/employees`);
    console.log(`   📋 Create New Employee: http://localhost:5173/employees/create`);

    console.log('\n🎉 Test Employee Created Successfully!');
    console.log('\n📝 Frontend Testing Checklist:');
    console.log('   1. ✅ Visit employee profile page - verify education/experience displays');
    console.log('   2. ✅ Visit employee edit page - verify data pre-loads correctly');
    console.log('   3. ✅ Edit and save employee - verify updates work');
    console.log('   4. ✅ Create new employee - verify education/experience saves');
    console.log('   5. ✅ Check employee list - verify data displays in table');

  } catch (error) {
    console.error('❌ Test Employee Creation Error:', error.message);
  }
}

createTestEmployeeForFrontend();
