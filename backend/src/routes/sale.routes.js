const express = require('express');
const { body } = require('express-validator');
const saleController = require('../controllers/sale.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/sales
 * @desc    Create new sale
 * @access  Private (CASHIER, MANAGER)
 */
router.post('/',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('branchId').notEmpty().withMessage('Branch ID is required'),
    body('shiftId').notEmpty().withMessage('Shift ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isNumeric().withMessage('Unit price must be a number'),
    body('paymentMethod').isIn(['CASH', 'CARD', 'CREDIT', 'MIXED']).withMessage('Invalid payment method'),
    body('amountPaid').isNumeric().withMessage('Amount paid must be a number')
  ],
  validate,
  saleController.createSale
);

/**
 * @route   GET /api/v1/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get('/:id', saleController.getSaleById);

/**
 * @route   GET /api/v1/sales/invoice/:invoiceNumber
 * @desc    Get sale by invoice number
 * @access  Private
 */
router.get('/invoice/:invoiceNumber', saleController.getSaleByInvoice);

/**
 * @route   GET /api/v1/sales/branch/:branchId
 * @desc    Get sales for a branch
 * @access  Private
 */
router.get('/branch/:branchId', saleController.getSalesByBranch);

/**
 * @route   GET /api/v1/sales/shift/:shiftId
 * @desc    Get sales for a shift
 * @access  Private
 */
router.get('/shift/:shiftId', saleController.getSalesByShift);

/**
 * @route   PUT /api/v1/sales/:id/refund
 * @desc    Refund a sale
 * @access  Private (MANAGER, ADMIN)
 */
router.put('/:id/refund',
  authorize('MANAGER', 'ADMIN'),
  [
    body('reason').optional().isString()
  ],
  validate,
  saleController.refundSale
);

module.exports = router;
