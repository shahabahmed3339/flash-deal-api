const Joi = require('joi');

exports.reserveSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().hex().length(24).required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

exports.cancelSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  productIds: Joi.array().items(
    Joi.string().hex().length(24)
  ).min(1).unique().required()
});

exports.checkoutSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  productIds: Joi.array().items(
    Joi.string().hex().length(24)
  ).min(1).required()
});
