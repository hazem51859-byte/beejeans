const express = require('express');
const router = express.Router();
const storeReturnController = require('../controllers/storeReturn.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// إنشاء مرتجع مخزن جديد
router.post('/', storeReturnController.createStoreReturn);

// جلب كل المرتجعات
router.get('/', storeReturnController.getAllStoreReturns);

// إحصائيات
router.get('/stats', storeReturnController.getStoreReturnsStats);

// جلب مرتجع واحد
router.get('/:id', storeReturnController.getStoreReturnById);

module.exports = router;
