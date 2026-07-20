const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Expense summary
router.get('/summary', expenseController.getExpensesSummary);

// Expense CRUD
router.get('/', expenseController.getAllExpenses);
router.get('/:id', expenseController.getExpenseById);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
