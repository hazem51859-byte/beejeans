const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n🧪 Testing products API...\n');
    
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    
    // Get products
    const productsResponse = await axios.get('http://localhost:5000/api/v1/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const products = productsResponse.data.data || productsResponse.data;
    const samples = products.filter(p => ['1055', '1061', '1062'].includes(p.sku));
    
    console.log('📊 Products from API:\n');
    samples.forEach(p => {
      console.log(`${p.sku} - ${p.name}`);
      console.log(`   Cost: ${p.costPrice} / Selling: ${p.sellingPrice}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();
