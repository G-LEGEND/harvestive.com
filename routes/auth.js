// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_secret_key_here'; // 🔒 Change to a strong secret

module.exports = (db) => {
  const router = express.Router();

  // -----------------------------
  // REGISTER (Normal Users)
  // -----------------------------
  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) 
      return res.status(400).json({ message: 'All fields are required' });

    await db.read();
    const exists = db.data.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashed,
      balance: 0,
      totalDeposit: 0,
      totalWithdraw: 0,
      totalInvest: 0,
      currentInvest: 0
    };

    db.data.users.push(newUser);
    await db.write();

    const token = jwt.sign({ id: newUser.id }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser.id, name, email, balance: 0 }, isAdmin: false });
  });

  // -----------------------------
  // LOGIN (Users & Admin)
  // -----------------------------
  router.post('/login', async (req, res) => {
    const { email, password, isAdmin } = req.body;
    await db.read();

    // ---- Admin login (password only) ----
    if (isAdmin) {
      const ADMIN_PASSWORD = 'sholashola'; // Default password
      if (password !== ADMIN_PASSWORD) {
        return res.status(400).json({ message: 'Invalid admin password' });
      }

      const adminUser = {
        id: 'admin',
        name: 'Admin'
      };

      const token = jwt.sign({ id: adminUser.id, isAdmin: true }, SECRET_KEY, { expiresIn: '7d' });
      return res.json({ token, user: adminUser, isAdmin: true });
    }

    // ---- Normal user login ----
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = db.data.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, balance: user.balance }, isAdmin: false });
  });

  return router;
};