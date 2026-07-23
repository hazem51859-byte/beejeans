const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// All routes require authentication
router.use(authenticate);

// Suppliers CRUD
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', checkPermission('ADMIN'), supplierController.createSupplier);
router.put('/:id', checkPermission('ADMIN'), supplierController.updateSupplier);
router.delete('/:id', checkPermission('ADMIN'), supplierController.deleteSupplier);

// Supplier Payments
router.post('/:supplierId/payments', checkPermission('ADMIN'), supplierController.makePayment);
router.get('/:supplierId/payments', supplierController.getSupplierPayments);

module.exports = router;
