const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  qr: {
    type: String, // filename of uploaded QR image
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);