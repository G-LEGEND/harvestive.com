const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Low, JSONFile } = require('lowdb');

const app = express();
const PORT = process.env.PORT || 3000;

const dbFile = path.join(__dirname, 'db.json');
const uploadsDir = path.join(__dirname, 'uploads');

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Make sure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files including html, css, admin folder
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Optional fallback for missing html
app.get('/*.html', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      // file doesn't exist
      res.status(404).send('Page not found');
    } else {
      res.sendFile(filePath);
    }
  });
});

// Load routes only after db read
db.read().then(() => {
  // If route files exist
  try {
    const userRoutes = require('./routes/user')(db, upload);
    app.use('/user', userRoutes);
  } catch (e) {
    console.error('Error loading user routes:', e);
  }

  try {
    const authRoutes = require('./routes/auth')(db);
    app.use('/auth', authRoutes);
  } catch (e) {
    console.error('Error loading auth routes:', e);
  }

  try {
    const adminRoutes = require('./routes/admin')(db, upload);
    app.use('/admin', adminRoutes);
  } catch (e) {
    console.error('Error loading admin routes:', e);
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Error reading DB:', err);
  process.exit(1);
});
