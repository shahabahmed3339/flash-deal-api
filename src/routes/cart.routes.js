const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const validate = require('../middlewares/validate.middleware');
const {
  reserveSchema,
  cancelSchema,
  checkoutSchema
} = require('../validations/cart.validation');

router.post(
  '/reserve',
  validate(reserveSchema),
  cartController.reserve
);

router.post(
  '/cancel',
  validate(cancelSchema),
  cartController.cancel
);

router.post(
  '/checkout',
  validate(checkoutSchema),
  cartController.checkout
);

module.exports = router;
