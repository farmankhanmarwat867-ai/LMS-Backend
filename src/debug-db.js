require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const debug = async () => {
  await connectDB();
  const users = await User.find({}).select('+password');
  console.log('All users in DB:');
  users.forEach(u => {
    console.log(`Email: ${u.email}, Role: ${u.role}, PasswordHash: ${u.password}, IsActive: ${u.isActive}`);
  });
  process.exit(0);
};

debug();
