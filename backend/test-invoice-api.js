const axios = require('axios');

async function testInvoiceAPI() {
  try {
    const saleId = '13158240-c2e4-428b-8672-20d0fdcc2e85';
    const url = `http://localhost:5000/api/v1/customers/invoices/${saleId}`;
    
    console.log('🔍 Testing API endpoint:');
    console.log(url);
    console.log();
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'll need a valid token
      }
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

testInvoiceAPI();
