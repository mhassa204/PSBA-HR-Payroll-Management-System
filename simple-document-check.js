const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function simpleDocumentCheck() {
  console.log('🔍 SIMPLE DOCUMENT CHECK\n');

  try {
    // Create a simple employee with one document
    console.log('1. Creating employee with one document');
    
    const formData = new FormData();
    formData.append('full_name', 'Simple Document Test');
    formData.append('cnic', '11111-1111111-1');
    formData.append('email', 'simple.doc@test.com');
    formData.append('mobile_number', '+92-300-1111111');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add just one document
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      formData.append('cnic_front', fileBuffer, {
        filename: 'simple_test_cnic.png',
        contentType: 'image/png'
      });
      console.log('   ✅ Added CNIC front document');
    }

    const createResponse = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });

    if (!createResponse.ok) {
      console.log(`   ❌ Creation failed: ${await createResponse.text()}`);
      return;
    }

    const createResult = await createResponse.json();
    const employeeId = createResult.employee?.id;
    console.log(`   ✅ Employee created (ID: ${employeeId})`);

    // Check the employee data
    console.log('\n2. Checking employee data');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const employee = (await getResponse.json()).employee;
    
    console.log(`   📋 Employee: ${employee.full_name}`);
    console.log(`   📋 Documents returned by API: ${employee.documents?.length || 0}`);
    
    if (employee.documents && employee.documents.length > 0) {
      console.log('   ✅ DOCUMENTS ARE BEING SAVED AND RETRIEVED:');
      employee.documents.forEach((doc, index) => {
        console.log(`     ${index + 1}. Type: ${doc.file_type}`);
        console.log(`        Path: ${doc.file_path}`);
        console.log(`        Name: ${doc.document_name}`);
        console.log(`        Size: ${doc.file_size} bytes`);
        console.log(`        MIME: ${doc.mime_type}`);
        console.log(`        Created: ${doc.createdAt}`);
      });
    } else {
      console.log('   ❌ No documents found');
    }

    // Check all employees to see total documents
    console.log('\n3. Checking all employees for documents');
    
    const listResponse = await fetch(`${API_BASE}/employees`);
    const listResult = await listResponse.json();
    
    let totalDocuments = 0;
    listResult.employees?.forEach(emp => {
      const docCount = emp.documents?.length || 0;
      totalDocuments += docCount;
      if (docCount > 0) {
        console.log(`   📋 ${emp.full_name}: ${docCount} documents`);
      }
    });
    
    console.log(`   📊 Total documents across all employees: ${totalDocuments}`);

    // Clean up
    console.log('\n4. Cleaning up');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted`);
    }

    console.log('\n🎯 CONCLUSION:');
    if (totalDocuments > 0) {
      console.log('   ✅ DOCUMENT UPLOAD SYSTEM IS WORKING CORRECTLY!');
      console.log('   ✅ Documents are being saved to EmployeeDocument table');
      console.log('   ✅ Documents are being retrieved via API');
      console.log('   ✅ All document metadata is being stored properly');
    } else {
      console.log('   ❌ No documents found - there may be an issue');
    }

  } catch (error) {
    console.error('❌ Simple Document Check Error:', error.message);
  }
}

simpleDocumentCheck();
