const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Get all vaults (admin and manager)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  vaultController.getAllVaults
);

// Get branch vault
router.get(
  '/branch/:branchId',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.getBranchVault
);

// Get vault transactions
router.get(
  '/transactions',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.getVaultTransactions
);

// Transfer from drawer to vault
router.post(
  '/transfer-drawer',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.transferDrawerToVault
);

// Set opening balance for drawer (Manager prepares cash before shift)
router.post(
  '/prepare-drawer',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.setDrawerOpening
);

// Money transfers between branches
router.post(
  '/money-transfer',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.sendMoneyTransfer
);

router.put(
  '/money-transfer/:transferId/confirm',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.confirmMoneyTransfer
);

router.put(
  '/money-transfer/:transferId/cancel',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.cancelMoneyTransfer
);

router.get(
  '/money-transfers/pending',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  vaultController.getPendingTransfers
);

// Get all active drawers (Admin only)
router.get(
  '/drawers',
  authenticate,
  authorize('ADMIN'),
  vaultController.getAllDrawers
);

module.exports = router;
