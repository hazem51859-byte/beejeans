const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth');

// كل الـ routes تحتاج authentication
router.use(authenticate);

// إنشاء جرد جديد
router.post('/', auditController.createAudit);

// جلب كل الجرود (مع فلترة)
router.get('/', auditController.getAllAudits);

// جلب جرد واحد بالتفاصيل
router.get('/:id', auditController.getAuditById);

// تحديث كمية منتج في الجرد
router.patch('/items/:id', auditController.updateAuditItem);

// إكمال الجرد
router.post('/:id/complete', auditController.completeAudit);

// تسوية الجرد (تعديل المخزون)
router.post('/:id/settle', auditController.settleAudit);

module.exports = router;
