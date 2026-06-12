'use strict';
/**
 * seed-phase12.js — Phase 12: Attendance Management
 * ═══════════════════════════════════════════════════════════════════════════════
 * Run:  node src/seed-phase12.js
 *
 * What this seed does:
 *   1.  Connects to MongoDB
 *   2.  Finds teacher + course + enrolled students from Phase 9/10
 *   3.  Clears previous attendance data for this course
 *   4.  Seeds 5 days of attendance records
 *   5.  Tests the duplicate-prevention guard (same course + date → skip)
 *   6.  Prints per-student attendance summary with percentage
 * ═══════════════════════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User       = require('./models/User');
const Course     = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Attendance = require('./models/Attendance');
const AuditLog   = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

const sep = () => console.log('═'.repeat(62));
const hr  = () => console.log('─'.repeat(62));

// ── Build a Date at 00:00:00 UTC offset by N days from today ─────────────────
function dayOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(8, 0, 0, 0);   // 8 AM class time
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seedPhase12() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  sep();
  console.log('  PHASE 12 SEED — Attendance Management');
  sep();

  // ── 1. Find seeded course ─────────────────────────────────────────────────
  const course = await Course.findOne({ title: 'Advanced Mathematics for Grade 10' });
  if (!course) {
    console.error('\n❌  Course not found. Run seed-phase9.js first.\n');
    process.exit(1);
  }

  const teacher = await User.findById(course.teacherId).lean();
  if (!teacher) {
    console.error('\n❌  Teacher not found.\n');
    process.exit(1);
  }

  console.log(`\n👨‍🏫  Teacher   : ${teacher.name}  (${teacher.email})`);
  console.log(`📚  Course    : ${course.title}`);
  console.log(`🏫  Institute : ${course.instituteId}`);
  hr();

  // ── 2. Clear old Phase-12 data ────────────────────────────────────────────
  const delAtt = await Attendance.deleteMany({ courseId: course._id });
  await AuditLog.deleteMany({ action: { $in: ['ATTENDANCE_CREATED', 'ATTENDANCE_UPDATED', 'ATTENDANCE_DELETED'] } });
  console.log(`🧹  Cleared ${delAtt.deletedCount} attendance records + stale audit logs`);
  hr();

  // ── 3. Get enrolled students ──────────────────────────────────────────────
  const enrollments = await Enrollment.find({
    courseId:  course._id,
    status:    'ACTIVE',
    isDeleted: false,
  }).populate('studentId', 'name email').lean();

  if (enrollments.length === 0) {
    console.error('\n❌  No active enrolled students. Run seed-phase10.js first.\n');
    process.exit(1);
  }

  const students = enrollments.map(e => e.studentId).filter(Boolean);
  console.log(`👦  Found ${students.length} enrolled student(s):`);
  students.forEach((s, i) => console.log(`    ${i + 1}. ${s.name}  (${s.email})`));
  hr();

  // ── 4. Define 5 days of attendance data ──────────────────────────────────
  //  Day -4  → full attendance
  //  Day -3  → one student absent
  //  Day -2  → one student late, one excused
  //  Day -1  → full attendance
  //  Day  0  → today, one student absent

  const sessions = [
    {
      date:  dayOffset(-4),
      topic: 'Introduction to Quadratic Equations',
      attendees: students.map((s, i) => ({
        studentId: s._id,
        status:    'PRESENT',
        remarks:   '',
      })),
    },
    {
      date:  dayOffset(-3),
      topic: 'Solving Quadratics by Factoring',
      attendees: students.map((s, i) => ({
        studentId: s._id,
        status:    i === 1 ? 'ABSENT' : 'PRESENT',
        remarks:   i === 1 ? 'Did not attend without notice' : '',
      })),
    },
    {
      date:  dayOffset(-2),
      topic: 'Quadratic Formula',
      attendees: students.map((s, i) => ({
        studentId: s._id,
        status:    i === 0 ? 'LATE' : i === 2 ? 'EXCUSED' : 'PRESENT',
        remarks:   i === 0 ? 'Arrived 15 mins late' : i === 2 ? 'Medical leave approved' : '',
      })),
    },
    {
      date:  dayOffset(-1),
      topic: 'Discriminant and Nature of Roots',
      attendees: students.map(s => ({
        studentId: s._id,
        status:    'PRESENT',
        remarks:   '',
      })),
    },
    {
      date:  dayOffset(0),
      topic: 'Practice Problems Session',
      attendees: students.map((s, i) => ({
        studentId: s._id,
        status:    i === students.length - 1 ? 'ABSENT' : 'PRESENT',
        remarks:   i === students.length - 1 ? 'Unexcused absence' : '',
      })),
    },
  ];

  const tenantFields = {
    instituteId: course.instituteId,
    branchId:    course.branchId || null,
    classId:     course.classId  || null,
    sectionId:   course.sectionId|| null,
    recordedBy:  teacher._id,
    createdBy:   teacher._id,
  };

  const created = [];
  for (const session of sessions) {
    const rec = await Attendance.create({
      courseId:  course._id,
      date:      session.date,
      topic:     session.topic,
      attendees: session.attendees,
      ...tenantFields,
    });
    created.push(rec);

    const presentCount = session.attendees.filter(a => a.status === 'PRESENT').length;
    const lateCount    = session.attendees.filter(a => a.status === 'LATE').length;
    await AuditLog.create({
      userId:     teacher._id,
      role:       'TEACHER',
      action:     'ATTENDANCE_CREATED',
      resource:   'Attendance',
      resourceId: rec._id,
      metadata: {
        courseId:      course._id,
        date:          session.date,
        topic:         session.topic,
        totalStudents: session.attendees.length,
        presentCount:  presentCount + lateCount,
      },
    });

    const dateStr = session.date.toDateString();
    console.log(`✅  ${dateStr.padEnd(20)} | "${session.topic.substring(0, 30)}" | Present: ${presentCount + lateCount}/${students.length}`);
  }

  hr();

  // ── 5. Test duplicate-prevention ─────────────────────────────────────────
  console.log('\n🧪  Testing duplicate-prevention (same course + today\'s date)...');
  try {
    await Attendance.create({
      courseId:  course._id,
      date:      dayOffset(0),    // Same date as session 5 above
      topic:     'Should Fail',
      attendees: [],
      ...tenantFields,
    });
    console.log('❌  ERROR: Duplicate was not rejected — check unique index!');
  } catch (err) {
    if (err.code === 11000) {
      console.log('✅  Duplicate correctly rejected with E11000 (unique index works)');
    } else {
      console.log('⚠️   Unexpected error:', err.message);
    }
  }

  hr();

  // ── 6. Per-student attendance summary ─────────────────────────────────────
  console.log('\n📊  Attendance Summary per Student:\n');

  const statusOrder = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const totalSessions = created.length;

  for (const student of students) {
    const tally = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };

    for (const rec of created) {
      const entry = rec.attendees.find(
        a => a.studentId?.toString() === student._id.toString()
      );
      if (entry) tally[entry.status] = (tally[entry.status] || 0) + 1;
    }

    const effective    = tally.PRESENT + tally.LATE;
    const pct          = Math.round((effective / totalSessions) * 100);
    const pctBar       = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));

    console.log(`  👤  ${student.name}`);
    console.log(`      ${pctBar}  ${pct}% attendance  (${effective}/${totalSessions} sessions)`);
    statusOrder.forEach(s => {
      if (tally[s] > 0) console.log(`      ${s.padEnd(8)}: ${tally[s]}`);
    });
    console.log();
  }

  // ── 7. Final summary ──────────────────────────────────────────────────────
  sep();
  console.log('\n  PHASE 12 SEED COMPLETE — Summary');
  sep();
  console.log(`\n  Sessions seeded : ${created.length}`);
  console.log(`  Students tracked: ${students.length}`);
  const auditCount = await AuditLog.countDocuments({ action: 'ATTENDANCE_CREATED' });
  console.log(`  Audit logs      : ${auditCount}`);

  console.log('\n  API Endpoints:');
  console.log('    POST  /api/attendance                    → Mark attendance (TEACHER)');
  console.log('    GET   /api/attendance                    → List records (filtered)');
  console.log('    GET   /api/attendance/student/:studentId → Student history + summary');
  console.log('    GET   /api/attendance/:id                → Single record (populated)');
  console.log('    PUT   /api/attendance/:id                → Update session record');
  sep();
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seedPhase12().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
