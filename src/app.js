const express = require('express');
const rateLimit = require('express-rate-limit');
const cartRoutes = require('./routes/cart.routes');
const productRoutes = require('./routes/product.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();
app.use(express.json());

app.use(rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100
}));

app.get('/', (req, res) => {
  res.send("Hello World!");
})
app.use('/cart', cartRoutes);
app.use('/products', productRoutes);
app.use(errorHandler);

module.exports = app;
