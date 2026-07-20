const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get active users (Admin/Manager)
router.get('/active-users', authorizeRoles('ADMIN', 'MANAGER'), activityController.getActiveUsers);

// Get all logs (Admin only)
router.get('/', authorizeRoles('ADMIN'), activityController.getAllLogs);

// Get user activity (Admin/Manager)
router.get('/user/:userId', authorizeRoles('ADMIN', 'MANAGER'), activityController.getUserActivity);

// Get branch activity (Admin/Manager)
router.get('/branch/:branchId', authorizeRoles('ADMIN', 'MANAGER'), activityController.getBranchActivity);

module.exports = router;
