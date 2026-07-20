const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require Admin authentication
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// Dashboard
router.get('/dashboard', adminController.getDashboardOverview);
router.get('/stats', adminController.getSystemStats);

// Branches management
router.get('/branches/detailed', adminController.getAllBranchesDetailed);

// User management
router.post('/users', adminController.createBranchUser);

// Shifts monitoring
router.get('/shifts/open', adminController.getOpenShifts);

module.exports = router;
