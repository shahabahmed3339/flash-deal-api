const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const {
  createProductSchema,
  productIdParamSchema
} = require('../validations/product.validation');

router.post(
  '/',
  validate(createProductSchema),
  productController.createProduct
);

router.get(
  '/:id',
  validate(productIdParamSchema, 'params'),
  productController.getStatus
);

module.exports = router;
