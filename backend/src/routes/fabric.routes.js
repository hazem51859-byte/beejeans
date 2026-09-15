const express = require('express');
const router = express.Router();
const fabricController = require('../controllers/fabric.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// All routes require authentication
router.use(authenticate);

// Fabric Types
router.get('/types', fabricController.getAllFabricTypes);
router.get('/types/:id', fabricController.getFabricTypeById);
router.post('/types', checkPermission('ADMIN'), fabricController.createFabricType);
router.put('/types/:id', checkPermission('ADMIN'), fabricController.updateFabricType);
router.delete('/types/:id', checkPermission('ADMIN'), fabricController.deleteFabricType);

// Fabric Purchases
router.get('/purchases', fabricController.getAllFabricPurchases);
router.post('/purchases', checkPermission('ADMIN'), fabricController.createFabricPurchase);

// Fabric Warehouse/Stock
router.get('/warehouse', fabricController.getFabricWarehouse);
router.get('/stock/:fabricTypeId', fabricController.getStockByFabricType);

module.exports = router;
