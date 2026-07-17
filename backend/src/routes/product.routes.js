const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

router.use(authenticate);

router.post('/',
  authorize('MANAGER', 'ADMIN'),
  [
    body('sku').notEmpty().withMessage('SKU is required'),
    body('name').notEmpty().withMessage('Product name is required'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('costPrice').isNumeric().withMessage('Cost price must be a number'),
    body('sellingPrice').isNumeric().withMessage('Selling price must be a number')
  ],
  validate,
  productController.createProduct
);

router.get('/', productController.getProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

router.put('/:id',
  authorize('MANAGER', 'ADMIN'),
  productController.updateProduct
);

router.delete('/:id',
  authorize('ADMIN'),
  productController.deleteProduct
);

module.exports = router;
