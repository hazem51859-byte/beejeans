const axios = require('axios');

async function testProductionAPI() {
  try {
    const API_URL = 'http://localhost:5000/api/v1';
    
    console.log('🔐 تسجيل الدخول...');
    
    // Login first
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ تم تسجيل الدخول بنجاح\n');
    
    // Test fabric stock endpoint
    console.log('📊 جلب مخزون القماش...');
    const fabricRes = await axios.get(`${API_URL}/production/fabric/stock`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ النتيجة:');
    console.log(JSON.stringify(fabricRes.data, null, 2));
    
  } catch (error) {
    console.error('❌ خطأ:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testProductionAPI();
