const express = require('express');
const router = express.Router();
const officeCustomerController = require('../controllers/officeCustomer.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all office customers (admin only)
router.get('/', authorize(['ADMIN', 'MANAGER']), officeCustomerController.getAll);

// Search by phone (for autocomplete)
router.get('/search', authorize(['ADMIN', 'MANAGER']), officeCustomerController.searchByPhone);

// Get top customers
router.get('/top', authorize(['ADMIN']), officeCustomerController.getTopCustomers);

// Get customer details
router.get('/:id', authorize(['ADMIN', 'MANAGER']), officeCustomerController.getDetails);

// Create or update customer
router.post('/', authorize(['ADMIN', 'MANAGER']), officeCustomerController.createOrUpdate);

module.exports = router;
