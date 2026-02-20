const redis = require('../config/redis');

exports.initRedisExpiryListener = async () => {
  await redis.config('SET', 'notify-keyspace-events', 'Ex');

  const subscriber = redis.duplicate();
  await subscriber.psubscribe('__keyevent@0__:expired');

  subscriber.on('pmessage', async (_, __, key) => {
    if (!key.startsWith('reservation:ttl:')) return;

    const [, , userId, productId] = key.split(':');

    const dataKey = `reservation:data:${userId}:${productId}`;
    const reservedKey = `reserved:product:${productId}`;

    const quantity = await redis.get(dataKey);
    if (!quantity) return;

    const qty = parseInt(quantity);

    await redis.multi()
      .decrby(reservedKey, qty)
      .del(dataKey)
      .exec();

    console.log(`Reservation expired → Released ${qty}`);
  });
};
