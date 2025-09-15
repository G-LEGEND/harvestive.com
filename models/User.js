const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  totalWithdraw: { type: Number, default: 0 },
  totalInvest: { type: Number, default: 0 },
  currentInvest: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);