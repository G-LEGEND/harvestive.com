const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Low, JSONFile } = require('lowdb');

// Setup Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup JSON DB
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files from all folders
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Serve homepage by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ Optional: fallback for undefined routes
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.status(404).send('HTML page not found');
  } else {
    next();
  }
});

// ✅ Import routes
const userRoutes = require('./routes/user')(db, upload);
const authRoutes = require('./routes/auth')(db);
const adminRoutes = require('./routes/admin')(db, upload);

// ✅ Use routes
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
