const cartService = require('../services/cart.service');

exports.reserve = async (req, res, next) => {
  try {
    const { userId, items } = req.body;
    const result = await cartService.reserveProducts(userId, items);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { userId, productIds } = req.body;
    const result = await cartService.cancelReservations(userId, productIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const { userId, productIds } = req.body;
    const result = await cartService.checkout(userId, productIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
