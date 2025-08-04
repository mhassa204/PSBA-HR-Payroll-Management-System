const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function testFileUploadSystem() {
  console.log('🧪 TESTING FILE UPLOAD SYSTEM\n');

  try {
    // Test 1: Check if test image exists
    console.log('1. Checking test image file');
    
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log(`   ❌ Test image not found at: ${TEST_IMAGE_PATH}`);
      console.log('   📝 Please ensure the test image exists at the specified path');
      return;
    }
    
    const stats = fs.statSync(TEST_IMAGE_PATH);
    console.log(`   ✅ Test image found: ${(stats.size / 1024).toFixed(2)} KB`);

    // Test 2: Create employee with file uploads
    console.log('\n2. Testing employee creation with file uploads');
    
    const formData = new FormData();
    
    // Add basic employee data
    formData.append('full_name', 'File Upload Test Employee');
    formData.append('cnic', '12345-1234567-4');
    formData.append('email', 'fileupload.test@example.com');
    formData.append('mobile_number', '+92-300-1234567');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add file uploads using the test image for all document types
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const fileName = path.basename(TEST_IMAGE_PATH);
    
    // Test different document types
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
    
    console.log('   📋 Adding file uploads for document types:');
    documentTypes.forEach(docType => {
      formData.append(docType, fileBuffer, {
        filename: `${docType}_${fileName}`,
        contentType: 'image/png'
      });
      console.log(`   - ${docType}`);
    });

    // Test the API call
    console.log('\n   🚀 Sending request to API...');
    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    console.log(`   📋 Response status: ${createResponse.status}`);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`   ❌ API Error: ${errorText}`);
      return;
    }

    const createResult = await createResponse.json();
    console.log(`   ✅ Employee created successfully (ID: ${createResult.employee?.id})`);
    
    const employeeId = createResult.employee?.id;
    if (!employeeId) {
      console.log('   ❌ No employee ID returned');
      return;
    }

    // Test 3: Verify file uploads were processed
    console.log('\n3. Verifying file uploads were processed');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    if (!getResponse.ok) {
      console.log('   ❌ Failed to retrieve created employee');
      return;
    }
    
    const employee = (await getResponse.json()).employee;
    console.log(`   ✅ Retrieved employee: ${employee.full_name}`);
    
    // Check for uploaded files in employee data
    console.log('\n   📋 Checking for uploaded files:');
    
    // Check profile picture
    if (employee.profile_picture_file) {
      console.log(`   ✅ Profile picture: ${employee.profile_picture_file}`);
    } else {
      console.log(`   ❌ Profile picture: Not found`);
    }
    
    // Check documents
    if (employee.documents && employee.documents.length > 0) {
      console.log(`   ✅ Documents: ${employee.documents.length} files uploaded`);
      employee.documents.forEach((doc, index) => {
        console.log(`     ${index + 1}. ${doc.file_type}: ${doc.file_path}`);
      });
    } else {
      console.log(`   ❌ Documents: No files found`);
    }

    // Test 4: Check if files exist on server
    console.log('\n4. Checking if files exist on server filesystem');
    
    const serverUploadDir = path.join(__dirname, 'server', 'uploads');
    console.log(`   📋 Checking upload directory: ${serverUploadDir}`);
    
    if (fs.existsSync(serverUploadDir)) {
      const uploadedFiles = fs.readdirSync(serverUploadDir);
      console.log(`   ✅ Upload directory exists with ${uploadedFiles.length} files`);
      
      // Look for files related to our test employee
      const testEmployeeFiles = uploadedFiles.filter(file => 
        file.includes('12345-1234567-4') || file.includes('File_Upload_Test_Employee')
      );
      
      if (testEmployeeFiles.length > 0) {
        console.log(`   ✅ Found ${testEmployeeFiles.length} files for test employee:`);
        testEmployeeFiles.forEach(file => console.log(`     - ${file}`));
      } else {
        console.log(`   ❌ No files found for test employee`);
      }
    } else {
      console.log(`   ❌ Upload directory does not exist`);
    }

    // Test 5: Test file update
    console.log('\n5. Testing file upload during employee update');
    
    const updateFormData = new FormData();
    updateFormData.append('full_name', 'Updated File Upload Test Employee');
    updateFormData.append('cnic', '12345-1234567-4');
    updateFormData.append('email', 'updated.fileupload.test@example.com');
    updateFormData.append('status', 'Active');
    
    // Add a new profile picture
    updateFormData.append('profile_picture_file', fileBuffer, {
      filename: `updated_${fileName}`,
      contentType: 'image/png'
    });

    const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: updateFormData,
    });

    if (updateResponse.ok) {
      console.log(`   ✅ Employee update with file upload successful`);
    } else {
      const updateError = await updateResponse.text();
      console.log(`   ❌ Employee update failed: ${updateError}`);
    }

    // Test 6: Clean up
    console.log('\n6. Cleaning up test employee');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted successfully`);
    } else {
      console.log(`   ⚠️ Could not delete test employee`);
    }

    console.log('\n🎉 FILE UPLOAD SYSTEM TEST COMPLETE!');

  } catch (error) {
    console.error('❌ File Upload Test Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFileUploadSystem();
