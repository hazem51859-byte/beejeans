const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Category CRUD
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), categoryController.createCategory);
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), categoryController.updateCategory);
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), categoryController.deleteCategory);

module.exports = router;
