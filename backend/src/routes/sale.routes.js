const express = require('express');
const { body } = require('express-validator');
const saleController = require('../controllers/sale.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/sales
 * @desc    Get all sales (with filters)
 * @access  Private
 */
router.get('/', saleController.getAllSales);

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

/**
 * @route   GET /api/v1/sales/search/:invoiceNumber
 * @desc    Search sale by invoice number (for returns)
 * @access  Private (CASHIER)
 */
router.get('/search/:invoiceNumber', saleController.searchSaleByInvoice);

/**
 * @route   POST /api/v1/sales/return/:invoiceNumber
 * @desc    Process return/refund
 * @access  Private (CASHIER, MANAGER, ADMIN)
 */
router.post('/return/:invoiceNumber',
  authorize('CASHIER', 'MANAGER', 'ADMIN'),
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('returnReason').notEmpty().withMessage('Return reason is required')
  ],
  validate,
  saleController.returnSale
);

module.exports = router;
