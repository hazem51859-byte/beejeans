const express = require('express');
const router = express.Router();
const officeReturnController = require('../controllers/officeReturn.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', officeReturnController.createOfficeReturn);
router.get('/', officeReturnController.getAllOfficeReturns);
router.get('/search/:query', officeReturnController.searchInvoiceForReturn);
router.get('/:id', officeReturnController.getOfficeReturnById);

module.exports = router;
