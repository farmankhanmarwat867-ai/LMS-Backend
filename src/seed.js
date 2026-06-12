require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (existingAdmin) {
      console.log('✅ SUPER_ADMIN already exists:');
      console.log(`   Email : ${existingAdmin.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@lms.com',
      password: 'Admin@123',
      role: 'SUPER_ADMIN',
      isActive: true,
    });

    console.log('🌱 Enterprise SUPER_ADMIN seeded successfully!');
    console.log(`   Email    : admin@lms.com`);
    console.log(`   Password : Admin@123`);
    console.log(`   Role     : ${admin.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
