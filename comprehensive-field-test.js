const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function comprehensiveFieldTest() {
  console.log('🧪 COMPREHENSIVE FIELD SYNCHRONIZATION TEST\n');

  try {
    // Test 1: Create employee with ALL possible fields
    console.log('1. Testing employee creation with ALL fields');
    
    const formData = new FormData();
    
    // Basic employee data - ALL fields from frontend form
    const allEmployeeFields = {
      full_name: 'Comprehensive Test Employee',
      father_husband_name: 'Test Father Name',
      relationship_type: 'father',
      mother_name: 'Test Mother Name',
      cnic: '12345-1234567-3',
      cnic_issue_date: '2010-01-15',
      cnic_expire_date: '2030-01-15',
      date_of_birth: '1985-03-20',
      gender: 'Male',
      marital_status: 'Married',
      nationality: 'Pakistani',
      religion: 'Islam',
      blood_group: 'B+',
      domicile_district: 'Islamabad',
      mobile_number: '+92-300-1234567',
      whatsapp_number: '+92-300-1234567',
      email: 'comprehensive.test@example.com',
      present_address: 'Test Present Address',
      permanent_address: 'Test Permanent Address',
      same_address: 'false',
      district: 'Islamabad',
      city: 'Islamabad',
      has_disability: 'false',
      disability_type: '',
      disability_description: '',
      mission_note: 'This is a test mission note from frontend form',
      has_past_experience: 'true',
      status: 'Active'
    };

    // Add all basic fields to FormData
    Object.keys(allEmployeeFields).forEach(key => {
      formData.append(key, allEmployeeFields[key]);
    });

    // Add education data
    const educations = [
      {
        education_level: "Bachelor's Degree",
        institution_name: 'Test University',
        year_of_completion: '2017',
        marks_gpa: '3.5',
        field_of_study: 'Computer Science'
      },
      {
        education_level: 'Intermediate',
        institution_name: 'Test College',
        year_of_completion: '2013',
        marks_gpa: '85%',
        field_of_study: 'Pre-Engineering'
      }
    ];
    formData.append('educations', JSON.stringify(educations));

    // Add experience data
    const past_experiences = [
      {
        company_name: 'Test Company A',
        start_date: '2020-01-01',
        end_date: '2022-12-31',
        description: 'Test position description A'
      },
      {
        company_name: 'Test Company B',
        start_date: '2018-01-01',
        end_date: '2019-12-31',
        description: 'Test position description B'
      }
    ];
    formData.append('past_experiences', JSON.stringify(past_experiences));

    // Add file uploads if test image exists
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      const fileName = 'test_image.png';
      
      // Add all document types
      const documentTypes = [
        'profile_picture_file',
        'cnic_front',
        'cnic_back',
        'domicile_certificate',
        'disability_document',
        'education_documents',
        'experience_documents',
        'other_documents'
      ];
      
      documentTypes.forEach(docType => {
        formData.append(docType, fileBuffer, {
          filename: `${docType}_${fileName}`,
          contentType: 'image/png'
        });
      });
      
      console.log(`   📋 Added ${documentTypes.length} file uploads`);
    } else {
      console.log('   ⚠️ Test image not found, skipping file uploads');
    }

    // Send creation request
    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`   ❌ Creation failed: ${createResponse.status} - ${errorText}`);
      return;
    }

    const createResult = await createResponse.json();
    const employeeId = createResult.employee?.id;
    console.log(`   ✅ Employee created successfully (ID: ${employeeId})`);

    // Test 2: Retrieve and analyze ALL fields
    console.log('\n2. Retrieving and analyzing ALL fields');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    if (!getResponse.ok) {
      console.log('   ❌ Failed to retrieve employee');
      return;
    }
    
    const employee = (await getResponse.json()).employee;
    console.log(`   ✅ Retrieved employee: ${employee.full_name}`);

    // Analyze which fields were saved vs which were sent
    console.log('\n   📋 FIELD ANALYSIS:');
    
    const sentFields = Object.keys(allEmployeeFields);
    const receivedFields = Object.keys(employee).filter(key => 
      !['id', 'createdAt', 'updatedAt', 'pastExperiences', 'educationQualifications', 'documents', 'employmentRecords'].includes(key)
    );

    console.log(`   📤 Sent ${sentFields.length} basic fields`);
    console.log(`   📥 Received ${receivedFields.length} basic fields`);

    // Check which fields are missing
    const missingFields = sentFields.filter(field => !receivedFields.includes(field));
    const extraFields = receivedFields.filter(field => !sentFields.includes(field));

    if (missingFields.length > 0) {
      console.log(`   ❌ MISSING FIELDS (${missingFields.length}):`);
      missingFields.forEach(field => console.log(`     - ${field}`));
    }

    if (extraFields.length > 0) {
      console.log(`   ✅ EXTRA FIELDS (${extraFields.length}):`);
      extraFields.forEach(field => console.log(`     - ${field}: ${employee[field]}`));
    }

    // Check related data
    console.log('\n   📋 RELATED DATA ANALYSIS:');
    console.log(`   📚 Education records: ${employee.educationQualifications?.length || 0}`);
    console.log(`   💼 Experience records: ${employee.pastExperiences?.length || 0}`);
    console.log(`   📄 Document records: ${employee.documents?.length || 0}`);

    // Test 3: Check specific problematic fields
    console.log('\n3. Checking specific problematic fields');
    
    const problematicFields = {
      mission_note: employee.mission_note,
      profile_picture: employee.profile_picture,
      employee_id: employee.employee_id,
      status: employee.status
    };

    Object.keys(problematicFields).forEach(field => {
      const value = problematicFields[field];
      if (value !== undefined && value !== null) {
        console.log(`   ✅ ${field}: ${value}`);
      } else {
        console.log(`   ❌ ${field}: Missing or null`);
      }
    });

    // Test 4: Test employee update with all fields
    console.log('\n4. Testing employee update with all fields');
    
    const updateFormData = new FormData();
    
    // Update all fields
    const updatedFields = {
      ...allEmployeeFields,
      full_name: 'Updated Comprehensive Test Employee',
      email: 'updated.comprehensive.test@example.com',
      mission_note: 'Updated mission note from frontend form'
    };

    Object.keys(updatedFields).forEach(key => {
      updateFormData.append(key, updatedFields[key]);
    });

    // Update education and experience
    updateFormData.append('educations', JSON.stringify([
      {
        education_level: "Master's Degree",
        institution_name: 'Updated University',
        year_of_completion: '2019',
        marks_gpa: '3.8',
        field_of_study: 'Software Engineering'
      }
    ]));

    updateFormData.append('past_experiences', JSON.stringify([
      {
        company_name: 'Updated Company',
        start_date: '2021-01-01',
        end_date: '2023-12-31',
        description: 'Updated position description'
      }
    ]));

    const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: updateFormData,
    });

    if (updateResponse.ok) {
      console.log(`   ✅ Employee update successful`);
      
      // Verify update
      const verifyResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
      if (verifyResponse.ok) {
        const updatedEmployee = (await verifyResponse.json()).employee;
        console.log(`   ✅ Verified: ${updatedEmployee.full_name}`);
        console.log(`   ✅ Mission note: ${updatedEmployee.mission_note || 'Still missing'}`);
        console.log(`   ✅ Education records: ${updatedEmployee.educationQualifications?.length || 0}`);
        console.log(`   ✅ Experience records: ${updatedEmployee.pastExperiences?.length || 0}`);
      }
    } else {
      const updateError = await updateResponse.text();
      console.log(`   ❌ Update failed: ${updateError}`);
    }

    // Test 5: Clean up
    console.log('\n5. Cleaning up test employee');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted successfully`);
    }

    console.log('\n🎉 COMPREHENSIVE FIELD TEST COMPLETE!');

  } catch (error) {
    console.error('❌ Comprehensive Field Test Error:', error.message);
  }
}

comprehensiveFieldTest();
