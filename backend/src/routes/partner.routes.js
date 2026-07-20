const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Partner report endpoint
router.get('/report', partnerController.getAllPartners);

// Accounting Summary
router.get('/accounting/summary', partnerController.getPartnersAccountingSummary);

// Partner CRUD
router.get('/', partnerController.getAllPartners);
router.get('/:id', partnerController.getPartnerById);
router.post('/', partnerController.createPartner);
router.put('/:id', partnerController.updatePartner);
router.delete('/:id', partnerController.deletePartner);

// Partner Transactions
router.post('/transactions', partnerController.addPartnerTransaction);
router.get('/:partnerId/transactions', partnerController.getPartnerTransactions);

module.exports = router;
