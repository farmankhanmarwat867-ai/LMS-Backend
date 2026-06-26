require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

function req(method, path, body = null, token = null) {
  return new Promise((resolve) => {
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

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    request.on('error', (err) => resolve({ status: 500, body: err.message }));
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

function check(id, title, actual, expected, extra = '') {
  if (actual === expected) {
    console.log(`  ✅ PASS [${String(id).padStart(2, '0')}] ${title} → HTTP ${actual}`);
    if (extra) console.log(`          ${extra}`);
  } else {
    console.log(`  ❌ FAIL [${String(id).padStart(2, '0')}] ${title} → HTTP ${actual} (expected ${expected})`);
    if (extra) console.log(`          ${extra}`);
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  const teacher = await User.findOne({ email: 'teacher1@seedlms.com' });
  const student = await User.findOne({ email: 'student1@seedlms.com' });

  if (!teacher || !student) {
    console.error('Teacher or Student not found. Run seeds first.');
    process.exit(1);
  }

  const teacherLogin = await req('POST', '/api/auth/login', { email: teacher.email, password: 'Teacher@123' });
  console.log('Teacher login:', teacherLogin.status, teacherLogin.body);
  const teacherTok = teacherLogin.body?.data?.accessToken || teacherLogin.body?.accessToken;

  const studentLogin = await req('POST', '/api/auth/login', { email: student.email, password: 'Student@123' });
  const studentTok = studentLogin.body?.data?.accessToken || studentLogin.body?.accessToken;

  console.log('\n── Phase 12 Tests ───────────────────────────────────────────────\n');

  // GET /api/attendance
  const list = await req('GET', '/api/attendance', null, teacherTok);
  check(1, 'GET /api/attendance', list.status, 200, `Found ${list.body?.data?.length || 0} records`);
  
  if (list.body?.data?.length > 0) {
    const recordId = list.body.data[0]._id;
    const single = await req('GET', `/api/attendance/${recordId}`, null, teacherTok);
    check(2, 'GET /api/attendance/:id', single.status, 200, `Topic: ${single.body?.data?.topic}`);
  }

  const stuRec = await req('GET', `/api/attendance/student/${student._id}`, null, studentTok);
  check(3, 'GET /api/attendance/student/:studentId', stuRec.status, 200, `Student history length: ${stuRec.body?.data?.history?.length || 0}`);

  process.exit(0);
}

run();
