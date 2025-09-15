// routes/admin.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Models
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const PaymentMethod = require('../models/PaymentMethod');

const router = express.Router();

// -----------------------------
// Multer setup for QR code upload
// -----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// -----------------------------
// Middleware: verifyAdmin using header token
// -----------------------------
function verifyAdmin(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token !== 'sholashola') {
    return res.status(401).json({ success: false, message: 'Unauthorized admin' });
  }
  next();
}

// -----------------------------
// GET /admin/dashboard
// -----------------------------
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    const deposits = await Deposit.find({ approved: false });

    const pendingDeposits = await Promise.all(
      deposits.map(async (d) => {
        const user = await User.findById(d.userId).lean();
        return { ...d.toObject(), user };
      })
    );

    res.json({ success: true, users, pendingDeposits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

// -----------------------------
// POST /admin/approve/:id
// -----------------------------
router.post('/approve/:id', verifyAdmin, async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    if (deposit.approved) return res.status(400).json({ success: false, message: 'Already approved' });

    deposit.approved = true;
    await deposit.save();

    const user = await User.findById(deposit.userId);
    if (user) {
      user.balance += deposit.amount;
      await user.save();
    }

    res.json({ success: true, message: 'Deposit approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to approve deposit' });
  }
});

// -----------------------------
// GET /admin/payment-methods/public
// -----------------------------
router.get('/payment-methods/public', async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ _id: -1 }).limit(1);
    res.json({ success: true, methods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch methods' });
  }
});

// -----------------------------
// GET /admin/payment-methods (admin view)
// -----------------------------
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ _id: -1 });
    res.json({ success: true, methods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch methods' });
  }
});

// -----------------------------
// POST /admin/payment-methods
// -----------------------------
router.post('/payment-methods', upload.single('qr'), async (req, res) => {
  try {
    const { name, address } = req.body;
    const qr = req.file ? req.file.filename : '';

    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and address are required' });
    }

    // Optional: clear old methods to only save the latest
    await PaymentMethod.deleteMany({});
    const method = new PaymentMethod({
      name,
      address,
      qr
    });
    await method.save();

    res.json({ success: true, message: 'Payment method saved', method });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save method' });
  }
});

module.exports = router;