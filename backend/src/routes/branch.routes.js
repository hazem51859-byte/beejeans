const express = require('express');
const { body } = require('express-validator');
const branchController = require('../controllers/branch.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// GET branches - Public (no auth needed for login pages)
router.get('/', branchController.getBranches);
router.get('/:id', branchController.getBranchById);

// All other routes require authentication
router.use(authenticate);

router.post('/',
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Branch name is required'),
    body('code').notEmpty().withMessage('Branch code is required')
  ],
  validate,
  branchController.createBranch
);

router.put('/:id',
  authorize('ADMIN'),
  branchController.updateBranch
);

router.delete('/:id',
  authorize('ADMIN'),
  branchController.deleteBranch
);

module.exports = router;
