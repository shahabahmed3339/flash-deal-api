require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initRedisExpiryListener } = require('./src/utils/redisExpiryListener');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  await initRedisExpiryListener();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
