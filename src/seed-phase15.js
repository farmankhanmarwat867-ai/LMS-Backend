/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Seed Phase 15 — ExamSchedule Module
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   - Phase 14 seed must have been run (Exam must exist)
 *   - Academic structure (Class, Section, Course) must exist
 *
 * Run: node src/seed-phase15.js
 * ═══════════════════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User         = require('./models/User');
const Exam         = require('./models/Exam');
const ExamSchedule = require('./models/ExamSchedule');
const Subject      = require('./models/Subject');
const Course       = require('./models/Course');
const Class        = require('./models/Class');
const Section      = require('./models/Section');
const AuditLog     = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

// ── Helpers ────────────────────────────────────────────────────────────────
const pad  = (n) => String(n).padStart(2, '0');
const line = (char = '─', len = 70) => char.repeat(len);

async function seedPhase15() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  console.log(line('═'));
  console.log('  PHASE 15 — ExamSchedule Seed Script');
  console.log(line('═'));

  // ── 1. Resolve Exam (Phase 14 prerequisite) ──────────────────────────────
  const exam = await Exam.findOne({ isDeleted: false });
  if (!exam) {
    console.error('\n❌  No Exam found. Run seed-phase14.js first.\n');
    process.exit(1);
  }

  // ── 2. Resolve Admin ─────────────────────────────────────────────────────
  const admin = await User.findOne({
    role      : 'INSTITUTE_ADMIN',
    isDeleted : false,
  });
  if (!admin) {
    console.error('\n❌  Institute Admin not found.\n');
    process.exit(1);
  }

  // ── 3. Resolve Teacher (prefer same institute, fallback to any) ──────────
  let teacher = await User.findOne({
    role        : 'TEACHER',
    instituteId : exam.instituteId,
    isDeleted   : false,
  });
  if (!teacher) {
    teacher = await User.findOne({ role: 'TEACHER', isDeleted: false });
  }
  if (!teacher) {
    console.error('\n❌  Teacher not found. Ensure Phase 8 (User seed) ran.\n');
    process.exit(1);
  }

  // ── 4. Resolve Course ────────────────────────────────────────────────────
  const course = await Course.findOne({ isDeleted: false });
  if (!course) {
    console.error('\n❌  Course not found. Ensure Phase 9 (Course seed) ran.\n');
    process.exit(1);
  }

  // ── 5. Resolve Class that belongs to same institute as Exam ──────────────
  let cls = await Class.findOne({
    instituteId : exam.instituteId,
    isDeleted   : false,
  });
  if (!cls) {
    cls = await Class.findOne({ isDeleted: false });
  }
  if (!cls) {
    console.error('\n❌  Class not found.\n');
    process.exit(1);
  }

  // ── 6. Resolve Section for that Class ───────────────────────────────────
  let section = await Section.findOne({ classId: cls._id, isDeleted: false });
  if (!section) {
    console.error('\n❌  Section not found for class.\n');
    process.exit(1);
  }

  console.log(`\n📋  Resolved Prerequisites:`);
  console.log(`   Exam     : ${exam.title} (${exam.examCode})`);
  console.log(`   Admin    : ${admin.email}`);
  console.log(`   Teacher  : ${teacher.email}`);
  console.log(`   Course   : ${course.title}`);
  console.log(`   Class    : ${cls.name}`);
  console.log(`   Section  : ${section.name}`);

  // ── 7. Ensure we have 5 Subjects (upsert by code) ───────────────────────
  const subjectDefs = [
    { name: 'Mathematics',      code: 'MATH-P15' },
    { name: 'Science',          code: 'SCI-P15'  },
    { name: 'English',          code: 'ENG-P15'  },
    { name: 'Urdu',             code: 'URD-P15'  },
    { name: 'Computer Science', code: 'CS-P15'   },
  ];

  const subjects = [];
  for (const def of subjectDefs) {
    let sub = await Subject.findOne({ code: def.code, isDeleted: false });
    if (!sub) {
      sub = await Subject.create({
        name        : def.name,
        code        : def.code,
        instituteId : exam.instituteId,
        branchId    : exam.branchId,
        createdBy   : admin._id,
        isActive    : true,
        isDeleted   : false,
      });
      console.log(`   ➕  Created Subject: ${def.name} (${def.code})`);
    } else {
      console.log(`   ✔   Subject exists: ${def.name} (${def.code})`);
    }
    subjects.push(sub);
  }

  // ── 8. Clear previous Phase 15 ExamSchedules for this exam ──────────────
  const delResult = await ExamSchedule.deleteMany({ examId: exam._id });
  await AuditLog.deleteMany({
    action: {
      $in: [
        'EXAM_SCHEDULE_CREATED',
        'EXAM_SCHEDULE_UPDATED',
        'EXAM_SCHEDULE_DELETED',
        'EXAM_SCHEDULE_CANCELLED',
        'EXAM_SCHEDULE_COMPLETED',
      ],
    },
  });
  console.log(`\n🧹  Cleared ${delResult.deletedCount} ExamSchedule(s) + related audit logs`);

  // ── 9. Schedule definitions (one per subject, unique combo) ─────────────
  const baseDate = new Date(exam.startDate);
  const scheduleDefs = [
    {
      subject       : subjects[0],
      label         : 'Mathematics',
      offsetDays    : 0,
      startTime     : '09:00 AM',
      endTime       : '11:00 AM',
      totalMarks    : 100,
      passingMarks  : 40,
      roomNumber    : 'Room 101',
      instructions  : 'Calculators not allowed. Show all working.',
    },
    {
      subject       : subjects[1],
      label         : 'Science',
      offsetDays    : 1,
      startTime     : '10:00 AM',
      endTime       : '12:00 PM',
      totalMarks    : 80,
      passingMarks  : 32,
      roomNumber    : 'Room 102',
      instructions  : 'Practical questions will be included.',
    },
    {
      subject       : subjects[2],
      label         : 'English',
      offsetDays    : 2,
      startTime     : '09:00 AM',
      endTime       : '11:30 AM',
      totalMarks    : 100,
      passingMarks  : 40,
      roomNumber    : 'Room 103',
      instructions  : 'Essay writing compulsory.',
    },
    {
      subject       : subjects[3],
      label         : 'Urdu',
      offsetDays    : 3,
      startTime     : '02:00 PM',
      endTime       : '04:00 PM',
      totalMarks    : 60,
      passingMarks  : 24,
      roomNumber    : 'Room 104',
      instructions  : 'Answer any four questions.',
    },
    {
      subject       : subjects[4],
      label         : 'Computer Science',
      offsetDays    : 4,
      startTime     : '09:00 AM',
      endTime       : '11:00 AM',
      totalMarks    : 50,
      passingMarks  : 20,
      roomNumber    : 'Lab 01',
      instructions  : 'Theory paper only — practical to follow separately.',
    },
  ];

  // ── 10. Create ExamSchedules + Audit Logs ────────────────────────────────
  const created = [];

  for (const def of scheduleDefs) {
    const examDate = new Date(baseDate);
    examDate.setDate(examDate.getDate() + def.offsetDays);

    const schedule = await ExamSchedule.create({
      examId       : exam._id,
      subjectId    : def.subject._id,
      courseId     : course._id,
      teacherId    : teacher._id,
      classId      : cls._id,
      sectionId    : section._id,
      examDate,
      startTime    : def.startTime,
      endTime      : def.endTime,
      totalMarks   : def.totalMarks,
      passingMarks : def.passingMarks,
      roomNumber   : def.roomNumber,
      instructions : def.instructions,
      status       : 'SCHEDULED',
      instituteId  : exam.instituteId,
      branchId     : exam.branchId,
      createdBy    : admin._id,
    });

    await AuditLog.create({
      userId    : admin._id,
      role      : admin.role,
      action    : 'EXAM_SCHEDULE_CREATED',
      resource  : 'ExamSchedule',
      resourceId: schedule._id,
      metadata  : {
        examId    : exam._id,
        subjectId : def.subject._id,
        classId   : cls._id,
        sectionId : section._id,
      },
    });

    created.push({ def, schedule });
  }

  // ── 11. Print Summary Table ──────────────────────────────────────────────
  console.log(`\n🚀  Created ${created.length} ExamSchedule(s):\n`);
  console.log(line('─'));
  console.log(
    `  ${'Subject'.padEnd(20)} ${'Date'.padEnd(13)} ${'Time'.padEnd(22)} ${'Pass/Total'.padEnd(12)} Room`
  );
  console.log(line('─'));

  for (const { def, schedule } of created) {
    const d       = new Date(schedule.examDate);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeStr = `${schedule.startTime} – ${schedule.endTime}`;
    const marks   = `${schedule.passingMarks}/${schedule.totalMarks}`;
    console.log(
      `  ${def.label.padEnd(20)} ${dateStr.padEnd(13)} ${timeStr.padEnd(22)} ${marks.padEnd(12)} ${schedule.roomNumber}`
    );
  }
  console.log(line('─'));

  const firstId  = created[0].schedule._id;
  const secondId = created[1].schedule._id;

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║          THUNDER CLIENT — PHASE 15 API TESTS                         ║
╠══════════════════════════════════════════════════════════════════════╣
║  Base URL : http://localhost:5000                                     ║
║  Auth     : Bearer token from Login                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ① POST   /api/exam-schedules                                        ║
║     Create a new schedule (Admin credentials)                        ║
║                                                                      ║
║  ② GET    /api/exam-schedules                                        ║
║     List all schedules (all roles can view)                          ║
║                                                                      ║
║  ③ GET    /api/exam-schedules?examId=${exam._id}║
║     Filter by Exam ID                                                ║
║                                                                      ║
║  ④ GET    /api/exam-schedules?status=SCHEDULED                       ║
║     Filter by status                                                 ║
║                                                                      ║
║  ⑤ GET    /api/exam-schedules/${firstId}                             ║
║     Get by ID                                                        ║
║                                                                      ║
║  ⑥ PUT    /api/exam-schedules/${firstId}                             ║
║     Body: { "totalMarks": 90, "passingMarks": 36 }                  ║
║                                                                      ║
║  ⑦ PATCH  /api/exam-schedules/${firstId}/status                      ║
║     Body: { "status": "ONGOING" }                                    ║
║                                                                      ║
║  ⑧ PATCH  /api/exam-schedules/${secondId}/status                     ║
║     Body: { "status": "COMPLETED" }                                  ║
║                                                                      ║
║  ⑨ DELETE /api/exam-schedules/${firstId}                             ║
║     Soft delete — isDeleted set to true                              ║
║                                                                      ║
║  ⑩ GET    /api/exam-schedules                                        ║
║     Verify deleted record no longer appears                          ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

  Seed IDs for Thunder Client:
  ─────────────────────────────
  Exam ID        : ${exam._id}
  Schedule[0] ID : ${created[0].schedule._id}   (Mathematics)
  Schedule[1] ID : ${created[1].schedule._id}   (Science)
  Schedule[2] ID : ${created[2].schedule._id}   (English)
  Schedule[3] ID : ${created[3].schedule._id}   (Urdu)
  Schedule[4] ID : ${created[4].schedule._id}   (Computer Science)
  Teacher ID     : ${teacher._id}
  Class ID       : ${cls._id}
  Section ID     : ${section._id}
  Course ID      : ${course._id}
`);

  await mongoose.disconnect();
  console.log('✅  Phase 15 seed complete — ExamSchedule module is ready.\n');
  process.exit(0);
}

seedPhase15().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
