const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Customer CRUD
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', authorize('ADMIN', 'MANAGER'), customerController.createCustomer);
router.put('/:id', authorize('ADMIN', 'MANAGER'), customerController.updateCustomer);
router.delete('/:id', authorize('ADMIN'), customerController.deleteCustomer);

// Direct customer sales and payments
router.post('/:id/sale', authorize('ADMIN', 'MANAGER'), customerController.createCustomerSale);
router.post('/:id/payment', authorize('ADMIN', 'MANAGER'), customerController.recordCustomerPayment);

module.exports = router;
