const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Purchase summary
router.get('/summary', purchaseController.getPurchasesSummary);

// Purchase CRUD
router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/', purchaseController.createPurchase);
router.put('/:id/payment', purchaseController.updatePurchasePayment);
router.delete('/:id', purchaseController.deletePurchase);

module.exports = router;
