const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = (db) => {
  const router = express.Router();

  // -----------------------------
  // Multer setup for QR code upload
  // -----------------------------
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ storage });

  // -----------------------------
  // Middleware: Protect sensitive admin routes
  // -----------------------------
  function verifyAdmin(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token !== 'sholashola') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
  }

  // -----------------------------
  // GET /admin/dashboard
  // -----------------------------
  router.get('/dashboard', verifyAdmin, async (req, res) => {
    try {
      await db.read();
      const users = db.data.users || [];
      const deposits = db.data.deposits || [];

      const pendingDeposits = deposits
        .filter(d => !d.approved)
        .map(d => {
          const user = users.find(u => u.id === d.userId) || {};
          return { ...d, user };
        });

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
      const depositId = req.params.id;
      await db.read();
      const deposit = (db.data.deposits || []).find(d => d.id === depositId);

      if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
      if (deposit.approved) return res.status(400).json({ success: false, message: 'Deposit already approved' });

      deposit.approved = true;

      const user = db.data.users.find(u => u.id === deposit.userId);
      if (user) {
        user.balance = (user.balance || 0) + deposit.amount;
      }

      await db.write();
      res.json({ success: true, message: 'Deposit approved' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to approve deposit' });
    }
  });

  // -----------------------------
  // GET /admin/payment-methods/public (user access, no auth)
  // -----------------------------
  router.get('/payment-methods/public', async (req, res) => {
    try {
      await db.read();
      const methods = db.data.paymentMethods || [];
      const latestMethod = methods.length ? [methods[methods.length - 1]] : [];
      res.json({ success: true, methods: latestMethod });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to fetch methods' });
    }
  });

  // -----------------------------
  // GET /admin/payment-methods (admin view, optional auth)
  // -----------------------------
  router.get('/payment-methods', async (req, res) => {
    try {
      await db.read();
      res.json({ success: true, methods: db.data.paymentMethods || [] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to fetch methods' });
    }
  });

  // -----------------------------
  // POST /admin/payment-methods (save latest method only, no auth)
  // -----------------------------
  router.post('/payment-methods', upload.single('qr'), async (req, res) => {
    try {
      await db.read();
      const { name, address } = req.body;
      const qrFilename = req.file ? req.file.filename : null;

      if (!name || !address) {
        return res.status(400).json({ success: false, message: 'Name and address are required' });
      }

      // Save only the latest method
      db.data.paymentMethods = [{ id: Date.now().toString(), name, address, qr: qrFilename || '' }];

      await db.write();
      res.json({ success: true, message: 'Payment method saved (latest only)' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to save method' });
    }
  });

  return router;
};