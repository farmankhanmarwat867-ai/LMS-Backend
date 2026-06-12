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

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
  
  const adminTok = jwt.sign({ id: admin._id, role: admin.role, instituteId: admin.instituteId, branchId: admin.branchId }, JWT_SECRET, { expiresIn: '1h' });
  const studentTok = jwt.sign({ id: student._id, role: student.role, instituteId: student.instituteId, branchId: student.branchId }, JWT_SECRET, { expiresIn: '1h' });

  let fails = 0;

  console.log('\n── Phase 23: Certificates & Transcripts Tests ───────────────────\n');

  // 1. Generate Certificate
  const createCertReq = await req('POST', '/api/certificates/generate', {
    studentId: student._id.toString(),
    type: 'MERIT',
    title: 'Certificate of Excellence',
    description: 'Awarded for outstanding academic performance in the current session.'
  }, adminTok);
  
  if (!check(1, 'POST /api/certificates/generate (Admin creates cert)', createCertReq.status, 201)) fails++;
  
  const certId = createCertReq.body?.data?._id;
  const certNum = createCertReq.body?.data?.certificateNumber;

  // 2. Fetch Certificate by ID (Public verification)
  if (certId) {
    const getCertReq = await req('GET', `/api/certificates/${certId}`);
    if (!check(2, 'GET /api/certificates/:id (Fetch by ID)', getCertReq.status, 200, `Signature: ${getCertReq.body?.data?.digitalSignature?.substring(0, 10)}...`)) fails++;
  } else {
    console.log('  ⚠️  [02] Skipped (No certificate ID)');
  }

  // 3. Fetch Certificate by Certificate Number (Public verification)
  if (certNum) {
    const getCertNumReq = await req('GET', `/api/certificates/${certNum}`);
    if (!check(3, 'GET /api/certificates/:certNum (Fetch by Cert Number)', getCertNumReq.status, 200)) fails++;
  } else {
    console.log('  ⚠️  [03] Skipped (No certificate Number)');
  }

  // 4. Get Student Transcript
  const getTransReq = await req('GET', `/api/transcripts/${student._id}`, null, studentTok);
  if (!check(4, 'GET /api/transcripts/:studentId (Student fetches transcript)', getTransReq.status, 200, `CGPA: ${getTransReq.body?.data?.academicSummary?.cgpa}`)) fails++;

  console.log('\n───────────────────────────────────────────────────────────────────');
  if (fails > 0) {
    console.log(`❌ ${fails} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All Phase 23 tests passed!');
    process.exit(0);
  }
}

run();
