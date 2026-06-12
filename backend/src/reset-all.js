require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

async function resetAllUsers() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const users = await User.find({}).select('+password isActive isDeleted role email name');
  console.log(`Found ${users.length} users in the database.`);

  const list = [];

  for (const user of users) {
    const newPassword = ROLE_PASSWORDS[user.role] || 'Testing@1234';
    
    // Always generate a fresh salt and hash
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Ensure account is active and not deleted
    user.isActive = true;
    user.isDeleted = false;
    user.deletedAt = null;

    await user.save();
    
    list.push({
      role: user.role,
      name: user.name,
      email: user.email,
      password: newPassword
    });
  }

  console.log('\n✅ ALL USERS HAVE BEEN UPDATED AND ACTIVATED!\n');
  
  // Group by role for easy reading
  for (const role of Object.keys(ROLE_PASSWORDS)) {
    const roleUsers = list.filter(u => u.role === role);
    if (roleUsers.length > 0) {
      console.log(`\n--- ${role} ---`);
      roleUsers.forEach(u => {
        console.log(`Email:    ${u.email}`);
        console.log(`Password: ${u.password}`);
        console.log(`Name:     ${u.name}\n`);
      });
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

resetAllUsers().catch(console.error);
