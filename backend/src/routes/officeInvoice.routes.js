const express = require('express');
const router = express.Router();
const officeInvoiceController = require('../controllers/officeInvoice.controller');
const { authenticate, authorize } = require('../middleware/auth');

// كل الـ routes محتاجة authentication
router.use(authenticate);

// Dashboard - All authenticated users
router.get('/dashboard', officeInvoiceController.getOfficeInvoiceDashboard);

// CRUD Operations - All authenticated users
router.post('/', officeInvoiceController.createOfficeInvoice);
router.get('/', officeInvoiceController.getAllOfficeInvoices);
router.get('/:id', officeInvoiceController.getOfficeInvoiceById);

// Payment - All authenticated users
router.post('/:id/payment', officeInvoiceController.updatePayment);

module.exports = router;
