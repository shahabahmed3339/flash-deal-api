const mongoose = require('mongoose');
const redis = require('../config/redis');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

const RESERVATION_LUA = `
local reservedKey = KEYS[1]
local dataKey = KEYS[2]
local ttlKey = KEYS[3]

local totalStock = tonumber(ARGV[1])
local soldStock = tonumber(ARGV[2])
local quantity = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local reserved = redis.call("GET", reservedKey)
if not reserved then reserved = 0 else reserved = tonumber(reserved) end

local available = totalStock - soldStock - reserved

if available < quantity then
  return -1
end

if redis.call("EXISTS", dataKey) == 1 then
  return -2
end

redis.call("INCRBY", reservedKey, quantity)
redis.call("SET", dataKey, quantity)
redis.call("SET", ttlKey, 1, "EX", ttl)

return 1
`;

exports.reserveProduct = async (userId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) throw new NotFoundError('Product not found');

  const reservedKey = `reserved:product:${productId}`;
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;

  const result = await redis.eval(
    RESERVATION_LUA,
    3,
    reservedKey,
    dataKey,
    ttlKey,
    product.totalStock,
    product.soldStock,
    quantity,
    process.env.RESERVATION_TTL
  );

  if (result === -1) throw new ConflictError('Not enough stock available');
  if (result === -2) throw new ConflictError('Product already reserved by user');

  return { message: 'Product reserved for 10 minutes' };
};

exports.cancelReservation = async (userId, productId) => {
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;
  const reservedKey = `reserved:product:${productId}`;

  const quantity = await redis.get(dataKey);
  if (!quantity) throw new BadRequestError('No reservation found');

  const qty = parseInt(quantity);

  await redis.multi()
    .decrby(reservedKey, qty)
    .del(dataKey)
    .del(ttlKey)
    .exec();

  return { message: 'Reservation cancelled' };
};

exports.checkout = async (userId, productId) => {
  const dataKey = `reservation:data:${userId}:${productId}`;
  const ttlKey = `reservation:ttl:${userId}:${productId}`;
  const reservedKey = `reserved:product:${productId}`;
  const reservationKey = `${userId}:${productId}`;

  const quantity = await redis.get(dataKey);
  if (!quantity) throw new BadRequestError('No active reservation found');

  const qty = parseInt(quantity);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingOrder = await Order.findOne({ reservationKey }).session(session);
    if (existingOrder) {
      await session.commitTransaction();
      session.endSession();
      return { message: 'Checkout already completed' };
    }

    const product = await Product.findById(productId).session(session);
    if (!product) throw new NotFoundError('Product not found');

    if (product.soldStock + qty > product.totalStock) {
      throw new ConflictError('Stock exceeded during checkout');
    }

    product.soldStock += qty;

    await product.save({ session });

    await Order.create([{
      userId,
      reservationKey,
      items: [{ productId, quantity: qty }]
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Cleanup Redis AFTER successful commit
    await redis.multi()
      .decrby(reservedKey, qty)
      .del(dataKey)
      .del(ttlKey)
      .exec();

    return { message: 'Checkout successful' };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
