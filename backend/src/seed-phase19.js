/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Seed — Phase 19: Fee Management
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Creates:
 *   • 2 Fee Structures (Monthly Tuition + Exam Fee)
 *   • 3 Fee Invoices (per student)
 *   • Discounts / Scholarships on some invoices
 *   • Fines on one overdue invoice
 *   • 2 Payments (one full, one partial)
 *
 * Run: node src/seed-phase19.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB    = require('./config/db');
const FeeStructure = require('./models/FeeStructure');
const FeeInvoice   = require('./models/FeeInvoice');
const { generateInvoiceNumber } = require('./models/FeeInvoice');
const Payment      = require('./models/Payment');
const { generateReceiptNumber } = require('./models/Payment');
const User         = require('./models/User');
const AcademicSession = require('./models/AcademicSession');
const Branch       = require('./models/Branch');
const Institute    = require('./models/Institute');
const Class        = require('./models/Class');

const log = (msg) => console.log(`  ${msg}`);
const ok  = (msg) => console.log(`  ✅ ${msg}`);
const err = (msg) => console.error(`  ❌ ${msg}`);

(async () => {
  await connectDB();
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  PHASE 19 — Fee Management Seed');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    // ── Load Existing Data ────────────────────────────────────────────────────
    // Find any institute that has both a session AND students
    let institute = null, branch = null, session = null, classDoc = null;

    const allSessions = await AcademicSession.find({ isDeleted: false });
    for (const sess of allSessions) {
      const b = await Branch.findOne({ instituteId: sess.instituteId, isDeleted: false });
      if (!b) continue;
      const students_check = await User.find({ role: 'STUDENT', branchId: b._id, isDeleted: false }).limit(1);
      if (students_check.length === 0) continue;
      const i = await Institute.findById(sess.instituteId);
      if (!i) continue;
      institute = i; branch = b; session = sess;
      classDoc = await Class.findOne({ branchId: b._id, isDeleted: false });
      break;
    }

    if (!institute || !branch || !session) { err('No usable institute/branch/session combo found.'); process.exit(1); }

    const admin = await User.findOne({ role: 'INSTITUTE_ADMIN', instituteId: institute._id, isDeleted: false })
      || await User.findOne({ role: 'BRANCH_ADMIN', branchId: branch._id, isDeleted: false })
      || await User.findOne({ email: 'iadmin@seedlms.com' });
    if (!admin) { err('No admin found. Run earlier seeds.'); process.exit(1); }

    const students = await User.find({ role: 'STUDENT', branchId: branch._id, isDeleted: false }).limit(3);
    if (students.length === 0) { err('No students found. Run earlier seeds.'); process.exit(1); }

    log(`Institute : ${institute.name}`);
    log(`Branch    : ${branch.name}`);
    log(`Session   : ${session.name}`);
    log(`Admin     : ${admin.email}`);
    log(`Students  : ${students.map(s => s.email).join(', ')}\n`);

    // ── Clean Previous Seed Data ──────────────────────────────────────────────
    await FeeStructure.deleteMany({ branchId: branch._id });
    await FeeInvoice.deleteMany({ branchId: branch._id });
    await Payment.deleteMany({ branchId: branch._id });
    log('Cleared previous Phase 19 data');

    // ── 1. Create Fee Structures ──────────────────────────────────────────────
    const monthlyStructure = await FeeStructure.create({
      name:        'Monthly Tuition Package',
      description: 'Standard monthly fee package for all classes',
      instituteId: institute._id,
      branchId:    branch._id,
      sessionId:   session._id,
      classId:     classDoc._id,
      frequency:   'MONTHLY',
      items: [
        { type: 'TUITION',   label: 'Monthly Tuition Fee',   amount: 5000 },
        { type: 'LIBRARY',   label: 'Library Maintenance',   amount:  300 },
        { type: 'TRANSPORT', label: 'Bus Route A Transport',  amount:  800, isOptional: true },
      ],
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    ok(`Fee Structure created: ${monthlyStructure.name} (total: ${monthlyStructure.totalAmount})`);

    const examStructure = await FeeStructure.create({
      name:        'Annual Exam Fee',
      description: 'One-time exam fee collected annually',
      instituteId: institute._id,
      branchId:    branch._id,
      sessionId:   session._id,
      classId:     classDoc._id,
      frequency:   'ANNUAL',
      items: [
        { type: 'EXAM',      label: 'Annual Examination Fee', amount: 1500 },
        { type: 'ADMISSION', label: 'Re-Admission Processing', amount:  200 },
        { type: 'CUSTOM',    label: 'Smart Card Fee',          amount:   50 },
      ],
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    ok(`Fee Structure created: ${examStructure.name} (total: ${examStructure.totalAmount})`);

    // ── 2. Generate Invoices ──────────────────────────────────────────────────
    const student1 = students[0];
    const student2 = students[1] || students[0];
    const student3 = students[2] || students[0];

    // Invoice 1 — Student 1, monthly, with a scholarship discount
    const inv1Items = monthlyStructure.items.map(i => ({
      feeItemId: i._id, type: i.type, label: i.label, amount: i.amount,
    }));
    const inv1Subtotal = inv1Items.reduce((s, i) => s + i.amount, 0);
    const discount1 = { label: 'Merit Scholarship 10%', type: 'PERCENT', value: 10, appliedAmount: inv1Subtotal * 0.1 };

    const invoice1 = await FeeInvoice.create({
      invoiceNumber:  await generateInvoiceNumber(),
      studentId:      student1._id,
      feeStructureId: monthlyStructure._id,
      sessionId:      session._id,
      instituteId:    institute._id,
      branchId:       branch._id,
      dueDate:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      billingMonth:   new Date().getMonth() + 1,
      billingYear:    new Date().getFullYear(),
      items:          inv1Items,
      subtotal:       inv1Subtotal,
      discounts:      [discount1],
      totalDiscount:  discount1.appliedAmount,
      totalFines:     0,
      totalAmount:    inv1Subtotal - discount1.appliedAmount,
      amountPaid:     0,
      balance:        inv1Subtotal - discount1.appliedAmount,
      status:         'PENDING',
      notes:          'Merit scholarship applied',
      createdBy:      admin._id,
      updatedBy:      admin._id,
    });
    ok(`Invoice 1: ${invoice1.invoiceNumber} — Student: ${student1.email} (PKR ${invoice1.totalAmount})`);

    // Invoice 2 — Student 2, exam fee, OVERDUE with fine
    const inv2Items = examStructure.items.map(i => ({
      feeItemId: i._id, type: i.type, label: i.label, amount: i.amount,
    }));
    const inv2Subtotal = inv2Items.reduce((s, i) => s + i.amount, 0);
    const fine1 = { reason: 'Late payment fine (30 days overdue)', amount: 200, addedBy: admin._id, addedAt: new Date() };

    const invoice2 = await FeeInvoice.create({
      invoiceNumber:  await generateInvoiceNumber(),
      studentId:      student2._id,
      feeStructureId: examStructure._id,
      sessionId:      session._id,
      instituteId:    institute._id,
      branchId:       branch._id,
      dueDate:        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days overdue
      billingMonth:   null,
      billingYear:    new Date().getFullYear(),
      items:          inv2Items,
      subtotal:       inv2Subtotal,
      discounts:      [],
      totalDiscount:  0,
      fines:          [fine1],
      totalFines:     fine1.amount,
      totalAmount:    inv2Subtotal + fine1.amount,
      amountPaid:     0,
      balance:        inv2Subtotal + fine1.amount,
      status:         'OVERDUE',
      notes:          'Past due — late fine applied',
      createdBy:      admin._id,
      updatedBy:      admin._id,
    });
    ok(`Invoice 2: ${invoice2.invoiceNumber} — Student: ${student2.email} OVERDUE (PKR ${invoice2.totalAmount})`);

    // Invoice 3 — Student 3, monthly, partially paid
    const inv3Items = monthlyStructure.items.map(i => ({
      feeItemId: i._id, type: i.type, label: i.label, amount: i.amount,
    }));
    const inv3Subtotal = inv3Items.reduce((s, i) => s + i.amount, 0);
    const partialPaid = 3000;

    const invoice3 = await FeeInvoice.create({
      invoiceNumber:  await generateInvoiceNumber(),
      studentId:      student3._id,
      feeStructureId: monthlyStructure._id,
      sessionId:      session._id,
      instituteId:    institute._id,
      branchId:       branch._id,
      dueDate:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingMonth:   new Date().getMonth() + 1,
      billingYear:    new Date().getFullYear(),
      items:          inv3Items,
      subtotal:       inv3Subtotal,
      discounts:      [],
      totalDiscount:  0,
      totalFines:     0,
      totalAmount:    inv3Subtotal,
      amountPaid:     partialPaid,
      balance:        inv3Subtotal - partialPaid,
      status:         'PARTIAL',
      notes:          'Partial payment received',
      createdBy:      admin._id,
      updatedBy:      admin._id,
    });
    ok(`Invoice 3: ${invoice3.invoiceNumber} — Student: ${student3.email} PARTIAL (PKR ${invoice3.balance} due)`);

    // ── 3. Record Payments ────────────────────────────────────────────────────
    // Payment against Invoice 1 (full payment)
    const payment1 = await Payment.create({
      receiptNumber:        await generateReceiptNumber(),
      invoiceId:            invoice1._id,
      studentId:            student1._id,
      instituteId:          institute._id,
      branchId:             branch._id,
      amount:               invoice1.totalAmount,
      paymentDate:          new Date(),
      paymentMethod:        'BANK_TRANSFER',
      transactionReference: 'TXN-2026-0001',
      remarks:              'Full payment received via bank transfer',
      status:               'VERIFIED',
      collectedBy:          admin._id,
      createdBy:            admin._id,
      updatedBy:            admin._id,
    });
    // Update Invoice 1 to PAID
    await FeeInvoice.findByIdAndUpdate(invoice1._id, {
      amountPaid: invoice1.totalAmount, balance: 0, status: 'PAID',
    });
    ok(`Payment 1: ${payment1.receiptNumber} — PKR ${payment1.amount} (${payment1.paymentMethod}) → Invoice PAID`);

    // Payment against Invoice 3 (the partial payment)
    const payment2 = await Payment.create({
      receiptNumber:        await generateReceiptNumber(),
      invoiceId:            invoice3._id,
      studentId:            student3._id,
      instituteId:          institute._id,
      branchId:             branch._id,
      amount:               partialPaid,
      paymentDate:          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      paymentMethod:        'CASH',
      transactionReference: '',
      remarks:              'Partial cash payment received at counter',
      status:               'VERIFIED',
      collectedBy:          admin._id,
      createdBy:            admin._id,
      updatedBy:            admin._id,
    });
    ok(`Payment 2: ${payment2.receiptNumber} — PKR ${payment2.amount} (CASH) → Invoice PARTIAL`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('  Phase 19 Seed Summary');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`  Fee Structures : 2 (Monthly Tuition + Annual Exam)`);
    console.log(`  Invoices       : 3 (PENDING w/Discount, OVERDUE w/Fine, PARTIAL)`);
    console.log(`  Payments       : 2 (Full Bank Transfer, Partial Cash)`);
    console.log('\n  🎉  Phase 19 seed complete!\n');

    process.exit(0);
  } catch (e) {
    err(`Seed failed: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
})();
