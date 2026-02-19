const productService = require('../services/product.service');

exports.createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const status = await productService.getProductStatus(req.params.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
};
