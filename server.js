const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // LowDB v3+
const path = require('path');
const fs = require('fs');

async function main() {
  // Default data
  const defaultData = { 
    users: [], 
    deposits: [], 
    admin: { btcAddress: '', btcQR: '', paypal: '' } 
  };

  // Setup LowDB
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter, defaultData); // Pass default data here
  await db.read();
  await db.write();

  // Create uploads folder if it doesn't exist
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  // Multer setup for screenshot uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  const upload = multer({ storage });

  // Initialize Express
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // Import routes
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/user');
  const adminRoutes = require('./routes/admin');

  app.use('/auth', authRoutes(db));
  app.use('/user', userRoutes(db, upload));
  app.use('/admin', adminRoutes(db));

  // Start server
  app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}

// Run the async main function
main();
