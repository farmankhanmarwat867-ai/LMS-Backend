require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

function req(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const request = http.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });

    request.on('error', (err) => resolve({ status: 500, body: err.message }));
    if (data) request.write(data);
    request.end();
  });
}

function check(id, title, actual, expected, extra = '') {
  if (actual === expected) {
    console.log(`  ✅ PASS [${String(id).padStart(2, '0')}] ${title} → HTTP ${actual}`);
    if (extra) console.log(`          ${extra}`);
    return true;
  } else {
    console.log(`  ❌ FAIL [${String(id).padStart(2, '0')}] ${title} → HTTP ${actual} (expected ${expected})`);
    if (extra) console.log(`          ${extra}`);
    return false;
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  
  const admin = await User.findOne({ role: 'INSTITUTE_ADMIN', isDeleted: false });
  const student = await User.findOne({ role: 'STUDENT', isDeleted: false });

  if (!admin || !student) {
    console.error('Admin or Student not found in DB. Run seed scripts first.');
    process.exit(1);
  }

  const bcrypt = require('bcryptjs');
  if (admin.password !== 'Admin@123') {
    admin.password = await bcrypt.hash('Admin@123', 10);
    await admin.save();
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
  
  const adminTok = jwt.sign({ id: admin._id, role: admin.role, instituteId: admin.instituteId, branchId: admin.branchId }, JWT_SECRET, { expiresIn: '1h' });
  const studentTok = jwt.sign({ id: student._id, role: student.role, instituteId: student.instituteId, branchId: student.branchId }, JWT_SECRET, { expiresIn: '1h' });

  if (!adminTok || !studentTok) {
    console.error('Failed to generate tokens');
    process.exit(1);
  }

  let fails = 0;

  console.log('\n── Phase 22: Notifications System Tests ─────────────────────────\n');

  // 1. Create Notification via Admin
  const createReq = await req('POST', '/api/notifications', {
    userId: student._id.toString(),
    type: 'ASSIGNMENT_CREATED',
    title: 'New Math Assignment',
    message: 'Please complete the algebra worksheet by Friday.',
    channels: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'] // All channels
  }, adminTok);
  
  if (!check(1, 'POST /api/notifications (Admin triggers to Student)', createReq.status, 201, `Error: ${JSON.stringify(createReq.body)}`)) fails++;
  
  const notifId = createReq.body?.data?.inApp?._id;

  // 2. Student fetches notifications
  const getReq = await req('GET', '/api/notifications', null, studentTok);
  if (!check(2, 'GET /api/notifications (Student fetches Inbox)', getReq.status, 200, `Notifications: ${getReq.body?.data?.length || 0}`)) fails++;

  // 3. Mark as read
  if (notifId) {
    const patchReq = await req('PATCH', `/api/notifications/${notifId}/read`, null, studentTok);
    if (!check(3, 'PATCH /api/notifications/:id/read', patchReq.status, 200)) fails++;
  } else {
    console.log('  ⚠️  [03] Skipped (No notification ID)');
  }

  console.log('\n───────────────────────────────────────────────────────────────────');
  if (fails > 0) {
    console.log(`❌ ${fails} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All Phase 22 tests passed!');
    process.exit(0);
  }
}

run();
