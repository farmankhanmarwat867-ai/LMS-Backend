require('dotenv').config();
const mongoose = require('mongoose');
const authService = require('./services/auth.service');

const MONGO_URI = process.env.MONGO_URI;

async function testLogin() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const tests = [
    { email: 'iadmin@seedlms.com', password: 'Admin@1234' },
    { email: 'teacher1@seedlms.com', password: 'Teacher@1234' }, // Testing with the 4
    { email: 'teacher1@seedlms.com', password: 'Teacher@123' },  // Testing without the 4
  ];

  for (const t of tests) {
    try {
      const res = await authService.loginUser({
        email: t.email,
        password: t.password,
        ipAddress: '127.0.0.1',
        userAgent: 'test-script'
      });
      console.log(`✅ SUCCESS for ${t.email} with password "${t.password}"`);
    } catch (err) {
      console.log(`❌ FAILED for ${t.email} with password "${t.password}": ${err.message}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

testLogin().catch(console.error);
