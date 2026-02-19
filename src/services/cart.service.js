const mongoose = require('mongoose');
const redis = require('../config/redis');
const Product = require('../models/product.model');
const Order = require('../models/order.model');

exports.reserveProduct = async (userId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const reservedKey = `reserved:product:${productId}`;
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;

  await redis.watch(reservedKey);

  const reserved = parseInt(await redis.get(reservedKey) || 0);
  const available = product.totalStock - product.soldStock - reserved;

  if (available < quantity)
    throw new Error('Not enough stock available');

  const multi = redis.multi();

  multi.incrby(reservedKey, quantity);
  multi.set(dataKey, quantity); // NO TTL
  multi.set(ttlKey, 1, 'EX', process.env.RESERVATION_TTL); // TTL trigger

  const result = await multi.exec();
  if (!result) retry();

  return { message: 'Product reserved for 10 minutes' };
};

exports.cancelReservation = async (userId, productId) => {
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;
  const reservedKey = `reserved:product:${productId}`;

  const quantity = await redis.get(dataKey);
  if (!quantity) throw new Error('No reservation found');

  const multi = redis.multi();
  multi.decrby(reservedKey, quantity);
  multi.del(dataKey);
  multi.del(ttlKey);
  await multi.exec();

  return { message: 'Reservation cancelled' };
};

exports.checkout = async (userId, productId) => {
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;
  const reservedKey = `reserved:product:${productId}`;

  const quantity = await redis.get(dataKey);
  if (!quantity) throw new Error('No reservation found');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);

    if (!product) throw new Error('Product not found');

    const qty = parseInt(quantity);

    if (product.soldStock + qty > product.totalStock) {
      throw new Error('Stock exceeded during checkout');
    }

    product.soldStock += qty;

    await product.save({ session });

    await Order.create([{
      userId,
      items: [{ productId, quantity }]
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const multi = redis.multi();
    multi.decrby(reservedKey, quantity);
    multi.del(dataKey);
    multi.del(ttlKey);
    await multi.exec();

    return { message: 'Checkout successful' };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
