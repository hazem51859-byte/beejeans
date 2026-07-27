const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { authenticate, authorize } = require('../middleware/auth');

// كل الـ routes محتاجة authentication
router.use(authenticate);

// CRUD Operations - All authenticated users
router.get('/', shipmentController.getAllShipments);
router.get('/:id', shipmentController.getShipmentById);

// Status Updates - All authenticated users
router.put('/:id/status', shipmentController.updateShipmentStatus);
router.put('/:id/details', shipmentController.updateShipmentDetails);

// Payment Collection - All authenticated users
router.post('/:id/confirm-payment', shipmentController.confirmPaymentCollection);

module.exports = router;
