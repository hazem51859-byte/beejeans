// Direct test of the partner accounting controller
const partnerController = require('./src/controllers/partner.controller');

// Mock request and response
const mockReq = {
  query: {},
  user: { id: 'test-user' }
};

const mockRes = {
  json: function(data) {
    console.log('📊 API Response:\n');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  },
  status: function(code) {
    console.log(`Status: ${code}`);
    return this;
  }
};

console.log('🧪 Testing Partner Accounting API...\n');

partnerController.getPartnersAccountingSummary(mockReq, mockRes)
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
