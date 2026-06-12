/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Seed Phase 16 — Result Management Module
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   Phase 10 → Enrollments (students enrolled in course)
 *   Phase 14 → Exam (exam container)
 *   Phase 15 → ExamSchedule (schedules for Math, Science, English, Urdu, CS)
 *
 * What this seed does:
 *   1. Resolves exam schedules, students, course, and admin
 *   2. Aligns students to match schedule class/section/branch/institute
 *   3. Ensures active enrollment exists for each student in the course
 *   4. Creates diverse Results: PASS (A+), FAIL, ABSENT, WITHHELD, INCOMPLETE
 *   5. Clears previous Phase 16 data before seeding
 *   6. Prints a Thunder Client cheat-sheet with live IDs
 *
 * Run: node src/seed-phase16.js
 * ═══════════════════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('./models/User');
const ExamSchedule  = require('./models/ExamSchedule');
const Enrollment    = require('./models/Enrollment');
const Subject       = require('./models/Subject'); // required for ExamSchedule populate
const Result        = require('./models/Result');
const ResultHistory = require('./models/ResultHistory');
const AuditLog      = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

// ── Helpers ────────────────────────────────────────────────────────────────────
const line = (char = '─', len = 72) => char.repeat(len);

/**
 * Grade / GPA calculation — mirrors result.service.js logic exactly.
 * Keep both in sync if the scale changes.
 */
const GRADE_SCALE = [
  { min: 90, grade: 'A+', gradePoint: 4.0 },
  { min: 80, grade: 'A',  gradePoint: 3.7 },
  { min: 70, grade: 'B',  gradePoint: 3.0 },
  { min: 60, grade: 'C',  gradePoint: 2.0 },
  { min: 50, grade: 'D',  gradePoint: 1.0 },
  { min: 40, grade: 'E',  gradePoint: 0.5 },
  { min: 0,  grade: 'F',  gradePoint: 0.0 },
];

const calcGradeAndStatus = (marks, total, passing, explicitStatus = null) => {
  if (explicitStatus && ['ABSENT', 'WITHHELD', 'INCOMPLETE'].includes(explicitStatus)) {
    return { percentage: 0, grade: 'F', gradePoint: 0.0, status: explicitStatus };
  }
  const percentage = parseFloat(((marks / total) * 100).toFixed(2));
  const status     = marks >= passing ? 'PASS' : 'FAIL';
  const match      = GRADE_SCALE.find(s => percentage >= s.min);
  return { percentage, grade: match.grade, gradePoint: match.gradePoint, status };
};

