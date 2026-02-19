const redis = require('../config/redis');

exports.initRedisExpiryListener = async () => {
  await redis.config('SET', 'notify-keyspace-events', 'Ex');

  const subscriber = redis.duplicate();
  await subscriber.psubscribe('__keyevent@0__:expired');

  subscriber.on('pmessage', async (_, __, key) => {
    if (key.startsWith('reservation:ttl:')) {

      const parts = key.split(':');
      const userId = parts[2];
      const productId = parts[3];

      const dataKey = `reservation:data:${userId}:${productId}`;
      const reservedKey = `reserved:product:${productId}`;
      const ttlKey = `reservation:ttl:${userId}:${productId}`;

      const quantity = await redis.get(dataKey);
      if (!quantity) return;

      const multi = redis.multi();
      multi.decrby(reservedKey, quantity);
      multi.del(dataKey);
      multi.del(ttlKey);
      await multi.exec();

      console.log(`Reservation expired → Released ${quantity} units`);
    }
  });
};
