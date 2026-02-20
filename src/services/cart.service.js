const mongoose = require('mongoose');
const redis = require('../config/redis');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { NotFoundError, ConflictError, BadRequestError, InternalServerError } = require('../utils/errors');

const MULTI_RESERVATION_LUA = `
-- KEYS: reserved keys for each product
-- ARGV:
-- 1 = itemCount
-- Then per item:
-- totalStock, soldStock, quantity, ttl, dataKey, ttlKey

local itemCount = tonumber(ARGV[1])
local argIndex = 2

-- 1️ Validate all items first
for i = 1, itemCount do
  local reservedKey = KEYS[i]
  local totalStock = tonumber(ARGV[argIndex])
  local soldStock = tonumber(ARGV[argIndex + 1])
  local quantity = tonumber(ARGV[argIndex + 2])
  local ttl = tonumber(ARGV[argIndex + 3])
  local dataKey = ARGV[argIndex + 4]
  local ttlKey = ARGV[argIndex + 5]

  if redis.call("EXISTS", dataKey) == 1 then
    return -2 -- Already reserved by this user
  end

  local reserved = redis.call("GET", reservedKey)
  if not reserved then reserved = 0 else reserved = tonumber(reserved) end

  local available = totalStock - soldStock - reserved

  if available < quantity then
    return -1
  end

  -- Move to next item (6 values per item)
  argIndex = argIndex + 6
end

-- 2️ Perform reservation
argIndex = 2
for i = 1, itemCount do
  local reservedKey = KEYS[i]
  local totalStock = tonumber(ARGV[argIndex])
  local soldStock = tonumber(ARGV[argIndex + 1])
  local quantity = tonumber(ARGV[argIndex + 2])
  local ttl = tonumber(ARGV[argIndex + 3])
  local dataKey = ARGV[argIndex + 4]
  local ttlKey = ARGV[argIndex + 5]

  redis.call("INCRBY", reservedKey, quantity)
  redis.call("SET", dataKey, quantity)
  redis.call("SET", ttlKey, 1, "EX", ttl)

  argIndex = argIndex + 6
end

return 1
`;

const MULTI_CANCEL_LUA = `
-- KEYS:
-- 1..N reservedKeys
-- N+1..2N dataKeys
-- 2N+1..3N ttlKeys

local itemCount = tonumber(ARGV[1])

-- Validate all exist first
for i=1,itemCount do
  if redis.call("GET", KEYS[itemCount + i]) == false then
    return -1
  end
end

-- Perform cancel
for i=1,itemCount do
  local reservedKey = KEYS[i]
  local dataKey = KEYS[itemCount + i]
  local ttlKey = KEYS[itemCount*2 + i]

  local quantity = tonumber(redis.call("GET", dataKey))

  redis.call("DECRBY", reservedKey, quantity)
  redis.call("DEL", dataKey)
  redis.call("DEL", ttlKey)
end

return 1
`;

exports.reserveProducts = async (userId, items) => {
  try {
    const products = await Product.find({
      _id: { $in: items.map(i => i.productId) }
    });

    if (products.length !== items.length) {
      throw new NotFoundError('One or more products not found');
    }

    const productMap = {};
    products.forEach(p => productMap[p._id] = p);

    const keys = [];
    const args = [];

    args.push(items.length);

    for (const item of items) {
      keys.push(`reserved:product:${item.productId}`);
    }

    for (const item of items) {
      const product = productMap[item.productId];

      args.push(
        product.totalStock,
        product.soldStock,
        item.quantity,
        process.env.RESERVATION_TTL,
        `reservation:data:${userId}:${item.productId}`,
        `reservation:ttl:${userId}:${item.productId}`
      );
    }

    const result = await redis.eval(
      MULTI_RESERVATION_LUA,
      keys.length,
      ...keys,
      ...args
    );

    if (result === -1) {
      throw new ConflictError('One or more items are out of stock');
    }

    if (result === -2) {
      throw new ConflictError('User already has a reservation for one or more items');
    }

    return { message: 'All products reserved for 10 minutes' };
  } catch (err) {
    throw new InternalServerError(err);
  }
};

exports.cancelReservations = async (userId, productIds) => {
  try {
    const keys = [];
    const args = [];

    args.push(productIds.length);

    for (const productId of productIds) {
      keys.push(`reserved:product:${productId}`);
    }

    for (const productId of productIds) {
      keys.push(`reservation:data:${userId}:${productId}`);
    }

    for (const productId of productIds) {
      keys.push(`reservation:ttl:${userId}:${productId}`);
    }

    const result = await redis.eval(
      MULTI_CANCEL_LUA,
      keys.length,
      ...keys,
      ...args
    );

    if (result === -1) {
      throw new BadRequestError('One or more reservations not found');
    }

    return { message: 'All reservations cancelled successfully' };
  } catch (err) {
    throw new InternalServerError(err);
  }
};

exports.checkout = async (userId, productIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const items = [];

    for (const productId of productIds) {
      const dataKey = `reservation:data:${userId}:${productId}`;
      const ttlKey = `reservation:ttl:${userId}:${productId}`;
      const reservedKey = `reserved:product:${productId}`;

      const quantity = await redis.get(dataKey);
      if (!quantity) {
        throw new BadRequestError('Missing reservation');
      }

      const qty = parseInt(quantity);

      const product = await Product.findById(productId).session(session);
      if (!product) throw new NotFoundError('Product not found');

      if (product.soldStock + qty > product.totalStock) {
        throw new ConflictError('Stock exceeded during checkout');
      }

      product.soldStock += qty;
      await product.save({ session });

      items.push({ productId, quantity: qty });
    }

    await Order.create([{
      userId,
      reservationKey: `${userId}:${Date.now()}`,
      items
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Cleanup Redis
    for (const productId of productIds) {
      const dataKey = `reservation:data:${userId}:${productId}`;
      const ttlKey = `reservation:ttl:${userId}:${productId}`;
      const reservedKey = `reserved:product:${productId}`;

      const qty = parseInt(await redis.get(dataKey));

      await redis.multi()
        .decrby(reservedKey, qty)
        .del(dataKey)
        .del(ttlKey)
        .exec();
    }

    return { message: 'Checkout successful' };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new InternalServerError(err);
  }
};
