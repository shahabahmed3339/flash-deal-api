const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  totalStock: Joi.number().integer().min(1).required()
});

exports.productIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});
