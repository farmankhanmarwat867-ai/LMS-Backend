require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

function reqUpload(token, boundary, payload) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/files/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${token}`
      },
    };

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
    request.write(payload);
    request.end();
  });
}

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
  
  const student = await User.findOne({ role: 'STUDENT', isDeleted: false });

  if (!student) {
    console.error('Student not found in DB. Run seed scripts first.');
    process.exit(1);
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
  const studentTok = jwt.sign({ id: student._id, role: student.role, instituteId: student.instituteId, branchId: student.branchId }, JWT_SECRET, { expiresIn: '1h' });

  let fails = 0;

  console.log('\n── Phase 24: File Storage Tests ─────────────────────────────────\n');

  // 1. Upload File
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = 'Hello World! This is a test text file.';
  const payload = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="folder"\r\n\r\n` +
    `assignments\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="test-doc.txt"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${fileContent}\r\n` +
    `--${boundary}--\r\n`;

  const uploadReq = await reqUpload(studentTok, boundary, payload);
  if (!check(1, 'POST /api/files/upload', uploadReq.status, 201)) fails++;

  const fileId = uploadReq.body?.data?._id;

  // 2. List Files
  const listReq = await req('GET', '/api/files?folder=assignments', studentTok);
  if (!check(2, 'GET /api/files', listReq.status, 200, `Found: ${listReq.body?.data?.length || 0} files`)) fails++;

  // 3. Get File by ID
  if (fileId) {
    const getReq = await req('GET', `/api/files/${fileId}`, studentTok);
    if (!check(3, 'GET /api/files/:id', getReq.status, 200, `Type: ${getReq.body?.data?.fileType}`)) fails++;
  } else {
    console.log('  ⚠️  [03] Skipped (No file ID)');
  }

  // 4. Download File
  if (fileId) {
    const downloadReq = await req('GET', `/api/files/download/${fileId}`, studentTok);
    if (!check(4, 'GET /api/files/download/:id', downloadReq.status, 200, `Content downloaded successfully`)) fails++;
  } else {
    console.log('  ⚠️  [04] Skipped (No file ID)');
  }

  // 5. Delete File
  if (fileId) {
    const deleteReq = await req('DELETE', `/api/files/${fileId}`, studentTok);
    if (!check(5, 'DELETE /api/files/:id', deleteReq.status, 200)) fails++;
  } else {
    console.log('  ⚠️  [05] Skipped (No file ID)');
  }

  console.log('\n───────────────────────────────────────────────────────────────────');
  if (fails > 0) {
    console.log(`❌ ${fails} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All Phase 24 tests passed!');
    process.exit(0);
  }
}

run();
