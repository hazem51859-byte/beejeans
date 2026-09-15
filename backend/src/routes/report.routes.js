const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/daily/:branchId', reportController.getDailyReport);
router.get('/sales-summary', authorize('MANAGER', 'ADMIN'), reportController.getSalesSummary);
router.get('/cashier-performance/:cashierId', authorize('MANAGER', 'ADMIN'), reportController.getCashierPerformance);
router.get('/top-products/:branchId', reportController.getTopProducts);
router.get('/inventory-status/:branchId', authorize('MANAGER', 'ADMIN'), reportController.getInventoryStatus);
router.get('/branch-transfers', authorize('ADMIN'), reportController.getBranchTransfersReport);
router.get('/office-invoices', authorize('ADMIN'), reportController.getOfficeInvoicesReport);
router.get('/audits', authorize('ADMIN'), reportController.getAuditsReport);
router.get('/branch-sales', authorize('ADMIN'), reportController.getBranchSalesReport);
router.get('/accounts', authorize('ADMIN'), reportController.getAccountsReport);

module.exports = router;
