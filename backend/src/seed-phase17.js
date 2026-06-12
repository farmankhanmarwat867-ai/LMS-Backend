/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Seed Phase 17 — Report Card Management Module
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   Phase 14 → Exam (exam container)
 *   Phase 15 → ExamSchedules (subject schedules)
 *   Phase 16 → Results (published student results)
 *   Phase 8  → Users (students, teacher, admin)
 *   Phase 12 → Attendance (optional, for attendance summary)
 *
 * What this seed does:
 *   1. Resolves Exam, Admin, Students from existing Phase data
 *   2. Publishes all results (so they qualify for report card generation)
 *   3. Clears all existing report cards for a clean seed
 *   4. Generates DRAFT report cards (verifies ranking, attendance, GPA)
 *   5. Adds teacher comments to one DRAFT card
 *   6. Publishes one report card (locks it)
 *   7. Leaves others as DRAFT for testing
 *   8. Prints full Thunder Client test guide with live IDs
 *
 * Run: node src/seed-phase17.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User        = require('./models/User');
const Exam        = require('./models/Exam');
const ExamSchedule = require('./models/ExamSchedule');
const Result      = require('./models/Result');
const ReportCard  = require('./models/ReportCard');
const AuditLog    = require('./models/AuditLog');

const reportCardService = require('./services/reportCard.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

// ── Helpers ────────────────────────────────────────────────────────────────────
const line = (char = '─', len = 72) => char.repeat(len);
const pad  = (str, n = 24) => String(str).padEnd(n);

async function seedPhase17() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  console.log(line('═'));
  console.log('  PHASE 17 — Report Card Management Seed');
  console.log(line('═'));

  // ── 1. Resolve Exam ──────────────────────────────────────────────────────────
  const exam = await Exam.findOne({ isDeleted: false });
  if (!exam) {
    console.error('\n❌  No Exam found. Run seed-phase14.js first.');
    process.exit(1);
  }
  console.log(`\n📋  Target Exam : ${exam.title} (${exam.examCode})`);
  console.log(`    examId      : ${exam._id}`);
  console.log(`    sessionId   : ${exam.sessionId}`);

  // ── 2. Resolve Admin ─────────────────────────────────────────────────────────
  let admin = await User.findOne({
    role: 'INSTITUTE_ADMIN',
    instituteId: exam.instituteId,
    isDeleted: false,
  });
  if (!admin) {
    admin = await User.findOne({ role: 'INSTITUTE_ADMIN', isDeleted: false });
    if (!admin) {
      console.error('\n❌  Institute Admin not found. Run seed-phase8.js first.');
      process.exit(1);
    }
    admin.instituteId = exam.instituteId;
  }
  console.log(`\n👤  Admin       : ${admin.email} (${admin._id})`);

  // ── 3. Resolve Students ──────────────────────────────────────────────────────
  const students = await User.find({
    role: 'STUDENT',
    instituteId: admin.instituteId,
    isDeleted: false,
  }).limit(5);
  console.log(`\n🎓  Students found : ${students.length}`);

  // ── 4. Resolve Teacher ───────────────────────────────────────────────────────
  const teacher = await User.findOne({
    role: 'TEACHER',
    instituteId: admin.instituteId,
    isDeleted: false,
  });
  if (teacher) {
    console.log(`🧑‍🏫  Teacher found  : ${teacher.email}`);
  }

  // ── 5. Publish all Results for this institute ─────────────────────────────────
  console.log('\n📌  Publishing all results...');
  const schedules = await ExamSchedule.find({ examId: exam._id, isDeleted: false });
  const scheduleIds = schedules.map(s => s._id);

  if (scheduleIds.length === 0) {
    console.error('\n❌  No ExamSchedules found for this exam. Run seed-phase15.js first.');
    process.exit(1);
  }

  const publishResult = await Result.updateMany(
    {
      examScheduleId: { $in: scheduleIds },
      isDeleted: false,
    },
    {
      $set: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: admin._id,
      },
    }
  );
  console.log(`   ✅  Published ${publishResult.modifiedCount} result(s)`);

  const resultCount = await Result.countDocuments({
    examScheduleId: { $in: scheduleIds },
    isPublished: true,
    isDeleted: false,
  });
  if (resultCount === 0) {
    console.error('\n❌  No published results found. Run seed-phase16.js first.');
    process.exit(1);
  }
  console.log(`   📊  Total published results available : ${resultCount}`);

  // ── 6. Clear existing Report Cards ───────────────────────────────────────────
  const del = await ReportCard.deleteMany({ examId: exam._id });
  await AuditLog.deleteMany({
    action: {
      $in: [
        'REPORT_CARD_GENERATED', 'REPORT_CARD_UPDATED',
        'REPORT_CARD_COMMENT_ADDED', 'REPORT_CARD_PUBLISHED',
        'REPORT_CARD_UNPUBLISHED', 'REPORT_CARD_DOWNLOADED',
      ],
    },
  });
  console.log(`\n🧹  Cleared ${del.deletedCount} old Report Card(s)`);

  // ── 7. Generate DRAFT Report Cards ───────────────────────────────────────────
  console.log('\n⚙️  Generating Report Cards...');
  let genResult;
  try {
    genResult = await reportCardService.generateReportCards(exam._id, {}, admin);
    console.log(`   ✅  Generated ${genResult.generated} Report Card(s) [Status: DRAFT]`);
  } catch (err) {
    console.error('\n❌  Failed to generate:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }

  // ── 8. Fetch Generated Cards ─────────────────────────────────────────────────
  const cards = await ReportCard.find({ examId: exam._id }).sort({ percentage: -1 });
  if (cards.length === 0) {
    console.error('\n❌  No report cards generated. Check results.');
    process.exit(1);
  }

  // ── 9. Print Summary Table ───────────────────────────────────────────────────
  console.log(`\n📊  Report Card Summary:\n`);
  console.log(line('─'));
  console.log(`  ${pad('Student ID', 26)} ${pad('RC Number', 22)} ${pad('Pct', 8)} ${pad('Grade', 8)} ${pad('GPA', 6)} ${pad('Rank(Class)', 14)} Rank(Section)`);
  console.log(line('─'));
  for (const c of cards) {
    console.log(
      `  ${pad(c.studentId.toString(), 26)} ` +
      `${pad(c.reportCardNumber, 22)} ` +
      `${pad(c.percentage + '%', 8)} ` +
      `${pad(c.overallGrade, 8)} ` +
      `${pad(c.overallGPA, 6)} ` +
      `${pad('#' + c.rankInClass, 14)} ` +
      `#${c.rankInSection}`
    );
  }
  console.log(line('─'));

  // ── 10. Add Teacher Comments to first DRAFT card ─────────────────────────────
  const draftCard = cards.find(c => c.status === 'DRAFT');
  if (draftCard && teacher) {
    await reportCardService.addComments(
      draftCard._id,
      { teacherComments: 'Excellent performance! Keep up the great work. Looking forward to seeing continued progress.' },
      { ...teacher.toObject(), role: 'TEACHER', _id: teacher._id }
    );
    console.log(`\n💬  Teacher comments added to RC: ${draftCard.reportCardNumber}`);
  } else if (draftCard && !teacher) {
    // Use admin to add comments if no teacher
    await reportCardService.addComments(
      draftCard._id,
      {
        teacherComments: 'Student has shown remarkable dedication and understanding of the subject matter.',
        principalComments: 'Proud of the academic achievements. Continue to excel!',
      },
      { ...admin.toObject(), role: 'INSTITUTE_ADMIN', _id: admin._id }
    );
    console.log(`\n💬  Admin comments added to RC: ${draftCard.reportCardNumber}`);
  }

  // ── 11. Publish first report card ────────────────────────────────────────────
  const cardToPublish = cards[0];
  try {
    await reportCardService.publishReportCard(
      cardToPublish._id,
      { ...admin.toObject(), role: 'INSTITUTE_ADMIN', _id: admin._id }
    );
    console.log(`\n🔒  Published (Locked) RC: ${cardToPublish.reportCardNumber}`);
    console.log(`    Student: ${cardToPublish.studentId}  |  GPA: ${cardToPublish.overallGPA}  |  Rank: #${cardToPublish.rankInClass}`);
  } catch (err) {
    console.error('\n⚠️  Publish failed:', err.message);
  }

  // ── 12. Student and parent user refs ─────────────────────────────────────────
  const student1 = students[0];
  const student1Card = cards.find(c => String(c.studentId) === String(student1?._id));
  const draftCardForTest = cards.find(c => c.status === 'DRAFT') || cards[1];

  // ── 13. Thunder Client Cheat Sheet ───────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║       THUNDER CLIENT — PHASE 17 API TEST GUIDE                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Base URL : http://localhost:5000                                         ║
║  Auth     : Bearer <token>  from POST /api/auth/login                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ─── GENERATION ──────────────────────────────────────────────────────  ║
║                                                                          ║
║  ① POST   /api/report-cards/generate                                     ║
║      Role : INSTITUTE_ADMIN                                              ║
║      Body : { "examId": "${exam._id}" }  ║
║                                                                          ║
║  ─── READ ────────────────────────────────────────────────────────────  ║
║                                                                          ║
║  ② GET    /api/report-cards?examId=${exam._id}  ║
║      Role : INSTITUTE_ADMIN  (with ?status=DRAFT / ?status=PUBLISHED)   ║
║                                                                          ║
║  ③ GET    /api/report-cards/${cardToPublish._id}  ║
║      Role : Any (PUBLISHED → visible to all)                             ║
║                                                                          ║
║  ④ GET    /api/report-cards/student/${student1?._id || '<studentId>'}  ║
║      Role : STUDENT (own published only) / INSTITUTE_ADMIN (all)         ║
║                                                                          ║
║  ─── PDF STUB ────────────────────────────────────────────────────────  ║
║                                                                          ║
║  ⑤ GET    /api/report-cards/${cardToPublish._id}/pdf  ║
║      Role : Any  →  returns styled HTML report card                      ║
║                                                                          ║
║  ─── COMMENTS ────────────────────────────────────────────────────────  ║
║                                                                          ║
║  ⑥ PATCH  /api/report-cards/${draftCardForTest?._id || cardToPublish._id}/comments  ║
║      Role : TEACHER (or INSTITUTE_ADMIN)                                 ║
║      Body : { "teacherComments": "Well done!", "principalComments": "Keep it up!" }  ║
║                                                                          ║
║  ─── PUBLISH / UNPUBLISH ─────────────────────────────────────────────  ║
║                                                                          ║
║  ⑦ PATCH  /api/report-cards/${draftCardForTest?._id || cards[1]?._id}/publish  ║
║      Role : INSTITUTE_ADMIN  →  locks card, visible to students/parents  ║
║                                                                          ║
║  ⑧ PATCH  /api/report-cards/${cardToPublish._id}/unpublish  ║
║      Role : INSTITUTE_ADMIN  →  unlocks card for editing                 ║
║                                                                          ║
║  ─── RBAC TESTS ─────────────────────────────────────────────────────── ║
║                                                                          ║
║  ⑨ LOGIN as STUDENT  →  GET /api/report-cards/student/:studentId        ║
║      Expect: Only PUBLISHED cards in response                            ║
║                                                                          ║
║  ⑩ PATCH /api/report-cards/${cardToPublish._id}/comments  ║
║      Login as TEACHER  →  Expect: 403 Forbidden (card is locked)         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  SEED IDs                                                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  examId          : ${exam._id}           ║
║  Published RC    : ${cardToPublish._id}           ║
║  Draft RC        : ${draftCardForTest?._id || 'N/A (all published)   '}           ║
║  Student[0] ID   : ${student1?._id || 'N/A                   '}           ║
║  Total cards     : ${String(cards.length).padEnd(3)} (${cards.filter(c=>c.status==='PUBLISHED').length} published, ${cards.filter(c=>c.status==='DRAFT').length} draft)  ║
╚══════════════════════════════════════════════════════════════════════════╝`);

  await mongoose.disconnect();
  console.log('\n✅  Phase 17 seed complete.\n');
  process.exit(0);
}

seedPhase17().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
