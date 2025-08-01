// Simple API test script
const http = require('http');

function testAPI(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test departments
    console.log('📁 Testing departments endpoint...');
    const deptResult = await testAPI('/departments');
    console.log(`Status: ${deptResult.status}`);
    if (deptResult.data.success) {
      console.log(`✅ Found ${deptResult.data.departments.length} departments`);
      deptResult.data.departments.forEach(dept => {
        console.log(`  - ${dept.name} (${dept.code})`);
      });
    } else {
      console.log('❌ Failed to fetch departments');
    }

    console.log('\n👔 Testing designations endpoint...');
    const desigResult = await testAPI('/designations');
    console.log(`Status: ${desigResult.status}`);
    if (desigResult.data.success) {
      console.log(`✅ Found ${desigResult.data.designations.length} designations`);
      // Show first 5 designations
      desigResult.data.designations.slice(0, 5).forEach(des => {
        console.log(`  - ${des.title} (Level ${des.level})`);
      });
      if (desigResult.data.designations.length > 5) {
        console.log(`  ... and ${desigResult.data.designations.length - 5} more`);
      }
    } else {
      console.log('❌ Failed to fetch designations');
    }

    console.log('\n🏢 Testing employment form options...');
    const optionsResult = await testAPI('/employment/form-options');
    console.log(`Status: ${optionsResult.status}`);
    if (optionsResult.data.success) {
      const options = optionsResult.data.options;
      console.log(`✅ Form options loaded:`);
      console.log(`  - Departments: ${options.departments.length}`);
      console.log(`  - Designations: ${options.designations.length}`);
      console.log(`  - Organizations: ${options.organizations.length}`);
      console.log(`  - Employment Types: ${options.employmentTypes.length}`);
    } else {
      console.log('❌ Failed to fetch form options');
    }

    console.log('\n🎉 API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
