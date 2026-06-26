require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

const ROLE_PASSWORDS = {
  SUPER_ADMIN: 'SuperAdmin@1234',
  INSTITUTE_ADMIN: 'Admin@1234',
  BRANCH_ADMIN: 'Admin@1234',
  TEACHER: 'Teacher@1234',
  STUDENT: 'Student@1234',
  PARENT: 'Parent@1234'
};

async function fixPasswords() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const users = await User.find({}).select('+password role email');
  console.log(`Found ${users.length} users in the database.`);

  for (const user of users) {
    const plainPassword = ROLE_PASSWORDS[user.role] || 'Testing@1234';
    
    // Hash password explicitly using bcrypt
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(plainPassword, salt);

    console.log(`Updating ${user.email} (${user.role}) with hashed password: ${hashed.substring(0, 15)}...`);
    
    // Use updateOne to bypass any schema hooks that might ignore non-modified or double-hash
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed,
          isActive: true,
          isDeleted: false,
          deletedAt: null
        }
      }
    );
  }

  console.log('\n✅ ALL PASSWORDS FIXED & HASHED DIRECTLY VIA UPDATEONE!\n');
  
  await mongoose.disconnect();
  process.exit(0);
}

fixPasswords().catch(console.error);
