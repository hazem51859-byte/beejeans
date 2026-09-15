const express = require('express');
const router = express.Router();
const cashierController = require('../controllers/cashier.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER'));

// Get all cashiers performance
router.get('/performance', cashierController.getCashiersPerformance);

// Get specific cashier details
router.get('/:cashierId/details', cashierController.getCashierDetails);

module.exports = router;
