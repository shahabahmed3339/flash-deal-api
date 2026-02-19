const cartService = require('../services/cart.service');

exports.reserve = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    const result = await cartService.reserveProduct(userId, productId, quantity);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;
    const result = await cartService.cancelReservation(userId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;
    const result = await cartService.checkout(userId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
