const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturing.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// All routes require authentication
router.use(authenticate);

// Fabric Stock (for Production Dashboard)
router.get('/fabric/stock', manufacturingController.getFabricStock);

// Manufacturing Orders
router.get('/manufacturing', manufacturingController.getAllManufacturingOrders);
router.get('/manufacturing/:id', manufacturingController.getManufacturingOrderById);
router.post('/manufacturing', checkPermission('ADMIN'), manufacturingController.createManufacturingOrder);
router.put('/manufacturing/:id/complete', checkPermission('ADMIN'), manufacturingController.completeManufacturingOrder);

// Washing Orders
router.get('/washing', manufacturingController.getAllWashingOrders);
router.post('/washing', checkPermission('ADMIN'), manufacturingController.createWashingOrder);
router.put('/washing/:id/complete', checkPermission('ADMIN'), manufacturingController.completeWashingOrder);

module.exports = router;
