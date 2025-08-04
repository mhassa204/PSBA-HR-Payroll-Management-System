const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function testDocumentDirect() {
  console.log('🔍 TESTING DOCUMENT CREATION DIRECTLY\n');

  const prisma = new PrismaClient();

  try {
    // Check current documents
    console.log('1. Checking current documents in database');
    
    const currentDocs = await prisma.employeeDocument.findMany({
      include: {
        employee: {
          select: { full_name: true, cnic: true }
        }
      }
    });
    
    console.log(`   📋 Current documents in database: ${currentDocs.length}`);
    
    if (currentDocs.length > 0) {
      console.log('   📋 Existing documents:');
      currentDocs.forEach((doc, index) => {
        console.log(`     ${index + 1}. Employee: ${doc.employee.full_name} (${doc.employee.cnic})`);
        console.log(`        Type: ${doc.file_type}, Path: ${doc.file_path}`);
        console.log(`        Created: ${doc.createdAt}`);
      });
    }

    // Create employee with document via API
    console.log('\n2. Creating employee with document via API');
    
    const formData = new FormData();
    formData.append('full_name', 'Direct Test Employee');
    formData.append('cnic', '77777-7777777-7');
    formData.append('email', 'direct.test@example.com');
    formData.append('mobile_number', '+92-300-7777777');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      formData.append('cnic_front', fileBuffer, {
        filename: 'direct_test_cnic.png',
        contentType: 'image/png'
      });
      console.log('   ✅ Added CNIC front document');
    }

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

    // Wait for transaction to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check documents immediately after creation using same Prisma client
    console.log('\n3. Checking documents using same Prisma client');
    
    const docsAfterCreation = await prisma.employeeDocument.findMany({
      where: { employee_id: employeeId },
      include: {
        employee: {
          select: { full_name: true, cnic: true }
        }
      }
    });
    
    console.log(`   📋 Documents for employee ${employeeId}: ${docsAfterCreation.length}`);
    
    if (docsAfterCreation.length > 0) {
      console.log('   ✅ DOCUMENTS FOUND IN DATABASE:');
      docsAfterCreation.forEach((doc, index) => {
        console.log(`     ${index + 1}. Type: ${doc.file_type}`);
        console.log(`        Path: ${doc.file_path}`);
        console.log(`        Name: ${doc.document_name}`);
        console.log(`        Size: ${doc.file_size} bytes`);
        console.log(`        Created: ${doc.createdAt}`);
      });
    } else {
      console.log('   ❌ NO DOCUMENTS FOUND IN DATABASE');
    }

    // Check all documents again
    console.log('\n4. Checking all documents in database');
    
    const allDocsAfter = await prisma.employeeDocument.findMany({
      include: {
        employee: {
          select: { full_name: true, cnic: true }
        }
      }
    });
    
    console.log(`   📋 Total documents in database: ${allDocsAfter.length}`);
    
    if (allDocsAfter.length > 0) {
      console.log('   📋 All documents:');
      allDocsAfter.forEach((doc, index) => {
        console.log(`     ${index + 1}. Employee: ${doc.employee.full_name} (${doc.employee.cnic})`);
        console.log(`        Type: ${doc.file_type}, Created: ${doc.createdAt}`);
      });
    }

    // Check via API
    console.log('\n5. Checking via API');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const employee = (await getResponse.json()).employee;
    
    console.log(`   📋 API returns ${employee.documents?.length || 0} documents`);
    
    if (employee.documents && employee.documents.length > 0) {
      console.log('   ✅ API document records:');
      employee.documents.forEach((doc, index) => {
        console.log(`     ${index + 1}. Type: ${doc.file_type}, Path: ${doc.file_path}`);
      });
    }

    // Clean up
    console.log('\n6. Cleaning up');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted`);
    }

    console.log('\n🔍 DIRECT DOCUMENT TEST COMPLETE!');

  } catch (error) {
    console.error('❌ Direct Document Test Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentDirect();
