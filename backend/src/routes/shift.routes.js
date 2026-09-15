const express = require('express');
const { body } = require('express-validator');
const shiftController = require('../controllers/shift.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/shifts/open
 * @desc    Open new shift (with default opening balance)
 * @access  Private (CASHIER, MANAGER)
 */
router.post('/open',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('branchId').notEmpty().withMessage('Branch ID is required')
  ],
  validate,
  shiftController.openShift
);

/**
 * @route   GET /api/v1/shifts/branch/:branchId/cashiers
 * @desc    Get available cashiers for shift
 * @access  Private (MANAGER, ADMIN)
 */
router.get('/branch/:branchId/cashiers',
  authorize('MANAGER', 'ADMIN'),
  shiftController.getAvailableCashiers
);

/**
 * @route   POST /api/v1/shifts/:id/close
 * @desc    Close shift (automatic calculation)
 * @access  Private (CASHIER, MANAGER)
 */
router.post('/:id/close',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('notes').optional().isString()
  ],
  validate,
  shiftController.closeShift
);

/**
 * @route   GET /api/v1/shifts/current
 * @desc    Get current open shift for user
 * @access  Private
 */
router.get('/current', shiftController.getCurrentShift);

/**
 * @route   GET /api/v1/shifts/:id
 * @desc    Get shift details
 * @access  Private
 */
router.get('/:id', shiftController.getShiftById);

/**
 * @route   GET /api/v1/shifts/branch/:branchId
 * @desc    Get shifts for a branch
 * @access  Private
 */
router.get('/branch/:branchId', shiftController.getShiftsByBranch);

module.exports = router;
