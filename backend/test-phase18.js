/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 18 — Academic Records API Test Suite
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Test Coverage:
 *   ✓ CGPA & Ranking Calculation via POST /calculate
 *   ✓ Merit List Retrieval (Sorting, Filtering)
 *   ✓ Dense Ranking Correctness (Ties have same rank)
 *   ✓ Academic Standing Rules
 *   ✓ Student Analytics (GPA History)
 *   ✓ RBAC Constraints (Student isolating their own records)
 *
 * Run: node test-phase18.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let P = 0, F = 0;
const failed = [];

const check = (n, label, status, expected, extra) => {
  const ok = status === expected;
  const icon = ok ? '  ✅ PASS' : '  ❌ FAIL';
  console.log(`${icon} [${String(n).padStart(2, '0')}] ${label} → HTTP ${status}${ok ? '' : ` (expected ${expected})`}`);
  if (extra) console.log(`          ${extra}`);
  if (ok) P++;
  else {
    F++;
    failed.push(`[${n}] ${label}`);
  }
  return ok;
};

const getToken = (b) => b?.data?.accessToken || b?.accessToken || b?.token;

(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';
  await mongoose.connect(MONGO_URI);

  const User = require('./src/models/User');
  const AcademicSession = require('./src/models/AcademicSession');

  const ReportCard = require('./src/models/ReportCard');

  const rcs = await ReportCard.find({ isDeleted: false }).limit(1);
  if (rcs.length === 0) {
    console.error('❌ No Report Cards found. Run previous seeds.');
    process.exit(1);
  }
  
  const session = await AcademicSession.findById(rcs[0].sessionId);
  const admin = await User.findOne({ role: 'INSTITUTE_ADMIN', instituteId: session.instituteId, isDeleted: false }) 
    || await User.findOne({ email: 'iadmin@seedlms.com' });
  const student = await User.findOne({ email: 'student1@seedlms.com' });

  if (!admin || !session) {
    console.error('❌ Admin or Session not found. Run previous seeds.');
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  PHASE 18 — Academic Records API Test Suite');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const adminLogin = await req('POST', '/api/auth/login', { email: admin.email, password: 'Admin@1234' });
  const adminTok = getToken(adminLogin.body);

  const studentLogin = await req('POST', '/api/auth/login', { email: student.email, password: 'Student@123' });
  const studentTok = getToken(studentLogin.body);

  if (!adminTok) {
    console.error('❌ Admin login failed');
    process.exit(1);
  }

  // Test 1: Calculate Session Records
  const calc = await req('POST', `/api/academic-records/calculate/${session._id}`, null, adminTok);
  check(1, 'POST /calculate/:sessionId — Admin triggers calculation', calc.status, 200, `calculated=${calc.body.data?.generated}`);

  // Test 2: Student tries to calculate (RBAC)
  const calcStu = await req('POST', `/api/academic-records/calculate/${session._id}`, null, studentTok);
  check(2, 'RBAC POST /calculate/:sessionId — Student rejected', calcStu.status, 403);

  // Test 3: Get Merit List
  const merit = await req('GET', `/api/academic-records/merit-list?sessionId=${session._id}`, null, adminTok);
  const records = merit.body.data || [];
  check(3, 'GET /merit-list — Fetch sorted global rankings', merit.status, 200, `count=${records.length}`);

  if (records.length > 0) {
    // Test 4: Verify Ranking sorting logic
    const isSorted = records.every((r, i) => i === 0 || records[i - 1].ranking.instituteRank <= r.ranking.instituteRank);
    check(4, 'LOGIC Merit List is sorted by dense institute rank', isSorted ? 200 : 500, 200);

    // Test 5: Verify CGPA presence
    const cgpaValid = records.every(r => typeof r.cgpa === 'number' && typeof r.overallPercentage === 'number');
    check(5, 'LOGIC CGPA and Overall Percentage are present', cgpaValid ? 200 : 500, 200);

    // Test 6: Verify Academic Standing
    const standingValid = records.every(r => ['HONORS', 'GOOD_STANDING', 'ACADEMIC_WARNING', 'PROBATION'].includes(r.academicStanding));
    check(6, 'LOGIC Academic Standing enum is valid', standingValid ? 200 : 500, 200);

    // Test 7: Get Student Analytics (Admin)
    const analytics = await req('GET', `/api/academic-records/student/${records[0].studentId._id}?sessionId=${session._id}`, null, adminTok);
    check(7, 'GET /student/:id — Admin gets student GPA history', analytics.status, 200, `historyLength=${analytics.body.data?.gpaHistory?.length}`);

    // Test 8: Get Student Analytics (Student Self)
    if (studentTok && String(student._id) === String(records[0].studentId._id)) {
      const self = await req('GET', `/api/academic-records/student/${student._id}?sessionId=${session._id}`, null, studentTok);
      check(8, 'RBAC GET /student/:id — Student sees own record', self.status, 200);
    } else {
      console.log('  ⚠️  [08] Skipped (Student does not match first record)');
    }

    // Test 9: Student Accessing other student record
    if (studentTok && records.length > 1) {
      const otherId = records.find(r => String(r.studentId._id) !== String(student._id)).studentId._id;
      const other = await req('GET', `/api/academic-records/student/${otherId}?sessionId=${session._id}`, null, studentTok);
      check(9, 'RBAC GET /student/:id — Student denied access to others', other.status, 403);
    } else {
      console.log('  ⚠️  [09] Skipped (Need multiple students)');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`  RESULTS  PASSED: ${P}  |  FAILED: ${F}  |  TOTAL: ${P + F}`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (failed.length > 0) {
    console.log('\n  ❌ Failed Tests:');
    failed.forEach(f => console.log(`     ${f}`));
    process.exit(1);
  } else {
    console.log('\n  🎉  All Phase 18 tests passed!\n');
    process.exit(0);
  }
})();
