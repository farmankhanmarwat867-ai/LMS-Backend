/**
 * PHASE 10 — Enrollment Module Seed
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-requisites: seed:phase8 and seed:phase9 must have run first.
 *
 * What this seed does:
 *  1. Finds the "Advanced Mathematics for Grade 10" course from Phase 9
 *  2. Aligns all students in the institute to that course's session/class/section
 *  3. Bulk-enrolls them using the enrollment service (validates + audit logs)
 *  4. Prints a full summary with enrollment numbers
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User              = require('./models/User');
const Course            = require('./models/Course');
const Enrollment        = require('./models/Enrollment');
const { ROLES }         = require('./constants/roles');

const MONGO_URI = process.env.MONGO_URI;

async function seedPhase10() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // ── 1. Get the reference course from Phase 9 ───────────────────────────────
  const course = await Course.findOne({ title: 'Advanced Mathematics for Grade 10' });
  if (!course) {
    console.error('❌ Course "Advanced Mathematics for Grade 10" not found.');
    console.error('   ➜  Run: npm run seed:phase9 first.\n');
    process.exit(1);
  }
  console.log(`📚 Found course: "${course.title}"`);
  console.log(`   Status     : ${course.status}`);
  console.log(`   Capacity   : ${course.maxStudents ?? 'Unlimited'}`);
  console.log(`   Institute  : ${course.instituteId}\n`);

  // ── 2. Get an Institute Admin to act as the enrolling authority ────────────
  const admin = await User.findOne({
    role: ROLES.INSTITUTE_ADMIN,
    instituteId: course.instituteId,
  });
  if (!admin) {
    console.error('❌ Institute Admin not found for this course\'s institute.');
    process.exit(1);
  }
  console.log(`👤 Enrolling authority: ${admin.name} (${admin.role})\n`);

  // ── 3. Clear existing enrollments for this institute (clean re-seed) ───────
  const deleted = await Enrollment.deleteMany({ instituteId: course.instituteId });
  console.log(`🧹 Cleared ${deleted.deletedCount} existing enrollments\n`);

  // ── 4. Find all students in this institute ─────────────────────────────────
  const students = await User.find({
    role: ROLES.STUDENT,
    instituteId: course.instituteId,
    isDeleted: false,
  });

  if (students.length === 0) {
    console.error('❌ No students found in this institute.');
    console.error('   ➜  Run: npm run seed:phase8 first.\n');
    process.exit(1);
  }
  console.log(`👩‍🎓 Found ${students.length} student(s) to enroll\n`);

  // ── 5. Align students to course's academic profile ─────────────────────────
  // This is required so that session/class/section validation passes.
  // In production, students would already be assigned during admission.
  console.log('🔧 Aligning students to course academic profile (Class / Section / Session)...');
  for (const student of students) {
    await User.findByIdAndUpdate(student._id, {
      classId:   course.classId,
      sectionId: course.sectionId,
      sessionId: course.sessionId,
    });
  }
  console.log(`   ✅ ${students.length} student(s) aligned\n`);

  // ── 6. Ensure course is ACTIVE (required by enrollment service) ────────────
  if (course.status !== 'ACTIVE') {
    await Course.findByIdAndUpdate(course._id, { status: 'ACTIVE' });
    console.log('⚡ Course status set to ACTIVE\n');
  }

  // ── 7. Bulk enroll via service (full validation + audit logs) ──────────────
  const enrollmentService = require('./services/enrollment.service');

  const studentIds = students.map(s => s._id.toString());
  console.log(`🚀 Bulk enrolling ${studentIds.length} student(s)...`);

  const results = await enrollmentService.bulkEnrollStudents(
    { courseId: course._id.toString(), studentIds },
    admin
  );

  // ── 8. Print results ────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  PHASE 10 SEED — ENROLLMENT RESULTS');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  ✅  Successful : ${results.successful.length}`);
  console.log(`  ❌  Failed     : ${results.failed.length}`);

  if (results.successful.length > 0) {
    console.log('\n  Enrolled:');
    for (const r of results.successful) {
      const student = students.find(s => s._id.toString() === r.studentId.toString());
      console.log(`    • ${student?.name ?? r.studentId}  →  ${r.enrollmentNumber}`);
    }
  }

  if (results.failed.length > 0) {
    console.log('\n  Failed:');
    for (const f of results.failed) {
      console.log(`    • ${f.studentId}  →  [${f.code}] ${f.reason}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  ✅ PHASE 10 SEED COMPLETE');
  console.log('════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seedPhase10().catch(err => {
  console.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});
