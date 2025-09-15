const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

module.exports = (db) => {
  const router = express.Router();

  // -----------------------------
  // File Upload Setup (Screenshots)
  // -----------------------------
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  const upload = multer({ storage });

  // -----------------------------
  // GET /user/dashboard
  // -----------------------------
  router.get('/dashboard', auth, async (req, res) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Include deposits, withdrawals, and investments for the user
    const deposits = (db.data.deposits || []).filter(d => d.userId === user.id);
    const withdrawals = (db.data.withdrawals || []).filter(w => w.userId === user.id);
    const investments = (db.data.investments || []).filter(i => i.userId === user.id);

    res.json({
      success: true,
      user,
      deposits,
      withdrawals,
      investments
    });
  });

  // -----------------------------
  // POST /user/deposit
  // -----------------------------
  router.post('/deposit', auth, upload.single('screenshot'), async (req, res) => {
    const { amount, method } = req.body;
    if (!amount || !method) return res.status(400).json({ success: false, message: 'Amount and method required' });

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 100 USD' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newDeposit = {
      id: Date.now().toString(),
      userId: user.id,
      amount: depositAmount,
      method,
      status: 'pending',
      screenshot: req.file ? req.file.filename : null,
      createdAt: new Date().toISOString()
    };

    db.data.deposits.push(newDeposit);
    await db.write();

    res.json({ success: true, message: 'Deposit submitted', deposit: newDeposit });
  });

  // -----------------------------
  // POST /user/invest
  // -----------------------------
  router.post('/invest', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount required' });

    const investAmount = parseFloat(amount);
    if (isNaN(investAmount) || investAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (investAmount > user.balance) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    user.balance -= investAmount;
    user.totalInvest = (user.totalInvest || 0) + investAmount;
    user.currentInvest = (user.currentInvest || 0) + investAmount;

    if (!db.data.investments) db.data.investments = [];
    db.data.investments.push({
      id: Date.now().toString(),
      userId: user.id,
      amount: investAmount,
      createdAt: new Date().toISOString()
    });

    await db.write();
    res.json({ success: true, message: 'Investment successful', user });
  });

  // -----------------------------
  // POST /user/withdraw
  // -----------------------------
  router.post('/withdraw', auth, async (req, res) => {
    const { amount, method, address } = req.body;
    if (!amount || !method || !address) return res.status(400).json({ success: false, message: 'All fields required' });

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 20000) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is $20,000' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (withdrawAmount > user.balance) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    user.balance -= withdrawAmount;
    user.totalWithdraw = (user.totalWithdraw || 0) + withdrawAmount;

    if (!db.data.withdrawals) db.data.withdrawals = [];
    db.data.withdrawals.push({
      id: Date.now().toString(),
      userId: user.id,
      amount: withdrawAmount,
      method,
      address,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    await db.write();
    res.json({ success: true, message: `Withdrawal of $${withdrawAmount.toLocaleString()} pending`, balance: user.balance });
  });

  return router;
};