const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function testDocumentTransaction() {
  console.log('🔍 TESTING DOCUMENT TRANSACTION ISSUE\n');

  try {
    // Create employee with one document to isolate the issue
    console.log('1. Creating employee with one document');
    
    const formData = new FormData();
    formData.append('full_name', 'Transaction Test Employee');
    formData.append('cnic', '88888-8888888-8');
    formData.append('email', 'transaction.test@example.com');
    formData.append('mobile_number', '+92-300-8888888');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add just one document
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      formData.append('cnic_front', fileBuffer, {
        filename: 'transaction_test_cnic.png',
        contentType: 'image/png'
      });
      console.log('   ✅ Added CNIC front document');
    }

    console.log('   🚀 Creating employee...');
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
    console.log(`   ✅ Employee created (ID: ${employeeId})`);

    // Wait a moment for transaction to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check database immediately
    console.log('\n2. Checking database immediately after creation');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const employee = (await getResponse.json()).employee;
    
    console.log(`   📋 Employee: ${employee.full_name}`);
    console.log(`   📋 Documents in API response: ${employee.documents?.length || 0}`);

    // Clean up
    console.log('\n3. Cleaning up');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted`);
    }

    console.log('\n🔍 TRANSACTION TEST COMPLETE!');

  } catch (error) {
    console.error('❌ Transaction Test Error:', error.message);
  }
}

testDocumentTransaction();
