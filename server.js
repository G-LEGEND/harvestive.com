const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

async function main() {
  // Default DB data
  const defaultData = { 
    users: [], 
    deposits: [], 
    admin: { btcAddress: '', btcQR: '', paypal: '' } 
  };

  // Setup DB
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter, defaultData);
  await db.read();
  await db.write();

  // Create uploads/ if missing
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  const upload = multer({ storage });

  // Express setup
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(__dirname));
  app.use('/uploads', express.static(uploadDir));

  // Serve index.html as homepage
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // ✅ FIXED: Serve all .html files including /admin/*.html
  app.get(/^\/.*\.html$/, (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  });

  // Routes
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/user');
  const adminRoutes = require('./routes/admin');

  app.use('/auth', authRoutes(db));
  app.use('/user', userRoutes(db, upload));
  app.use('/admin', adminRoutes(db, upload));

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

main();
