const axios = require('axios');

async function testAccountsAPI() {
  try {
    console.log('\n🧪 Testing /api/reports/accounts endpoint...\n');
    
    // First login to get token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    if (!token) {
      console.log('   ❌ No token in response!');
      console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    console.log(`   ✅ Got token: ${token.substring(0, 20)}...\n`);
    
    // Now call the accounts endpoint
    console.log('2️⃣ Calling /api/v1/reports/accounts...');
    const accountsResponse = await axios.get('http://localhost:5000/api/v1/reports/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('   ✅ Response received!\n');
    console.log('📊 Response Data:');
    console.log(JSON.stringify(accountsResponse.data, null, 2));
    
    const summary = accountsResponse.data.data.summary;
    console.log('\n💰 Summary:');
    console.log(`   Customer Debt: ${summary.customerDebt} EGP`);
    console.log(`   Customer Credit: ${summary.customerCredit} EGP`);
    console.log(`   Supplier Debt: ${summary.supplierDebt} EGP`);
    console.log(`   Net Position: ${summary.netPosition} EGP\n`);
    
    if (summary.customerCredit > 0) {
      console.log('✅ Customer credit is > 0, should display on frontend!\n');
    } else {
      console.log('❌ Customer credit is 0, won\'t display on frontend!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAccountsAPI();
