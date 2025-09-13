const express = require('express');
const auth = require('../middleware/auth');

module.exports = (db, upload) => {
  const router = express.Router();

  // -----------------------------
  // Dashboard (for frontend)
  // -----------------------------
  router.get('/dashboard', auth, async (req, res) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const deposits = db.data.deposits.filter(d => d.userId === user.id);
    const withdrawals = (db.data.withdrawals || []).filter(w => w.userId === user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        totalDeposit: user.totalDeposit || 0,
        totalWithdraw: user.totalWithdraw || 0,
        totalInvest: user.totalInvest || 0,
        currentInvest: user.currentInvest || 0,
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length
      },
      deposits,
      withdrawals
    });
  });

  // -----------------------------
  // Create a new deposit
  // -----------------------------
  router.post('/deposit', auth, upload.single('screenshot'), async (req, res) => {
    const { amount, method } = req.body;

    if (!amount || !method) return res.status(400).json({ success: false, message: 'Amount and method are required' });

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 100 USD' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const adminInfo = db.data.admin || {};
    const newDeposit = {
      id: Date.now().toString(),
      userId: user.id,
      amount: depositAmount,
      method,
      status: 'pending',
      screenshot: req.file ? req.file.filename : null,
      wallet: method === 'BTC' ? adminInfo.btcAddress || '' : adminInfo.paypal || ''
    };

    db.data.deposits.push(newDeposit);
    await db.write();

    res.json({ success: true, message: 'Deposit created successfully', deposit: newDeposit });
  });

  // -----------------------------
  // POST /user/invest
  // -----------------------------
  router.post('/invest', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });

    const investAmount = parseFloat(amount);
    if (isNaN(investAmount) || investAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (investAmount > user.balance) return res.status(400).json({ message: 'Insufficient balance' });

    user.balance -= investAmount;
    user.totalInvest = (user.totalInvest || 0) + investAmount;
    user.currentInvest = (user.currentInvest || 0) + investAmount;

    await db.write();

    res.json({ message: 'Investment successful', user });
  });

  // -----------------------------
  // POST /user/withdraw
  // -----------------------------
  router.post('/withdraw', auth, async (req, res) => {
    const { amount, method, address } = req.body;

    if (!amount || !method || !address) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 150) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is $150' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (withdrawAmount > user.balance) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Deduct balance
    user.balance -= withdrawAmount;
    user.totalWithdraw = (user.totalWithdraw || 0) + withdrawAmount;

    // Add withdrawal record
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

    res.json({
      success: true,
      message: `Withdrawal of $${withdrawAmount.toFixed(2)} is pending approval`,
      balance: user.balance
    });
  });

  return router;
};