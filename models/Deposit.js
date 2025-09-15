const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  method: String,
  status: { type: String, default: 'pending' },
  screenshot: String,
  wallet: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deposit', depositSchema);