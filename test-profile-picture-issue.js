const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = 'C:\\Users\\Administrator\\Desktop\\model-bazaar\\assets\\image\\about_us.png';

async function testProfilePictureIssue() {
  console.log('🖼️ TESTING PROFILE PICTURE ISSUE\n');

  try {
    // Test 1: Create employee with profile picture
    console.log('1. Creating employee with profile picture');
    
    const formData = new FormData();
    formData.append('full_name', 'Profile Picture Test Employee');
    formData.append('cnic', '11111-1111111-9');
    formData.append('email', 'profiletest@example.com');
    formData.append('mobile_number', '+92-300-1111111');
    formData.append('gender', 'Male');
    formData.append('status', 'Active');
    
    // Add profile picture
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      formData.append('profile_picture_file', fileBuffer, {
        filename: 'test_profile_picture.png',
        contentType: 'image/png'
      });
      console.log('   ✅ Added profile picture file');
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

    // Test 2: Check if profile picture is saved in database
    console.log('\n2. Checking profile picture in database');
    
    const getResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
    const employee = (await getResponse.json()).employee;
    
    console.log(`   📋 Employee: ${employee.full_name}`);
    console.log(`   📋 Profile Picture Field: "${employee.profile_picture || 'null'}"`);
    
    if (employee.profile_picture) {
      console.log(`   ✅ Profile picture reference saved in database: ${employee.profile_picture}`);
      
      // Test 3: Check if file exists on filesystem
      console.log('\n3. Checking if file exists on filesystem');
      
      const filePath = `server/${employee.profile_picture}`;
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ File exists on filesystem: ${filePath}`);
        const stats = fs.statSync(filePath);
        console.log(`   📊 File size: ${stats.size} bytes`);
      } else {
        console.log(`   ❌ File does NOT exist on filesystem: ${filePath}`);
      }
      
      // Test 4: Check if file is accessible via HTTP
      console.log('\n4. Checking if file is accessible via HTTP');
      
      const imageUrl = `http://localhost:3000/${employee.profile_picture}`;
      console.log(`   🌐 Testing URL: ${imageUrl}`);
      
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          console.log(`   ✅ Image accessible via HTTP (Status: ${imageResponse.status})`);
          console.log(`   📋 Content-Type: ${imageResponse.headers.get('content-type')}`);
          console.log(`   📋 Content-Length: ${imageResponse.headers.get('content-length')} bytes`);
        } else {
          console.log(`   ❌ Image NOT accessible via HTTP (Status: ${imageResponse.status})`);
        }
      } catch (error) {
        console.log(`   ❌ Error accessing image via HTTP: ${error.message}`);
      }
    } else {
      console.log(`   ❌ Profile picture reference NOT saved in database`);
    }

    // Test 5: Update employee with new profile picture
    console.log('\n5. Testing profile picture update');
    
    const updateFormData = new FormData();
    updateFormData.append('full_name', 'Updated Profile Picture Test Employee');
    updateFormData.append('cnic', '11111-1111111-9');
    updateFormData.append('email', 'updated.profiletest@example.com');
    updateFormData.append('status', 'Active');
    
    // Add new profile picture
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      updateFormData.append('profile_picture_file', fileBuffer, {
        filename: 'updated_profile_picture.png',
        contentType: 'image/png'
      });
      console.log('   ✅ Added updated profile picture file');
    }

    const updateResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: updateFormData,
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`   ❌ Update failed: ${errorText}`);
    } else {
      console.log(`   ✅ Employee updated successfully`);
      
      // Check updated profile picture
      const updatedGetResponse = await fetch(`${API_BASE}/employees/${employeeId}`);
      const updatedEmployee = (await updatedGetResponse.json()).employee;
      
      console.log(`   📋 Updated Profile Picture Field: "${updatedEmployee.profile_picture || 'null'}"`);
      
      if (updatedEmployee.profile_picture) {
        console.log(`   ✅ Updated profile picture reference saved`);
      } else {
        console.log(`   ❌ Updated profile picture reference NOT saved`);
      }
    }

    // Test 6: Check uploads directory
    console.log('\n6. Checking uploads directory');
    
    const uploadsDir = 'server/uploads';
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const profileFiles = files.filter(file => 
        file.includes('11111-1111111-9') && file.includes('profile')
      );
      
      console.log(`   📁 Total files in uploads: ${files.length}`);
      console.log(`   📁 Profile files for test employee: ${profileFiles.length}`);
      
      if (profileFiles.length > 0) {
        console.log('   📋 Profile files found:');
        profileFiles.forEach(file => {
          const filePath = `${uploadsDir}/${file}`;
          const stats = fs.statSync(filePath);
          console.log(`     - ${file} (${stats.size} bytes)`);
        });
      }
    } else {
      console.log(`   ❌ Uploads directory does not exist: ${uploadsDir}`);
    }

    // Test 7: Clean up
    console.log('\n7. Cleaning up test employee');
    
    const deleteResponse = await fetch(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log(`   ✅ Test employee deleted successfully`);
    }

    console.log('\n🖼️ PROFILE PICTURE TEST COMPLETE!');

  } catch (error) {
    console.error('❌ Profile Picture Test Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testProfilePictureIssue();
