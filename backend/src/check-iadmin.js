require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

async function checkIAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const email = 'iadmin@seedlms.com';
  const newPassword = 'Admin@1234';

  const user = await User.findOne({ email }).select('+password isActive isDeleted role');

  if (!user) {
    console.log(`❌ User ${email} NOT FOUND in database.`);
    // Let's see if there are ANY INSTITUTE_ADMINs
    const admins = await User.find({ role: 'INSTITUTE_ADMIN' }).select('email');
    console.log('Available INSTITUTE_ADMINs:', admins.map(a => a.email));
  } else {
    console.log(`✅ User ${email} FOUND!`);
    console.log(`- Role: ${user.role}`);
    console.log(`- isActive: ${user.isActive}`);
    console.log(`- isDeleted: ${user.isDeleted}`);

    // Reset the password just to be 100% sure
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isActive = true;
    user.isDeleted = false;
    await user.save();
    console.log(`🔑 Password forcibly reset to: ${newPassword}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

checkIAdmin().catch(console.error);