// ── Main Seed Function ─────────────────────────────────────────────────────────
async function seedPhase16() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  console.log(line('═'));
  console.log('  PHASE 16 — Result Management Seed Script');
  console.log(line('═'));

  // ── 1. Resolve ExamSchedules first (source of truth for instituteId) ───────────
  const schedules = await ExamSchedule.find({ isDeleted: false }).populate('subjectId');
  if (!schedules.length) {
    console.error('\n❌  No ExamSchedules found. Run seed-phase15.js first.\n');
    process.exit(1);
  }
  const scheduleInstituteId = schedules[0].instituteId;

  // ── 2. Resolve Admin for that institute ──────────────────────────────────────
  let admin = await User.findOne({
    role: 'INSTITUTE_ADMIN',
    instituteId: scheduleInstituteId,
    isDeleted: false,
  });
  if (!admin) {
    // Fallback: find any INSTITUTE_ADMIN and attach the correct instituteId
    admin = await User.findOne({ role: 'INSTITUTE_ADMIN', isDeleted: false });
    if (!admin) {
      console.error('\n❌  Institute Admin not found. Run seed-phase8.js first.\n');
      process.exit(1);
    }
    admin.instituteId = scheduleInstituteId;
    console.log(`   ⚡  Admin instituteId overridden from schedule: ${admin.instituteId}`);
  }
  console.log(`\n👤  Admin : ${admin.email} (instituteId: ${admin.instituteId})`);

  const schMath = schedules.find(s => s.subjectId?.code === 'MATH-P15');
  const schSci  = schedules.find(s => s.subjectId?.code === 'SCI-P15');
  const schEng  = schedules.find(s => s.subjectId?.code === 'ENG-P15');
  const schUrd  = schedules.find(s => s.subjectId?.code === 'URD-P15');
  const schCS   = schedules.find(s => s.subjectId?.code === 'CS-P15');

  if (!schMath || !schSci || !schEng) {
    console.error('\n❌  Required subjects (MATH-P15, SCI-P15, ENG-P15) not found. Run seed-phase15.js.\n');
    process.exit(1);
  }

  // Use Math schedule as the reference for class/section/branch/course
  const refSchedule = schMath;
  console.log(`\n📋  Reference schedule : ${refSchedule.subjectId.name}`);
  console.log(`    classId   : ${refSchedule.classId}`);
  console.log(`    sectionId : ${refSchedule.sectionId}`);
  console.log(`    courseId  : ${refSchedule.courseId}`);

  // ── 3. Resolve Students ───────────────────────────────────────────────────────
  let students = await User.find({
    role:        'STUDENT',
    instituteId: admin.instituteId,
    isDeleted:   false,
  }).limit(3);

  if (students.length < 1) {
    console.error('\n❌  No students found. Run seed-phase8.js first.\n');
    process.exit(1);
  }

  // ── 4. Align students to match the schedule's class/section/branch ────────────
  console.log(`\n🔧  Aligning ${students.length} student(s) to schedule class/section/branch...`);
  for (const student of students) {
    await User.findByIdAndUpdate(student._id, {
      classId:     refSchedule.classId,
      sectionId:   refSchedule.sectionId,
      branchId:    refSchedule.branchId,
      instituteId: refSchedule.instituteId,
    });
  }
  // Re-fetch updated students
  students = await User.find({
    _id: { $in: students.map(s => s._id) },
  });
  console.log('   ✅  Students aligned');

  // ── 5. Ensure active Enrollment in the schedule's course ──────────────────────
  console.log(`\n🎓  Ensuring active enrollments in courseId: ${refSchedule.courseId}`);
  for (const student of students) {
    const existing = await Enrollment.findOne({
      studentId: student._id,
      courseId:  refSchedule.courseId,
      isDeleted: false,
    });
    if (!existing) {
      // Create a minimal enrollment so the result service passes the enrollment check
      await Enrollment.create({
        studentId:        student._id,
        courseId:         refSchedule.courseId,
        courseTitle:      'Seeded Course',
        teacherId:        refSchedule.teacherId,
        classId:          refSchedule.classId,
        sectionId:        refSchedule.sectionId,
        sessionId:        student.sessionId || new mongoose.Types.ObjectId(),
        instituteId:      refSchedule.instituteId,
        branchId:         refSchedule.branchId,
        enrollmentNumber: `ENR-P16-${Date.now()}-${student._id.toString().slice(-4)}`,
        status:           'ACTIVE',
        createdBy:        admin._id,
      });
      console.log(`   ➕  Created enrollment for ${student.name}`);
    } else {
      // Reactivate if dropped
      if (existing.status === 'DROPPED' || existing.isDeleted) {
        await Enrollment.findByIdAndUpdate(existing._id, { status: 'ACTIVE', isDeleted: false });
      }
      console.log(`   ✔   Enrollment exists for ${student.name} (${existing.status})`);
    }
  }

  // ── 6. Clear existing Phase 16 data ──────────────────────────────────────────
  const delRes  = await Result.deleteMany({ instituteId: admin.instituteId });
  const delHist = await ResultHistory.deleteMany({ instituteId: admin.instituteId });
  await AuditLog.deleteMany({
    action: {
      $in: [
        'RESULT_CREATED', 'RESULT_UPDATED', 'RESULT_DELETED',
        'RESULT_BULK_CREATED', 'RESULT_STATUS_CHANGED',
        'RESULT_PUBLISHED', 'RESULT_UNPUBLISHED',
      ],
    },
  });
  console.log(`\n🧹  Cleared ${delRes.deletedCount} Result(s) + ${delHist.deletedCount} ResultHistory entries`);

  // ── 7. Seed Results ───────────────────────────────────────────────────────────
  const created = [];

  const seedResult = async (student, schedule, marks, explicitStatus = null) => {
    const calc = calcGradeAndStatus(marks, schedule.totalMarks, schedule.passingMarks, explicitStatus);
    const r = await Result.create({
      studentId:      student._id,
      examScheduleId: schedule._id,
      classId:        schedule.classId,
      sectionId:      schedule.sectionId,
      marksObtained:  marks,
      percentage:     calc.percentage,
      grade:          calc.grade,
      gradePoint:     calc.gradePoint,
      status:         calc.status,
      remarks:        explicitStatus ? `Student was ${explicitStatus.toLowerCase()}` : '',
      instituteId:    schedule.instituteId,
      branchId:       schedule.branchId,
      createdBy:      admin._id,
    });
    created.push({
      student:  student.name,
      subject:  schedule.subjectId.name,
      marks:    `${marks}/${schedule.totalMarks}`,
      pct:      `${calc.percentage}%`,
      grade:    calc.grade,
      gp:       calc.gradePoint,
      status:   calc.status,
      resultId: r._id,
    });
    return r;
  };

  // Scenario 1 — Student 0: Excellent performance (A+)
  await seedResult(students[0], schMath, 95);
  // Scenario 2 — Student 1: Failure in Math
  await seedResult(students[1], schMath, 20);
  // Scenario 3 — Student 2: Absent for Math
  const absentResult = await seedResult(students.length > 2 ? students[2] : students[0], schMath, 0, 'ABSENT');

  // Scenario 4 — Student 0: B grade in Science
  await seedResult(students[0], schSci, 62);  // 62/80 = 77.5% → B
  // Scenario 5 — Student 1: INCOMPLETE in Science
  await seedResult(students[1], schSci, 0, 'INCOMPLETE');

  // Scenario 6 — Student 0: WITHHELD in English
  const withheldResult = await seedResult(students[0], schEng, 80, 'WITHHELD');

  // Scenario 7 — Student 1: Good pass in English
  await seedResult(students[1], schEng, 75);  // 75% → B

  // If extra schedules exist, seed more
  if (schUrd) await seedResult(students[0], schUrd, 55); // 55/60 = 91.6% → A+
  if (schCS)  await seedResult(students[0], schCS,  18); // 18/50 = 36% → FAIL F

  // ── 8. Print Summary Table ───────────────────────────────────────────────────
  console.log(`\n🚀  Created ${created.length} Result(s):\n`);
  console.log(line('─'));
  console.log(
    `  ${'Student'.padEnd(20)} ${'Subject'.padEnd(18)} ${'Marks'.padEnd(12)} ${'Pct'.padEnd(8)} ${'Grade'.padEnd(6)} ${'GP'.padEnd(5)} Status`
  );
  console.log(line('─'));
  for (const c of created) {
    console.log(
      `  ${c.student.padEnd(20)} ${c.subject.padEnd(18)} ${c.marks.padEnd(12)} ${c.pct.padEnd(8)} ${c.grade.padEnd(6)} ${String(c.gp).padEnd(5)} ${c.status}`
    );
  }
  console.log(line('─'));

  // ── 9. Thunder Client cheat-sheet ────────────────────────────────────────────
  const firstPassId   = created.find(c => c.status === 'PASS')?.resultId;
  const firstFailId   = created.find(c => c.status === 'FAIL')?.resultId;
  const absentId      = absentResult._id;
  const withheldId    = withheldResult._id;
  const studentId0    = students[0]._id;
  const schedId       = schMath._id;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           THUNDER CLIENT — PHASE 16 API TEST GUIDE                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Base URL : http://localhost:5000                                      ║
