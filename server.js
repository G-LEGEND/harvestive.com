const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 🔑 MongoDB URI
const MONGO_URI = 'mongodb+srv://pippinpaul069_db_user:73EIgekzqFE55mCP@cluster0.plv2fiy.mongodb.net/harvestive?retryWrites=true&w=majority';

async function main() {
  // 🔌 Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // 📁 Ensure uploads/ directory exists
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  // 📷 Multer setup for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  const upload = multer({ storage });

  // 🚀 Express app setup
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 🌐 Serve static files and uploads
  app.use(express.static(__dirname));
  app.use('/uploads', express.static(uploadDir));

  // 🔧 Serve HTML frontend pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get(/^\/.*\.html$/, (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  });

  // 📦 Load routes
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/user');
  const adminRoutes = require('./routes/admin');

  app.use('/auth', authRoutes(upload));
  app.use('/user', userRoutes(upload));
  app.use('/admin', adminRoutes(upload));

  // ✅ Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

main();