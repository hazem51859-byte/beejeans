const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller.v2');
const { authenticate, authorize} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get pending transfers count (الإشعارات)
router.get('/pending-count', transferController.getPendingCount);

// Get all transfers with filters
router.get('/', transferController.getAllTransfers);

// Get pending transfers for sending (للفرع المرسل)
router.get('/pending/sending', transferController.getPendingTransfersForSending);

// Get pending transfers for receiving (للفرع المستقبل)
router.get('/pending/receiving', transferController.getPendingTransfersWithDetails);

// Get available items in transfer (ما المتبقي)
router.get('/:transferId/available', transferController.getAvailableAttributesForTransfer);

// Scan barcode to SEND item (الفرع المرسل)
router.post('/:transferId/scan/send', transferController.scanBarcodeForSending);

// Scan barcode to RECEIVE item (الفرع المستقبل)
router.post('/:transferId/scan/receive', transferController.scanBarcodeForReceiving);

// Confirm shipping (تأكيد الشحن من الفرع المرسل)
router.post('/:transferId/confirm-shipping', transferController.confirmShipping);

// Complete transfer receiving with final notes and discrepancies
router.post('/:transferId/complete-receiving', transferController.completeTransferReceiving);

// Confirm receiving transfer (تأكيد الاستلام المبسط)
router.post('/:transferId/confirm-receiving', transferController.confirmReceiving);

// Only Admin/Manager can create/ship directly
router.post('/', authorize('ADMIN', 'MANAGER'), transferController.createTransfer);
router.post('/:transferId/ship-direct', authorize('ADMIN', 'MANAGER'), transferController.shipDirect);

module.exports = router;
