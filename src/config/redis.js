const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Log when Redis successfully connects
redis.on('ready', () => console.log('Redis connected'));

// Log any connection errors
redis.on('error', (err) => console.error('Redis connection error:', err));

module.exports = redis;
