const Product = require('../models/product.model');
const redis = require('../config/redis');

exports.createProduct = async (data) => {
  return await Product.create(data);
};

exports.getProductStatus = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const reserved = await redis.get(`reserved:product:${productId}`);
  const reservedStock = parseInt(reserved || 0);

  return {
    totalStock: product.totalStock,
    soldStock: product.soldStock,
    reservedStock,
    availableStock:
      product.totalStock - product.soldStock - reservedStock
  };
};
