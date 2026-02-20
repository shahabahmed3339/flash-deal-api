const Product = require('../models/product.model');
const redis = require('../config/redis');
const { NotFoundError, ConflictError, BadRequestError, InternalServerError } = require('../utils/errors');

exports.createProduct = async (data) => {
  try {
    return await Product.create(data);
  } catch (err) {
    throw new InternalServerError(err);
  }
};

exports.getProductStatus = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product not found');

    const reserved = await redis.get(`reserved:product:${productId}`);
    const reservedStock = parseInt(reserved || 0);

    return {
      name: product.name,
      totalStock: product.totalStock,
      soldStock: product.soldStock,
      reservedStock,
      availableStock: product.totalStock - product.soldStock - reservedStock
    };
  } catch (err) {
    throw new InternalServerError(err);
  }
};
