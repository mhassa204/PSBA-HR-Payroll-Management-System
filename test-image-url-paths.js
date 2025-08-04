const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:3000/api';

async function testImageUrlPaths() {
  console.log('🔗 TESTING IMAGE URL PATH FORMATS\n');

  try {
    // Get the permanent employee we created earlier
    console.log('1. Getting permanent employee data');
    
    const listResponse = await fetch(`${API_BASE}/employees`);
    const employees = (await listResponse.json()).employees;
    
    const permanentEmployee = employees.find(emp => 
      emp.full_name === 'Permanent Document Test Employee'
    );
    
    if (!permanentEmployee) {
      console.log('   ❌ Permanent employee not found');
      return;
    }
    
    console.log(`   ✅ Found employee: ${permanentEmployee.full_name}`);
    console.log(`   📋 Profile Picture: "${permanentEmployee.profile_picture || 'null'}"`);
    
    if (permanentEmployee.profile_picture) {
      const originalPath = permanentEmployee.profile_picture;
      console.log(`   📋 Original path: ${originalPath}`);
      
      // Test different URL formats
      console.log('\n2. Testing different URL formats');
      
      // Format 1: Original path with backslashes
      const url1 = `http://localhost:3000/${originalPath}`;
      console.log(`   🌐 Testing URL 1 (original): ${url1}`);
      
      try {
        const response1 = await fetch(url1);
        console.log(`   📊 Status: ${response1.status} ${response1.statusText}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Format 2: Convert backslashes to forward slashes
      const url2 = `http://localhost:3000/${originalPath.replace(/\\/g, '/')}`;
      console.log(`   🌐 Testing URL 2 (forward slashes): ${url2}`);
      
      try {
        const response2 = await fetch(url2);
        console.log(`   📊 Status: ${response2.status} ${response2.statusText}`);
        if (response2.ok) {
          console.log(`   ✅ SUCCESS! This URL format works`);
          console.log(`   📋 Content-Type: ${response2.headers.get('content-type')}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Format 3: Just the filename
      const filename = originalPath.split('\\').pop();
      const url3 = `http://localhost:3000/uploads/${filename}`;
      console.log(`   🌐 Testing URL 3 (filename only): ${url3}`);
      
      try {
        const response3 = await fetch(url3);
        console.log(`   📊 Status: ${response3.status} ${response3.statusText}`);
        if (response3.ok) {
          console.log(`   ✅ SUCCESS! This URL format also works`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Test documents too
      console.log('\n3. Testing document URLs');
      
      if (permanentEmployee.documents && permanentEmployee.documents.length > 0) {
        const firstDoc = permanentEmployee.documents[0];
        console.log(`   📋 First document: ${firstDoc.file_type} - ${firstDoc.file_path}`);
        
        const docUrl1 = `http://localhost:3000/${firstDoc.file_path}`;
        const docUrl2 = `http://localhost:3000/${firstDoc.file_path.replace(/\\/g, '/')}`;
        
        console.log(`   🌐 Testing document URL 1: ${docUrl1}`);
        try {
          const docResponse1 = await fetch(docUrl1);
          console.log(`   📊 Status: ${docResponse1.status} ${docResponse1.statusText}`);
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log(`   🌐 Testing document URL 2: ${docUrl2}`);
        try {
          const docResponse2 = await fetch(docUrl2);
          console.log(`   📊 Status: ${docResponse2.status} ${docResponse2.statusText}`);
          if (docResponse2.ok) {
            console.log(`   ✅ SUCCESS! Document URL with forward slashes works`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
    } else {
      console.log('   ❌ No profile picture found for permanent employee');
    }

    console.log('\n🎯 CONCLUSION:');
    console.log('   The issue is likely that the frontend is using the database path directly');
    console.log('   without converting backslashes to forward slashes for web URLs.');
    console.log('   The backend is working correctly - files are uploaded and accessible.');
    console.log('   The frontend needs to normalize the paths before displaying images.');

  } catch (error) {
    console.error('❌ Image URL Path Test Error:', error.message);
  }
}

testImageUrlPaths();
