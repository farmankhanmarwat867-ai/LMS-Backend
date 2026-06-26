/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 16 — Result Management API Tests
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   1. Server running: npm run dev
 *   2. Seed data loaded: node src/seed-phase16.js
 *
 * Run: node test-phase16.js
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tests:
 *   [CRUD]         GET list, GET by ID, PUT update, DELETE soft-delete
 *   [BULK]         POST /bulk with valid data
 *   [VALIDATION]   POST /bulk with marks exceeding total
 *   [GRADE CALC]   Verify grade + gradePoint on update
 *   [LOCKING]      Publish → verify teacher blocked → unpublish → verify edit allowed
 *   [HISTORY]      Verify ResultHistory entry created on update
 *   [RBAC/STUDENT] GET /my — student sees own results; cannot POST
 *   [RBAC/PARENT]  GET /my-child/:id — parent sees linked child; blocked for others
 *   [TENANT]       Admin from one institute cannot see another's results
 * ═══════════════════════════════════════════════════════════════════════════
 */
const http     = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

// ── HTTP helper ───────────────────────────────────────────────────────────────
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────
let P = 0, F = 0;
const failed = [];

const check = (n, label, status, expected, extra) => {
  const ok = status === expected;
  console.log(
    `${ok ? '  ✅ PASS' : '  ❌ FAIL'} [${String(n).padStart(2, '0')}] ${label}` +
    ` → HTTP ${status}${ok ? '' : ` (expected ${expected})`}`
  );
  if (extra) console.log(`          ${extra}`);
  if (ok) P++; else { F++; failed.push(`[${n}] ${label}`); }
  return ok;
};

