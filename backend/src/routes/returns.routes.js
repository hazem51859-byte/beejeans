const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returns.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get returns summary (Admin/Manager only)
router.get('/summary', authorizeRoles('ADMIN', 'MANAGER'), returnsController.getReturnsSummary);

// Get all returns (Admin/Manager only)
router.get('/', authorizeRoles('ADMIN', 'MANAGER'), returnsController.getAllReturns);

// Get return by ID (Admin/Manager only)
router.get('/:id', authorizeRoles('ADMIN', 'MANAGER'), returnsController.getReturnById);

module.exports = router;
