const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/wholesaleEmployee.controller');

router.use(authenticate);

router.get('/', authorize('ADMIN'), controller.getAll);
router.get('/performance', authorize('ADMIN'), controller.getPerformanceReport);
router.post('/', authorize('ADMIN'), controller.create);
router.put('/:id', authorize('ADMIN'), controller.update);
router.delete('/:id', authorize('ADMIN'), controller.remove);

module.exports = router;
