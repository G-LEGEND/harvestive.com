// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = 'your_secret_key_here'; // 🔒 Make this stronger in production

module.exports = (upload) => { // Accept `upload` in case you add file uploads
  const router = express.Router();

  // -----------------------------
  // REGISTER
  // -----------------------------
  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword
      });

      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, SECRET_KEY, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          balance: newUser.balance
        },
        isAdmin: false
      });
    } catch (err) {
      console.error('❌ Registration error:', err);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // -----------------------------
  // LOGIN
  // -----------------------------
  router.post('/login', async (req, res) => {
    const { email, password, isAdmin } = req.body;

    // Admin login
    if (isAdmin) {
      const ADMIN_PASSWORD = 'sholashola'; // 🔐 Set a secure password
      const ADMIN_EMAIL = 'olaoluwaniko@gmail.com';

      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(400).json({ message: 'Invalid admin credentials' });
      }

      const token = jwt.sign({ id: 'admin', isAdmin: true }, SECRET_KEY, { expiresIn: '7d' });
      return res.json({ token, user: { id: 'admin', name: 'Admin' }, isAdmin: true });
    }

    // Normal user login
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          balance: user.balance
        },
        isAdmin: false
      });
    } catch (err) {
      console.error('❌ Login error:', err);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  return router;
};