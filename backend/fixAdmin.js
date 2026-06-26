require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'educorelms7@gmail.com';
    const password = 'Lms@A1A2';

    let user = await User.findOne({ email });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (user) {
      console.log('User found. Updating password...');
      // By default Mongoose might run pre('save') hook which hashes the password again if we just do user.password = password.
      // So we will just use updateOne to bypass the hook and set the hashed password directly,
      // OR we just use user.save() but set the plaintext password and let the hook handle it.
      user.password = password; // The pre('save') hook in User.js will hash this
      user.role = 'SUPER_ADMIN';
      user.isActive = true;
      await user.save();
      console.log('Password updated successfully.');
    } else {
      console.log('User not found. Creating new SUPER_ADMIN...');
      user = new User({
        name: 'Super Admin',
        email: email,
        password: password, // Will be hashed by pre-save hook
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      await user.save();
      console.log('Super Admin created successfully.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixAdmin();
