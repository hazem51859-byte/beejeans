const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returns.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// جميع المسارات تحتاج authentication
router.use(authenticate);

// إنشاء مرتجع جديد (CASHIER, MANAGER, ADMIN)
router.post(
  '/',
  checkPermission(['CREATE_SALE']), // نفس صلاحية البيع
  returnsController.createReturn
);

// الحصول على جميع المرتجعات
router.get(
  '/',
  returnsController.getAllReturns
);

// الحصول على إحصائيات المرتجعات
router.get(
  '/stats',
  returnsController.getReturnsStats
);

// الحصول على مرتجع واحد
router.get(
  '/:id',
  returnsController.getReturnById
);

// مراجعة المانجر
router.post(
  '/:id/manager-review',
  checkPermission(['MANAGE_RETURNS']),
  returnsController.managerReview
);

module.exports = router;
