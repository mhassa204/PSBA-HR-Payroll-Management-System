const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function createPermanentEmployeeWithDocuments() {
  console.log('🎯 CREATING PERMANENT EMPLOYEE WITH DOCUMENTS\n');

  try {
    // Create a permanent employee with documents (don't delete)
    console.log('1. Creating permanent employee with multiple documents');
    
    const formData = new FormData();
    
    // Complete employee data
    formData.append('full_name', 'Permanent Document Test Employee');
    formData.append('father_husband_name', 'Permanent Test Father');
    formData.append('relationship_type', 'father');
    formData.append('mother_name', 'Permanent Test Mother');
    formData.append('cnic', '99999-9999999-1');
    formData.append('cnic_issue_date', '2010-01-15');
    formData.append('cnic_expire_date', '2030-01-15');
    formData.append('date_of_birth', '1985-03-20');
    formData.append('gender', 'Male');
    formData.append('marital_status', 'Married');
    formData.append('nationality', 'Pakistani');
    formData.append('religion', 'Islam');
    formData.append('blood_group', 'B+');
    formData.append('domicile_district', 'Islamabad');
    formData.append('mobile_number', '+92-300-9999999');
    formData.append('whatsapp_number', '+92-300-9999999');
    formData.append('email', 'permanent.document.test@psba.gov.pk');
    formData.append('present_address', 'Permanent Test Address, Islamabad');
    formData.append('permanent_address', 'Permanent Test Address, Islamabad');
    formData.append('same_address', 'true');
    formData.append('district', 'Islamabad');
    formData.append('city', 'Islamabad');
    formData.append('has_disability', 'false');
    formData.append('missing_note', 'This is a permanent employee for document testing');
    formData.append('status', 'Active');

    // Add education data
    const educations = [
      {
        education_level: "Master's Degree",
        institution_name: 'Permanent Test University',
        year_of_completion: '2019',
        marks_gpa: '3.8',
        field_of_study: 'Computer Science'
      }
    ];
    formData.append('educations', JSON.stringify(educations));

    // Add experience data
    const past_experiences = [
      {
        company_name: 'Permanent Test Company',
        start_date: '2020-01-01',
        end_date: '2023-12-31',
        description: 'Senior Software Engineer - Permanent test position'
      }
    ];
    formData.append('past_experiences', JSON.stringify(past_experiences));

    // Add ALL document types
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      
      // Profile picture
      formData.append('profile_picture_file', fileBuffer, {
        filename: 'permanent_profile.png',
        contentType: 'image/png'
      });
      
      // All document types
      const documentTypes = [
        'cnic_front', 'cnic_back', 'domicile_certificate',
        'disability_document', 'education_documents',
        'experience_documents', 'other_documents'
      ];
      
      documentTypes.forEach(docType => {
        formData.append(docType, fileBuffer, {
          filename: `permanent_${docType}.png`,
          contentType: 'image/png'
        });
      });
      
      console.log(`   ✅ Added profile picture + ${documentTypes.length} document uploads`);
    }

    // Create employee
    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`   ❌ Creation failed: ${errorText}`);
      return;
    }

    const createResult = await createResponse.json();
    const employeeId = createResult.employee?.id;
    console.log(`   ✅ Permanent employee created (ID: ${employeeId})`);
    console.log(`   📋 Employee ID: ${createResult.employee.employee_id}`);

    // Verify the employee data
    console.log('\n2. Verifying permanent employee data');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const employee = (await getResponse.json()).employee;
    
    console.log(`   ✅ Employee: ${employee.full_name}`);
    console.log(`   ✅ Employee ID: ${employee.employee_id}`);
    console.log(`   ✅ Email: ${employee.email}`);
    console.log(`   ✅ Missing Note: "${employee.missing_note}"`);
    console.log(`   ✅ Profile Picture: ${employee.profile_picture ? 'Yes' : 'No'}`);
    console.log(`   ✅ Education Records: ${employee.educationQualifications?.length || 0}`);
    console.log(`   ✅ Experience Records: ${employee.pastExperiences?.length || 0}`);
    console.log(`   ✅ Document Records: ${employee.documents?.length || 0}`);

    if (employee.documents && employee.documents.length > 0) {
      console.log('\n   📋 Document Details:');
      employee.documents.forEach((doc, index) => {
        console.log(`     ${index + 1}. Type: ${doc.file_type}`);
        console.log(`        Path: ${doc.file_path}`);
        console.log(`        Name: ${doc.document_name}`);
        console.log(`        Size: ${doc.file_size} bytes`);
      });
    }

    console.log('\n🎉 PERMANENT EMPLOYEE WITH DOCUMENTS CREATED!');
    console.log('\n📝 Summary:');
    console.log(`   ✅ Employee ID: ${employee.employee_id}`);
    console.log(`   ✅ Database ID: ${employeeId}`);
    console.log(`   ✅ Full Name: ${employee.full_name}`);
    console.log(`   ✅ Email: ${employee.email}`);
    console.log(`   ✅ Documents: ${employee.documents?.length || 0}`);
    console.log(`   ✅ Education: ${employee.educationQualifications?.length || 0}`);
    console.log(`   ✅ Experience: ${employee.pastExperiences?.length || 0}`);
    
    console.log('\n🎯 VERIFICATION URLS:');
    console.log(`   📋 Employee Profile: http://localhost:5173/employees/view/${employeeId}`);
    console.log(`   📋 Employee Edit: http://localhost:5173/employees/edit/${employeeId}`);
    console.log(`   📋 Employee List: http://localhost:5173/employees`);

    console.log('\n✅ THIS EMPLOYEE WILL REMAIN IN THE DATABASE FOR TESTING!');
    console.log('✅ You can now check the EmployeeDocument table and see the records!');

  } catch (error) {
    console.error('❌ Permanent Employee Creation Error:', error.message);
  }
}

createPermanentEmployeeWithDocuments();
