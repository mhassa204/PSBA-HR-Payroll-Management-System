const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function debugDocumentRecords() {
  console.log('🔍 DEBUGGING DOCUMENT RECORDS ISSUE\n');

  const prisma = new PrismaClient();

  try {
    // Test 1: Check current EmployeeDocument table
    console.log('1. Checking current EmployeeDocument table');
    
    const existingDocs = await prisma.employeeDocument.findMany();
    console.log(`   📋 Current document records in database: ${existingDocs.length}`);
    
    if (existingDocs.length > 0) {
      console.log('   📋 Existing documents:');
      existingDocs.forEach((doc, index) => {
        console.log(`     ${index + 1}. Employee ${doc.employee_id}: ${doc.file_type} - ${doc.file_path}`);
      });
    }

    // Test 2: Create employee with files and monitor database
    console.log('\n2. Creating employee with files and monitoring database');
    
    const formData = new FormData();
    
    // Add basic employee data
    formData.append('full_name', 'Debug Document Test Employee');
    formData.append('cnic', '99999-9999999-9');
    formData.append('email', 'debug.doc.test@example.com');
    formData.append('mobile_number', '+92-300-9999999');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add file uploads
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      
      // Add documents that should go to EmployeeDocument table
      const documentTypes = [
        'cnic_front',
        'cnic_back', 
        'domicile_certificate',
        'education_documents',
        'experience_documents'
      ];
      
      console.log('   📋 Adding document uploads:');
      documentTypes.forEach(docType => {
        formData.append(docType, fileBuffer, {
          filename: `debug_${docType}.png`,
          contentType: 'image/png'
        });
        console.log(`     - ${docType}`);
      });
    }

    // Create employee
    console.log('\n   🚀 Creating employee...');
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

    // Test 3: Check database immediately after creation
    console.log('\n3. Checking database immediately after creation');
    
    const newDocs = await prisma.employeeDocument.findMany({
      where: { employee_id: employeeId }
    });
    
    console.log(`   📋 Document records for employee ${employeeId}: ${newDocs.length}`);
    
    if (newDocs.length > 0) {
      console.log('   ✅ Document records found:');
      newDocs.forEach((doc, index) => {
        console.log(`     ${index + 1}. Type: ${doc.file_type}, Path: ${doc.file_path}`);
        console.log(`        Name: ${doc.document_name}, Size: ${doc.file_size}`);
      });
    } else {
      console.log('   ❌ No document records found in database');
      
      // Check if files exist on filesystem
      const uploadDir = 'server/uploads';
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        const testFiles = files.filter(file => file.includes('99999-9999999-9'));
        console.log(`   📁 Files on filesystem: ${testFiles.length}`);
        testFiles.forEach(file => console.log(`     - ${file}`));
      }
    }

    // Test 4: Check API response
    console.log('\n4. Checking API response for documents');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    if (getResponse.ok) {
      const employee = (await getResponse.json()).employee;
      console.log(`   📋 API returns ${employee.documents?.length || 0} documents`);
      
      if (employee.documents && employee.documents.length > 0) {
        console.log('   ✅ API document records:');
        employee.documents.forEach((doc, index) => {
          console.log(`     ${index + 1}. Type: ${doc.file_type}, Path: ${doc.file_path}`);
        });
      }
    }

    // Test 5: Check all EmployeeDocument records again
    console.log('\n5. Final check of all EmployeeDocument records');
    
    const allDocs = await prisma.employeeDocument.findMany({
      include: {
        employee: {
          select: { full_name: true, cnic: true }
        }
      }
    });
    
    console.log(`   📋 Total document records in database: ${allDocs.length}`);
    
    if (allDocs.length > 0) {
      console.log('   📋 All document records:');
      allDocs.forEach((doc, index) => {
        console.log(`     ${index + 1}. Employee: ${doc.employee.full_name} (${doc.employee.cnic})`);
        console.log(`        Type: ${doc.file_type}, Path: ${doc.file_path}`);
      });
    }

    // Test 6: Clean up
    console.log('\n6. Cleaning up test employee');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted`);
    }

    console.log('\n🔍 DOCUMENT RECORDS DEBUG COMPLETE!');

  } catch (error) {
    console.error('❌ Debug Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugDocumentRecords();
