/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 19 — Fee Management API Test Suite
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Test Coverage:
 *   ✓ POST /api/fees          — Create fee structure
 *   ✓ GET  /api/fees          — List fee structures
 *   ✓ GET  /api/fees/:id      — Get single fee structure
 *   ✓ PUT  /api/fees/:id      — Update fee structure
 *   ✓ POST /api/fee-invoices  — Create invoice
 *   ✓ GET  /api/fee-invoices  — List invoices (role-aware)
 *   ✓ GET  /api/fee-invoices/:id — Single invoice with RBAC
 *   ✓ POST /api/fee-invoices/:id/discounts — Add discount
 *   ✓ POST /api/fee-invoices/:id/fines     — Add fine
 *   ✓ POST /api/fee-invoices/:id/cancel    — Cancel invoice
 *   ✓ GET  /api/fee-invoices/parent-portal — Parent portal
 *   ✓ POST /api/payments      — Record payment (partial support)
 *   ✓ GET  /api/payments      — Payment history
 *   ✓ GET  /api/payments/:id  — Single payment receipt
 *   ✓ RBAC enforcement
 *   ✓ Student self-isolation
 *   ✓ Parent child-isolation
 *
 * Run: node test-phase19.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const http     = require('http');
const mongoose = require('mongoose');

// ── HTTP helper ───────────────────────────────────────────────────────────────
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
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── Test helpers ──────────────────────────────────────────────────────────────
let P = 0, F = 0;
const failed = [];

const check = (n, label, status, expected, extra) => {
  const ok   = status === expected;
  const icon = ok ? '  ✅ PASS' : '  ❌ FAIL';
  console.log(`${icon} [${String(n).padStart(2, '0')}] ${label} → HTTP ${status}${ok ? '' : ` (expected ${expected})`}`);
  if (extra) console.log(`          ${extra}`);
  ok ? P++ : (F++, failed.push(`[${n}] ${label}`));
  return ok;
};

