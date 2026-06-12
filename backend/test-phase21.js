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
  
  // Find a parent who has children
  const parent = await User.findOne({ role: 'PARENT', isDeleted: false, parentOf: { $exists: true, $not: { $size: 0 } } });
  const teacher = await User.findOne({ email: 'teacher1@seedlms.com' });

  if (!parent || !teacher) {
    console.error('Parent (with children) or Teacher not found in DB. Run seed scripts first.');
    process.exit(1);
  }

  const parentLogin = await req('POST', '/api/auth/login', { email: parent.email, password: 'Parent@123' });
  const parentTok = parentLogin.body?.data?.accessToken || parentLogin.body?.accessToken;

  const teacherLogin = await req('POST', '/api/auth/login', { email: teacher.email, password: 'Teacher@123' });
  const teacherTok = teacherLogin.body?.data?.accessToken || teacherLogin.body?.accessToken;

  if (!parentTok || !teacherTok) {
    console.error('Failed to login:', parentLogin.status, teacherLogin.status);
    process.exit(1);
  }

  let childId = parent.parentOf[0].toString();
  let fails = 0;

  console.log('\n── Phase 21: Parent Portal & Communications Tests ───────────────────\n');

  // 1. Get Dashboard
  const dash = await req('GET', '/api/parent-portal/dashboard', null, parentTok);
  if (!check(1, 'GET /api/parent-portal/dashboard', dash.status, 200, `Children Count: ${dash.body?.data?.childrenCount}`)) fails++;

  // 2. Get Children
  const children = await req('GET', '/api/parent-portal/children', null, parentTok);
  if (!check(2, 'GET /api/parent-portal/children', children.status, 200, `Found: ${children.body?.data?.length} children`)) fails++;

  // 3. Get Child Attendance
  const att = await req('GET', `/api/parent-portal/children/${childId}/attendance`, null, parentTok);
  if (!check(3, 'GET /api/parent-portal/children/:id/attendance', att.status, 200, `Sessions: ${att.body?.data?.summary?.totalSessions}`)) fails++;

  // 4. Get Child Assignments
  const asg = await req('GET', `/api/parent-portal/children/${childId}/assignments`, null, parentTok);
  if (!check(4, 'GET /api/parent-portal/children/:id/assignments', asg.status, 200, `Assignments: ${asg.body?.data?.length || 0}`)) fails++;

  // 5. Get Child Results
  const resData = await req('GET', `/api/parent-portal/children/${childId}/results`, null, parentTok);
  if (!check(5, 'GET /api/parent-portal/children/:id/results', resData.status, 200, `Results: ${resData.body?.data?.length || 0}`)) fails++;

  // 6. Get Fees
  const fees = await req('GET', '/api/parent-portal/fees', null, parentTok);
  if (!check(6, 'GET /api/parent-portal/fees', fees.status, 200, `Invoices: ${fees.body?.data?.length || 0}`)) fails++;

  // 7. Send Message (Teacher to Parent)
  const msg = await req('POST', '/api/communication/messages', {
    receiverId: parent._id,
    subject: 'Student Progress',
    body: 'Your child is doing well in class.',
    relatedStudentId: childId,
  }, teacherTok);
  if (!check(7, 'POST /api/communication/messages (Teacher -> Parent)', msg.status, 201)) fails++;
  const msgId = msg.body?.data?._id;

  // 8. Get Messages (Parent Inbox)
  const inbox = await req('GET', '/api/communication/messages', null, parentTok);
  if (!check(8, 'GET /api/communication/messages (Inbox)', inbox.status, 200, `Messages: ${inbox.body?.data?.length || 0}`)) fails++;

  // 9. Mark Message Read
  if (msgId) {
    const read = await req('PATCH', `/api/communication/messages/${msgId}/read`, null, parentTok);
    if (!check(9, 'PATCH /api/communication/messages/:id/read', read.status, 200)) fails++;
  } else {
    console.log('  ⚠️  [09] Skipped (No message ID)');
  }

  // 10. Get Announcements
  const ann = await req('GET', '/api/communication/announcements', null, parentTok);
  if (!check(10, 'GET /api/communication/announcements', ann.status, 200, `Announcements: ${ann.body?.data?.length || 0}`)) fails++;

  console.log('\n───────────────────────────────────────────────────────────────────');
  if (fails > 0) {
    console.log(`❌ ${fails} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All Phase 21 tests passed!');
    process.exit(0);
  }
}

run();
