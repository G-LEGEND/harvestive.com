// db.js
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://pippinpaul069_db_user:73EIgekzqFE55mCP@<your-cluster-url>/harvestive?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Connected to MongoDB');
});

module.exports = mongoose;