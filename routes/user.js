const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Mongoose Models
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');

const router = express.Router();

// 📁 Multer setup for screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// -----------------------------
// GET /user/dashboard
// -----------------------------
router.get('/dashboard', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const deposits = await Deposit.find({ userId: user.id });
  const withdrawals = await Withdrawal.find({ userId: user.id });
  const investments = await Investment.find({ userId: user.id });

  res.json({ success: true, user, deposits, withdrawals, investments });
});

// -----------------------------
// POST /user/deposit
// -----------------------------
router.post('/deposit', auth, upload.single('screenshot'), async (req, res) => {
  const { amount, method } = req.body;
  const depositAmount = parseFloat(amount);
  if (!amount || !method || isNaN(depositAmount) || depositAmount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum deposit is 100 USD' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const deposit = new Deposit({
    userId: user.id,
    amount: depositAmount,
    method,
    status: 'pending',
    screenshot: req.file?.filename || '',
    createdAt: new Date()
  });

  await deposit.save();
  res.json({ success: true, message: 'Deposit submitted', deposit });
});

// -----------------------------
// POST /user/invest
// -----------------------------
router.post('/invest', auth, async (req, res) => {
  const { amount } = req.body;
  const investAmount = parseFloat(amount);

  if (!amount || isNaN(investAmount) || investAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid investment amount' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (investAmount > user.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }

  user.balance -= investAmount;
  user.totalInvest += investAmount;
  user.currentInvest += investAmount;
  await user.save();

  const investment = new Investment({
    userId: user.id,
    amount: investAmount,
    createdAt: new Date()
  });

  await investment.save();
  res.json({ success: true, message: 'Investment successful', user });
});

// -----------------------------
// POST /user/withdraw
// -----------------------------
router.post('/withdraw', auth, async (req, res) => {
  const { amount, method, address } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (!amount || !method || !address || isNaN(withdrawAmount) || withdrawAmount < 20000) {
    return res.status(400).json({ success: false, message: 'Minimum withdrawal is $20,000' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (withdrawAmount > user.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }

  user.balance -= withdrawAmount;
  user.totalWithdraw += withdrawAmount;
  await user.save();

  const withdrawal = new Withdrawal({
    userId: user.id,
    amount: withdrawAmount,
    method,
    address,
    status: 'pending',
    createdAt: new Date()
  });

  await withdrawal.save();
  res.json({ success: true, message: `Withdrawal of $${withdrawAmount.toLocaleString()} pending`, balance: user.balance });
});

module.exports = router;