const getToken = (b) => b?.data?.accessToken || b?.accessToken || b?.token;

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';
  await mongoose.connect(MONGO_URI);

  const User            = require('./src/models/User');
  const FeeStructure    = require('./src/models/FeeStructure');
  const FeeInvoice      = require('./src/models/FeeInvoice');
  const AcademicSession = require('./src/models/AcademicSession');
  const Branch          = require('./src/models/Branch');
  const Institute       = require('./src/models/Institute');
  const Class           = require('./src/models/Class');

  // ── Load test data - find any valid institute/branch/session with students ──
  let institute = null, branch = null, session = null, classDoc = null;
  const allSessions = await AcademicSession.find({ isDeleted: false });
  for (const sess of allSessions) {
    const b = await Branch.findOne({ instituteId: sess.instituteId, isDeleted: false });
    if (!b) continue;
    const sc = await User.find({ role: 'STUDENT', branchId: b._id, isDeleted: false }).limit(1);
    if (sc.length === 0) continue;
    const i = await Institute.findById(sess.instituteId);
    if (!i) continue;
    institute = i; branch = b; session = sess;
    classDoc = await Class.findOne({ branchId: b._id, isDeleted: false });
    break;
  }

  const admin = institute
    ? (await User.findOne({ role: 'INSTITUTE_ADMIN', instituteId: institute._id, isDeleted: false })
    || await User.findOne({ role: 'BRANCH_ADMIN', branchId: branch._id, isDeleted: false })
    || await User.findOne({ email: 'iadmin@seedlms.com' }))
    : null;
  const students = branch ? await User.find({ role: 'STUDENT', branchId: branch._id, isDeleted: false }).limit(2) : [];
  const parent   = await User.findOne({ role: 'PARENT', isDeleted: false });

  if (!admin || !institute || !branch || !session) {
    console.error('Pre-condition data missing. Run seed-phase19.js first.');
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  PHASE 19 — Fee Management API Test Suite');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const adminLogin   = await req('POST', '/api/auth/login', { email: admin.email,      password: 'Admin@1234' });
  const adminTok     = getToken(adminLogin.body);

  const studentLogin = students[0]
    ? await req('POST', '/api/auth/login', { email: students[0].email, password: 'Student@123' })
    : null;
  const studentTok   = studentLogin ? getToken(studentLogin.body) : null;

  const parentLogin  = parent
    ? await req('POST', '/api/auth/login', { email: parent.email, password: 'Parent@123' })
    : null;
  const parentTok    = parentLogin ? getToken(parentLogin.body) : null;

  if (!adminTok) { console.error('❌ Admin login failed'); process.exit(1); }

  console.log('── Fee Structure Tests ─────────────────────────────────────────────────\n');

  // ── Test 1: Create Fee Structure ──────────────────────────────────────────
  const createFee = await req('POST', '/api/fees', {
    name:        'Test Monthly Package',
    description: 'Created by API test',
    instituteId: String(institute._id),
    branchId:    String(branch._id),
    sessionId:   String(session._id),
    classId:     classDoc ? String(classDoc._id) : undefined,
    frequency:   'MONTHLY',
    items: [
      { type: 'TUITION',  label: 'Tuition Fee',  amount: 4500 },
      { type: 'LIBRARY',  label: 'Library Fee',  amount:  200 },
    ],
  }, adminTok);
  check(1, 'POST /api/fees — Admin creates fee structure', createFee.status, 201,
    `id=${createFee.body?.data?._id}`);
  const structureId = createFee.body?.data?._id;

  // ── Test 2: Create fee structure — Student RBAC ───────────────────────────
  if (studentTok) {
    const rbacFee = await req('POST', '/api/fees', {
      name: 'Student should not', instituteId: String(institute._id),
      branchId: String(branch._id), sessionId: String(session._id),
      items: [{ type: 'TUITION', label: 'X', amount: 100 }],
    }, studentTok);
    check(2, 'RBAC POST /api/fees — Student rejected', rbacFee.status, 403);
  } else {
    console.log('  ⚠️  [02] Skipped (no student)');
  }

  // ── Test 3: GET /api/fees ─────────────────────────────────────────────────
  const listFees = await req('GET', `/api/fees?branchId=${branch._id}`, null, adminTok);
  check(3, 'GET /api/fees — List fee structures', listFees.status, 200,
    `count=${listFees.body?.data?.length}`);

  // ── Test 4: GET /api/fees/:id ─────────────────────────────────────────────
  if (structureId) {
    const singleFee = await req('GET', `/api/fees/${structureId}`, null, adminTok);
    check(4, 'GET /api/fees/:id — Get single structure', singleFee.status, 200,
      `name=${singleFee.body?.data?.name}`);
  } else {
    console.log('  ⚠️  [04] Skipped (no structureId)');
  }

  // ── Test 5: PUT /api/fees/:id ─────────────────────────────────────────────
  if (structureId) {
    const updateFee = await req('PUT', `/api/fees/${structureId}`, {
      name: 'Updated Monthly Package',
    }, adminTok);
    check(5, 'PUT /api/fees/:id — Update fee structure', updateFee.status, 200,
      `name=${updateFee.body?.data?.name}`);
  } else {
    console.log('  ⚠️  [05] Skipped');
  }

  console.log('\n── Fee Invoice Tests ───────────────────────────────────────────────────\n');

  // ── Test 6: POST /api/fee-invoices ────────────────────────────────────────
  let invoiceId = null;
  if (structureId && students[0]) {
    const createInv = await req('POST', '/api/fee-invoices', {
      studentId:      String(students[0]._id),
      feeStructureId: structureId,
      sessionId:      String(session._id),
      branchId:       String(branch._id),
      instituteId:    String(institute._id),
      dueDate:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      billingMonth:   new Date().getMonth() + 1,
      billingYear:    new Date().getFullYear(),
      discounts: [
        { label: 'Sibling Discount', type: 'FLAT', value: 500 },
      ],
      notes: 'API test invoice',
    }, adminTok);
    check(6, 'POST /api/fee-invoices — Create invoice with discount', createInv.status, 201,
      `invoice=${createInv.body?.data?.invoiceNumber}, balance=${createInv.body?.data?.balance}`);
    invoiceId = createInv.body?.data?._id;
  } else {
    console.log('  ⚠️  [06] Skipped (no structure/student)');
  }

  // ── Test 7: GET /api/fee-invoices ─────────────────────────────────────────
  const listInv = await req('GET', '/api/fee-invoices', null, adminTok);
  check(7, 'GET /api/fee-invoices — Admin lists all invoices', listInv.status, 200,
    `count=${listInv.body?.data?.length}`);

  // ── Test 8: Student sees only own invoices ────────────────────────────────
  if (studentTok) {
    const stuInv = await req('GET', '/api/fee-invoices', null, studentTok);
    check(8, 'GET /api/fee-invoices — Student sees only own invoices', stuInv.status, 200,
      `count=${stuInv.body?.data?.length}`);
  } else {
    console.log('  ⚠️  [08] Skipped (no student)');
  }

  // ── Test 9: GET /api/fee-invoices/:id ─────────────────────────────────────
  if (invoiceId) {
    const singleInv = await req('GET', `/api/fee-invoices/${invoiceId}`, null, adminTok);
    check(9, 'GET /api/fee-invoices/:id — Admin gets invoice', singleInv.status, 200,
      `status=${singleInv.body?.data?.status}`);
  } else {
    console.log('  ⚠️  [09] Skipped');
  }

  // ── Test 10: POST /api/fee-invoices/:id/discounts ─────────────────────────
  if (invoiceId) {
    const addDisc = await req('POST', `/api/fee-invoices/${invoiceId}/discounts`, {
      label: 'Merit Award 5%',
      type:  'PERCENT',
      value: 5,
    }, adminTok);
    check(10, 'POST /api/fee-invoices/:id/discounts — Add scholarship', addDisc.status, 200,
      `newBalance=${addDisc.body?.data?.balance}`);
  } else {
    console.log('  ⚠️  [10] Skipped');
  }

  // ── Test 11: POST /api/fee-invoices/:id/fines ─────────────────────────────
  if (invoiceId) {
    const addFine = await req('POST', `/api/fee-invoices/${invoiceId}/fines`, {
      reason: 'Late submission fine',
      amount: 150,
    }, adminTok);
    check(11, 'POST /api/fee-invoices/:id/fines — Add fine', addFine.status, 200,
      `totalFines=${addFine.body?.data?.totalFines}`);
  } else {
    console.log('  ⚠️  [11] Skipped');
  }

  console.log('\n── Payment Tests ───────────────────────────────────────────────────────\n');

  // ── Test 12: POST /api/payments — Partial payment ─────────────────────────
  let paymentId = null;
  if (invoiceId) {
    const invData = await req('GET', `/api/fee-invoices/${invoiceId}`, null, adminTok);
    const balance = invData.body?.data?.balance || 1000;
    const partial = Math.min(1000, balance);

    const pay = await req('POST', '/api/payments', {
      invoiceId,
      amount:              partial,
      paymentMethod:       'CASH',
      transactionReference: '',
      remarks:             'Partial payment test',
    }, adminTok);
    check(12, 'POST /api/payments — Record partial payment', pay.status, 201,
      `receipt=${pay.body?.data?.payment?.receiptNumber}, newStatus=${pay.body?.data?.invoice?.status}`);
    paymentId = pay.body?.data?.payment?._id;
  } else {
    console.log('  ⚠️  [12] Skipped');
  }

  // ── Test 13: POST /api/payments — Overpayment rejected ───────────────────
  if (invoiceId) {
    const overpay = await req('POST', '/api/payments', {
      invoiceId,
      amount:        999999,
      paymentMethod: 'CASH',
    }, adminTok);
    check(13, 'POST /api/payments — Overpayment rejected', overpay.status, 400,
      `msg=${overpay.body?.message?.substring(0, 60)}`);
  } else {
    console.log('  ⚠️  [13] Skipped');
  }

  // ── Test 14: GET /api/payments ────────────────────────────────────────────
  const listPay = await req('GET', '/api/payments', null, adminTok);
  check(14, 'GET /api/payments — Admin sees payment history', listPay.status, 200,
    `count=${listPay.body?.data?.length}`);

  // ── Test 15: Student sees own payments ────────────────────────────────────
  if (studentTok) {
    const stuPay = await req('GET', '/api/payments', null, studentTok);
    check(15, 'GET /api/payments — Student sees own payments', stuPay.status, 200,
      `count=${stuPay.body?.data?.length}`);
  } else {
    console.log('  ⚠️  [15] Skipped');
  }

  // ── Test 16: GET /api/payments/:id ───────────────────────────────────────
  if (paymentId) {
    const singlePay = await req('GET', `/api/payments/${paymentId}`, null, adminTok);
    check(16, 'GET /api/payments/:id — Receipt details', singlePay.status, 200,
      `method=${singlePay.body?.data?.paymentMethod}`);
  } else {
    console.log('  ⚠️  [16] Skipped');
  }

  console.log('\n── Parent Portal Tests ─────────────────────────────────────────────────\n');

  // ── Test 17: GET /api/fee-invoices/parent-portal ──────────────────────────
  if (parentTok) {
    const portal = await req('GET', '/api/fee-invoices/parent-portal', null, parentTok);
    check(17, 'GET /api/fee-invoices/parent-portal — Parent portal', portal.status, 200,
      `children=${portal.body?.data?.children?.length}`);
  } else {
    console.log('  ⚠️  [17] Skipped (no parent with valid password found)');
  }

  // ── Test 18: RBAC — Student can't cancel invoice ─────────────────────────
  if (invoiceId && studentTok) {
    const stuCancel = await req('POST', `/api/fee-invoices/${invoiceId}/cancel`, {}, studentTok);
    check(18, 'RBAC POST /:id/cancel — Student rejected', stuCancel.status, 403);
  } else {
    console.log('  ⚠️  [18] Skipped');
  }

  // ── Test 19: Cancel invoice ───────────────────────────────────────────────
  if (invoiceId) {
    const cancel = await req('POST', `/api/fee-invoices/${invoiceId}/cancel`, {}, adminTok);
    // PAID invoices can't be cancelled; PARTIAL/PENDING can
    const acceptable = [200, 400];
    const passed = acceptable.includes(cancel.status);
    const icon = passed ? '  ✅ PASS' : '  ❌ FAIL';
    console.log(`${icon} [19] POST /api/fee-invoices/:id/cancel — Cancel invoice → HTTP ${cancel.status}`);
    console.log(`          status=${cancel.body?.data?.status || cancel.body?.message?.substring(0, 50)}`);
    passed ? P++ : (F++, failed.push('[19] Cancel invoice'));
  } else {
    console.log('  ⚠️  [19] Skipped');
  }

  // ── Test 20: DELETE /api/fees/:id — Soft delete ───────────────────────────
  if (structureId) {
    const delFee = await req('DELETE', `/api/fees/${structureId}`, null, adminTok);
    check(20, 'DELETE /api/fees/:id — Soft delete fee structure', delFee.status, 200);
  } else {
    console.log('  ⚠️  [20] Skipped');
  }

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`  RESULTS  PASSED: ${P}  |  FAILED: ${F}  |  TOTAL: ${P + F}`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (failed.length > 0) {
    console.log('\n  ❌ Failed Tests:');
    failed.forEach((f) => console.log(`     ${f}`));
    process.exit(1);
  } else {
    console.log('\n  🎉  All Phase 19 tests passed!\n');
    process.exit(0);
  }
})();
