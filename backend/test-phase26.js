require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

function req(method, path, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {},
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

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
  
  const superAdmin = await User.findOne({ role: 'SUPER_ADMIN', isDeleted: false });
  const instituteAdmin = await User.findOne({ role: 'INSTITUTE_ADMIN', isDeleted: false });
  const branchAdmin = await User.findOne({ role: 'BRANCH_ADMIN', isDeleted: false });

  if (!superAdmin || !instituteAdmin) {
    console.error('Admins not found in DB. Seed the DB or create users first.');
    process.exit(1);
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
  
  const saTok = jwt.sign({ id: superAdmin._id, role: superAdmin.role }, JWT_SECRET, { expiresIn: '1h' });
  const iaTok = jwt.sign({ id: instituteAdmin._id, role: instituteAdmin.role, instituteId: instituteAdmin.instituteId }, JWT_SECRET, { expiresIn: '1h' });
  
  // Create mock branch token if no branch admin exists
  const baTok = branchAdmin 
    ? jwt.sign({ id: branchAdmin._id, role: branchAdmin.role, instituteId: branchAdmin.instituteId, branchId: branchAdmin.branchId }, JWT_SECRET, { expiresIn: '1h' })
    : jwt.sign({ id: instituteAdmin._id, role: 'BRANCH_ADMIN', instituteId: instituteAdmin.instituteId, branchId: new mongoose.Types.ObjectId() }, JWT_SECRET, { expiresIn: '1h' });

  let fails = 0;

  console.log('\n── Phase 26: Advanced Analytics & BI Tests ──────────────────────\n');

  // 1. Platform Analytics (SUPER_ADMIN)
  const platReq = await req('GET', '/api/analytics/platform', saTok);
  if (!check(1, 'GET /api/analytics/platform', platReq.status, 200, `Students: ${platReq.body?.data?.totalStudents}`)) fails++;

  // 2. Institute Analytics (INSTITUTE_ADMIN)
  const instReq = await req('GET', '/api/analytics/institute', iaTok);
  if (!check(2, 'GET /api/analytics/institute', instReq.status, 200, `Attendance Avg: ${instReq.body?.data?.attendance?.averageRate}%`)) fails++;

  // 3. Branch Analytics (BRANCH_ADMIN)
  const branchReq = await req('GET', '/api/analytics/branch', baTok);
  if (!check(3, 'GET /api/analytics/branch', branchReq.status, 200, `Students in Branch: ${branchReq.body?.data?.totalStudents}`)) fails++;

  console.log('\n───────────────────────────────────────────────────────────────────');
  if (fails > 0) {
    console.log(`❌ ${fails} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All Phase 26 tests passed!');
    process.exit(0);
  }
}

run();