║  Auth     : Bearer token from POST /api/auth/login                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  CRUD                                                                 ║
║  ① POST   /api/results                                                ║
║           { studentId, examScheduleId, marksObtained }                ║
║                                                                       ║
║  ② POST   /api/results/bulk                                           ║
║           { examScheduleId: "${schedId}",              ║
║             results: [{ studentId, marksObtained }] }                  ║
║                                                                       ║
║  ③ GET    /api/results?examScheduleId=${schedId}   ║
║                                                                       ║
║  ④ GET    /api/results/${firstPassId}              ║
║                                                                       ║
║  ⑤ PUT    /api/results/${firstFailId}              ║
║           { marksObtained: 85, changeReason: "Recheck" }              ║
║                                                                       ║
║  ⑥ DELETE /api/results/${firstFailId}              ║
║                                                                       ║
║  PUBLISH FLOW                                                         ║
║  ⑦ PATCH  /api/results/${firstPassId}/publish      ║
║           Locks result — teacher edits blocked                         ║
║                                                                       ║
║  ⑧ PATCH  /api/results/${firstPassId}/unpublish    ║
║           Unlocks result                                               ║
║                                                                       ║
║  HISTORY                                                              ║
║  ⑨ GET    /api/results/${firstPassId}/history      ║
║           Marks change audit trail                                     ║
║                                                                       ║
║  STUDENT DASHBOARD                                                    ║
║  ⑩ GET    /api/results/my                                             ║
║           (Login as student first)                                     ║
║                                                                       ║
║  PARENT DASHBOARD                                                     ║
║  ⑪ GET    /api/results/my-child/${studentId0}      ║
║           (Login as parent first)                                      ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

  Seed IDs:
  ────────────────────────────────────────
  scheduleId (Math)  : ${schedId}
  PASS Result ID     : ${firstPassId}
  FAIL Result ID     : ${firstFailId}
  ABSENT Result ID   : ${absentId}
  WITHHELD Result ID : ${withheldId}
  Student[0] ID      : ${studentId0}
`);

  await mongoose.disconnect();
  console.log('✅  Phase 16 seed complete.\n');
  process.exit(0);
}

seedPhase16().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
