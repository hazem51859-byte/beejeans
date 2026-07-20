const express = require('express');
const router = express.Router();
const serialController = require('../controllers/serial.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Get all serials (Admin only - or any user with branchId filter)
router.get(
  '/',
  authenticate,
  serialController.getAllSerials
);

// Export serials to Excel (Admin only)
router.get(
  '/export',
  authenticate,
  authorize('ADMIN'),
  serialController.exportSerials
);

// Get my branch serials (Cashier/Manager)
router.get(
  '/my-serials',
  authenticate,
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  serialController.getMySerials
);

// Check serial availability before registration
router.get(
  '/check/:serialNumber',
  authenticate,
  serialController.checkSerialAvailability
);

// Search serial by number
router.get(
  '/search/:serialNumber',
  authenticate,
  serialController.searchSerial
);

// Register serial manually
router.post(
  '/register',
  authenticate,
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  serialController.registerSerial
);

module.exports = router;
