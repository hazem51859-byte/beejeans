const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/branch/:branchId', inventoryController.getInventoryByBranch);
router.get('/product/:productId', inventoryController.getInventoryByProduct);
router.get('/low-stock/:branchId', inventoryController.getLowStockItems);

router.put('/:id/adjust',
  authorize('MANAGER', 'ADMIN'),
  inventoryController.adjustInventory
);

module.exports = router;
