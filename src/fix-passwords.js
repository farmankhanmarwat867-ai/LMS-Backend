require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

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

  const users = await User.find({}).select('+password isActive isDeleted role email');
  console.log(`Found ${users.length} users in the database.`);

  for (const user of users) {
    const plainPassword = ROLE_PASSWORDS[user.role] || 'Testing@1234';
    
    // Assign plain text password! 
    // The userSchema.pre('save') hook will hash it exactly once.
    user.password = plainPassword;
    user.isActive = true;
    user.isDeleted = false;
    user.deletedAt = null;

    await user.save();
  }

  console.log('\n✅ ALL PASSWORDS FIXED (Single Hashing Applied)!\n');
  
  await mongoose.disconnect();
  process.exit(0);
}

fixPasswords().catch(console.error);