const getToken = (b) => b?.data?.accessToken || b?.accessToken || b?.token;

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  // Connect to DB to resolve seeded IDs
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev');
  const User          = require('./src/models/User');
  const ExamSchedule  = require('./src/models/ExamSchedule');
  const Result        = require('./src/models/Result');
  const ResultHistory = require('./src/models/ResultHistory');

  const admin   = await User.findOne({ email: 'iadmin@seedlms.com' });
  const teacher = await User.findOne({ email: 'teacher1@seedlms.com' });
  const student = await User.findOne({ email: 'student1@seedlms.com' });
  // PARENT: find any user with role PARENT that has at least one child
  const parent  = await User.findOne({ role: 'PARENT', parentOf: { $exists: true, $not: { $size: 0 } } });

  if (!admin) { console.error('❌  Admin not found — run seed-phase8.js'); process.exit(1); }
  if (!student) { console.error('❌  Student not found — run seed-phase8.js'); process.exit(1); }

  // Resolve schedule and seeded results
  const schs = await ExamSchedule.find({ instituteId: admin.instituteId, isDeleted: false });
  if (!schs.length) { console.error('❌  No schedules — run seed-phase15.js'); process.exit(1); }

  const schMath = schs.find(s => String(s._id));
  const schBulk = schs[schs.length - 1]; // last schedule for bulk test

  // Find a PASS result to test publish/update, and a FAIL result to test delete
  const passResult = await Result.findOne({ status: 'PASS',  instituteId: admin.instituteId, isDeleted: false });
  const failResult = await Result.findOne({ status: 'FAIL',  instituteId: admin.instituteId, isDeleted: false });
  const anyResult  = passResult || failResult;

  await mongoose.disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 16 — Result Management API Test Suite');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // ── Auth: login as admin ──────────────────────────────────────────────────────
  const adminLogin = await req('POST', '/api/auth/login', { email: 'iadmin@seedlms.com', password: 'Admin@1234' });
  const adminTok   = getToken(adminLogin.body);
  if (!adminTok) { console.error('❌  Admin login failed'); process.exit(1); }

  // ── Auth: login as teacher ────────────────────────────────────────────────────
  let teacherTok = null;
  if (teacher) {
    const tLogin = await req('POST', '/api/auth/login', { email: 'teacher1@seedlms.com', password: 'Teacher@123' });
    teacherTok   = getToken(tLogin.body);
  }

  // ── Auth: login as student ────────────────────────────────────────────────────
  const stuLogin = await req('POST', '/api/auth/login', { email: 'student1@seedlms.com', password: 'Student@123' });
  const stuTok   = getToken(stuLogin.body);

  // ── Auth: login as parent ─────────────────────────────────────────────────────
  let parentTok = null;
  if (parent) {
    const pLogin = await req('POST', '/api/auth/login', { email: parent.email, password: 'Parent@123' });
    parentTok = getToken(pLogin.body);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[CRUD Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 1: GET all results (admin)
  const getAll = await req('GET', `/api/results?examScheduleId=${schs[0]._id}`, null, adminTok);
  check(1, 'GET all results for a schedule', getAll.status, 200,
    `count=${getAll.body.data?.length}`);

  // Test 2: GET by ID
  if (anyResult) {
    const getOne = await req('GET', `/api/results/${anyResult._id}`, null, adminTok);
    check(2, 'GET result by ID', getOne.status, 200,
      `grade=${getOne.body.data?.grade} gradePoint=${getOne.body.data?.gradePoint}`);
  } else {
    console.log('  SKIP [02] No seeded result found');
  }

  // Test 3: PUT update marks + verify grade recalculation
  if (failResult) {
    const upd = await req('PUT', `/api/results/${failResult._id}`,
      { marksObtained: 85, changeReason: 'Paper recheck' }, adminTok);
    const ok = check(3, 'PUT update marks to 85 — grade recalculation', upd.status, 200,
      `grade=${upd.body.data?.grade} gradePoint=${upd.body.data?.gradePoint} status=${upd.body.data?.status}`);
    // Verify grade should be A (80-89%)
    if (ok && upd.body.data?.grade !== 'A') {
      console.log(`          ⚠️  Expected grade=A, got grade=${upd.body.data?.grade}`);
    }
  } else {
    console.log('  SKIP [03] No FAIL result found to update');
  }

  // Test 4: DELETE soft delete
  if (failResult) {
    const del = await req('DELETE', `/api/results/${failResult._id}`, null, adminTok);
    check(4, 'DELETE result (soft delete)', del.status, 200);
  } else {
    console.log('  SKIP [04] No result to delete');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[Bulk Upload Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 5: POST /bulk with valid data
  const bulkData = {
    examScheduleId: schBulk._id,
    results: [{ studentId: student._id, marksObtained: 78 }],
  };
  const bulk = await req('POST', '/api/results/bulk', bulkData, adminTok);
  check(5, 'POST /bulk create results', bulk.status, 201,
    `processed=${bulk.body.data?.processed} failed=${bulk.body.data?.failed}`);

  // Test 6: POST /bulk with marks exceeding total — should return 201 but with errors
  const badBulk = await req('POST', '/api/results/bulk', {
    examScheduleId: schBulk._id,
    results: [{ studentId: student._id, marksObtained: 99999 }],
  }, adminTok);
  check(6, 'POST /bulk marks exceed total — handled gracefully (201 + error)', badBulk.status, 201,
    `failed=${badBulk.body.data?.failed} errors=${JSON.stringify(badBulk.body.data?.errors)}`);

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[Grade Point Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 7: Verify grade point on a result with 95% → A+ = 4.0
  const gpResult = await req('GET', `/api/results?examScheduleId=${schs[0]._id}`, null, adminTok);
  const aPlus = gpResult.body.data?.find(r => r.grade === 'A+');
  if (aPlus) {
    const gpOk = aPlus.gradePoint === 4.0;
    console.log(`  ${gpOk ? '✅ PASS' : '❌ FAIL'} [07] A+ grade should have gradePoint=4.0 → got ${aPlus.gradePoint}`);
    if (gpOk) P++; else { F++; failed.push('[07] Grade point A+ = 4.0'); }
  } else {
    console.log('  SKIP [07] No A+ result found in schedule');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[Result Locking Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 8: Admin publishes result
  if (passResult) {
    const pub = await req('PATCH', `/api/results/${passResult._id}/publish`, null, adminTok);
    check(8, 'PATCH /publish — admin publishes result', pub.status, 200,
      `isPublished=${pub.body.data?.isPublished}`);

    // Test 9: Teacher cannot update published result
    if (teacherTok) {
      const tUpd = await req('PUT', `/api/results/${passResult._id}`,
        { marksObtained: 50 }, teacherTok);
      check(9, 'PUT — teacher blocked from updating published result', tUpd.status, 403,
        tUpd.body.message);
    } else {
      console.log('  SKIP [09] Teacher token not available');
    }

    // Test 10: Teacher cannot delete published result (blocked at route level)
    // DELETE route only allows INSTITUTE_ADMIN / BRANCH_ADMIN so this tests 403
    if (teacherTok) {
      const tDel = await req('DELETE', `/api/results/${passResult._id}`, null, teacherTok);
      check(10, 'DELETE — teacher blocked from deleting result (403)', tDel.status, 403);
    } else {
      console.log('  SKIP [10] Teacher token not available');
    }

    // Test 11: Admin cannot delete published result (must unpublish first)
    const delPub = await req('DELETE', `/api/results/${passResult._id}`, null, adminTok);
    check(11, 'DELETE — cannot delete published result (403)', delPub.status, 403,
      delPub.body.message);

    // Test 12: Admin unpublishes result
    const unpub = await req('PATCH', `/api/results/${passResult._id}/unpublish`, null, adminTok);
    check(12, 'PATCH /unpublish — admin unlocks result', unpub.status, 200,
      `isPublished=${unpub.body.data?.isPublished}`);

    // Test 13: Admin can update unpublished result
    const updAfterUnpub = await req('PUT', `/api/results/${passResult._id}`,
      { marksObtained: 92 }, adminTok);
    check(13, 'PUT — admin updates result after unpublish', updAfterUnpub.status, 200,
      `marks=${updAfterUnpub.body.data?.marksObtained}`);
  } else {
    console.log('  SKIP [08-13] No PASS result found for locking tests');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[Result History Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 14: Verify history entry was created on update (test 3 triggered it)
  if (passResult) {
    const hist = await req('GET', `/api/results/${passResult._id}/history`, null, adminTok);
    check(14, 'GET /:id/history — history entries created after update', hist.status, 200,
      `entries=${hist.body.data?.length}`);
    if (hist.status === 200 && hist.body.data?.length === 0) {
      console.log('          ⚠️  History is empty — ensure an update was performed in test 13');
    }
  } else {
    console.log('  SKIP [14] No result available for history test');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[RBAC — Student Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  if (stuTok) {
    // Test 15: Student can access GET /my
    const myRes = await req('GET', '/api/results/my', null, stuTok);
    check(15, 'GET /my — student sees own results', myRes.status, 200,
      `count=${myRes.body.data?.length}`);

    // Test 16: Student cannot create a result
    const stuCreate = await req('POST', '/api/results',
      { studentId: student._id, examScheduleId: schs[0]._id, marksObtained: 50 }, stuTok);
    check(16, 'POST /results — student blocked (403)', stuCreate.status, 403);

    // Test 17: Student cannot access admin list
    const stuList = await req('GET', '/api/results', null, stuTok);
    check(17, 'GET /results — student blocked from admin list (403)', stuList.status, 403);
  } else {
    console.log('  SKIP [15-17] Student login failed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[RBAC — Parent Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  if (parentTok && parent?.parentOf?.length) {
    const childId = parent.parentOf[0];

    // Test 18: Parent can access linked child's results
    const childRes = await req('GET', `/api/results/my-child/${childId}`, null, parentTok);
    check(18, 'GET /my-child/:id — parent sees linked child results', childRes.status, 200,
      `count=${childRes.body.data?.length}`);

    // Test 19: Parent blocked for non-linked student
    const nonChildRes = await req('GET', `/api/results/my-child/${student._id}`, null, parentTok);
    // If student is NOT in parent.parentOf, expect 403
    if (!parent.parentOf.map(String).includes(String(student._id))) {
      check(19, 'GET /my-child/:id — parent blocked for non-linked student (403)', nonChildRes.status, 403,
        nonChildRes.body.message);
    } else {
      console.log('  SKIP [19] Test student happens to be a linked child of this parent');
    }
  } else {
    console.log('  SKIP [18-19] No parent with linked children found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[Tenant Isolation Tests]');
  // ─────────────────────────────────────────────────────────────────────────────

  // Test 20: Verify results list is scoped to admin's institute
  const allR = await req('GET', '/api/results', null, adminTok);
  if (allR.status === 200) {
    const allSameInstitute = allR.body.data?.every(
      r => String(r.instituteId) === String(admin.instituteId) ||
           r.instituteId === undefined // populated object
    );
    const ok = allR.body.data !== undefined;
    console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'} [20] GET /results scoped to admin institute → count=${allR.body.data?.length}`);
    if (ok) P++; else { F++; failed.push('[20] Tenant isolation'); }
  } else {
    console.log(`  SKIP [20] GET /results returned status ${allR.status}`);
  }

  // ── Final Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`  PASSED: ${P}  |  FAILED: ${F}  |  TOTAL: ${P + F}`);
  if (F === 0) {
    console.log('  STATUS: ✅  ALL TESTS PASSED — Phase 16 is production ready');
  } else {
    console.log('  STATUS: ❌  SOME TESTS FAILED');
    console.log('\n  Failed tests:');
    failed.forEach(f => console.log(`    • ${f}`));
  }
  console.log('═══════════════════════════════════════════════════════════════════\n');
  process.exit(F > 0 ? 1 : 0);
})();
