const express = require('express');
const router = express.Router();
const vaultSystemController = require('../controllers/vault-system.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Vaults
router.get('/', vaultSystemController.getAllVaults);
router.get('/transactions', vaultSystemController.getVaultTransactions);
router.get('/:id', vaultSystemController.getVaultById);
router.post('/', vaultSystemController.createVault);
router.put('/:id', vaultSystemController.updateVault);

module.exports = router;
