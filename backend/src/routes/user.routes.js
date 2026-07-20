const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

router.use(authenticate);

router.post('/',
  authorize('ADMIN', 'MANAGER'),
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role').isIn(['ADMIN', 'MANAGER', 'CASHIER']).withMessage('Invalid role')
  ],
  validate,
  userController.createUser
);

router.get('/', authorize('ADMIN', 'MANAGER'), userController.getUsers);
router.get('/:id', userController.getUserById);

router.put('/:id',
  authorize('ADMIN', 'MANAGER'),
  userController.updateUser
);

router.delete('/:id',
  authorize('ADMIN'),
  userController.deleteUser
);

module.exports = router;
