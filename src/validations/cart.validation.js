const Joi = require('joi');

exports.reserveSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  productId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required()
});

exports.cancelSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  productId: Joi.string().hex().length(24).required()
});

exports.checkoutSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  productId: Joi.string().hex().length(24).required()
});
