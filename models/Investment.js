const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Investment', investmentSchema);