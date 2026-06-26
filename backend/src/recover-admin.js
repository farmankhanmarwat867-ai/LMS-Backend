require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;
const NEW_PASSWORD = 'SuperAdmin@1234';

async function recoverSuperAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected\n');

  // Find ALL super admins
  const admins = await User.find({ role: 'SUPER_ADMIN' }).select('name email isActive createdAt');

  if (admins.length === 0) {
    console.log('❌  No SUPER_ADMIN found in database.\n');
    console.log('👉  Creating a fresh SUPER_ADMIN...\n');

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(NEW_PASSWORD, salt);

    const newAdmin = await User.create({
      name:     'Super Admin',
      email:    'superadmin@lms.com',
      password: hashed,
      role:     'SUPER_ADMIN',
      isActive: true,
    });

    console.log('═══════════════════════════════════════════════');
    console.log('  ✅  SUPER_ADMIN CREATED');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Email    : ${newAdmin.email}`);
    console.log(`  Password : ${NEW_PASSWORD}`);
    console.log('═══════════════════════════════════════════════\n');

  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('  ✅  SUPER_ADMIN ACCOUNTS FOUND');
    console.log('═══════════════════════════════════════════════');
    admins.forEach((a, i) => {
      console.log(`\n  [${i + 1}] Name     : ${a.name}`);
      console.log(`       Email    : ${a.email}`);
      console.log(`       Active   : ${a.isActive}`);
      console.log(`       Created  : ${a.createdAt}`);
    });
    console.log('\n═══════════════════════════════════════════════');
    console.log('  🔑  Resetting ALL SUPER_ADMIN passwords to:');
    console.log(`      ${NEW_PASSWORD}`);
    console.log('═══════════════════════════════════════════════\n');

    // Reset password for all super admins
    const salt   = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(NEW_PASSWORD, salt);

    for (const admin of admins) {
      await User.findByIdAndUpdate(admin._id, {
        password: hashed,
        isActive: true,        // re-activate in case it was deactivated
        isDeleted: false,      // un-delete in case soft-deleted
        deletedAt: null,
      });
      console.log(`  ✅  Reset: ${admin.email}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  LOGIN WITH ANY ACCOUNT ABOVE USING:');
    console.log(`  Password : ${NEW_PASSWORD}`);
    console.log('═══════════════════════════════════════════════\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

recoverSuperAdmin().catch(err => {
  console.error('❌  Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
