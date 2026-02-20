const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  reservationKey: { type: String, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number
  }],
  status: { type: String, default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
