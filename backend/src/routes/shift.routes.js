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
 * @desc    Open new shift
 * @access  Private (CASHIER, MANAGER)
 */
router.post('/open',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('branchId').notEmpty().withMessage('Branch ID is required'),
    body('openingBalance').isNumeric().withMessage('Opening balance must be a number')
  ],
  validate,
  shiftController.openShift
);

/**
 * @route   POST /api/v1/shifts/:id/close
 * @desc    Close shift
 * @access  Private (CASHIER, MANAGER)
 */
router.post('/:id/close',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('actualCash').isNumeric().withMessage('Actual cash must be a number'),
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
