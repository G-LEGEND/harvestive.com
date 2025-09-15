// middleware/auth.js
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_secret_key_here'; // Make sure this matches the one in routes/auth.js

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // decoded contains user ID and possibly isAdmin
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};