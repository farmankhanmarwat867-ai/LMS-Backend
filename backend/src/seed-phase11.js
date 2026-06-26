'use strict';
/**
 * seed-phase11.js — Phase 11: Assignments & Submissions
 * ═══════════════════════════════════════════════════════════════════════════════
 * Run:  node src/seed-phase11.js
 *
 * What this seed does:
 *   1.  Connects to MongoDB
 *   2.  Finds the seeded teacher + course from Phase 9/10
 *   3.  Clears old Phase-11 data (assignments, submissions)
 *   4.  Creates 3 assignments (DRAFT, PUBLISHED, CLOSED)
 *   5.  Finds enrolled students
 *   6.  Creates submissions (on-time, late, graded)
 *   7.  Prints a full summary table
 * ═══════════════════════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User       = require('./models/User');
const Course     = require('./models/Course');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Enrollment = require('./models/Enrollment');
const AuditLog   = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

// ── Helpers ──────────────────────────────────────────────────────────────────
const hr  = () => console.log('─'.repeat(60));
const sep = () => console.log('═'.repeat(60));

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seedPhase11() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  sep();
  console.log('  PHASE 11 SEED — Assignments & Submissions');
  sep();

  // ── 1. Find the teacher-owned course ───────────────────────────────────────
  const course = await Course.findOne({ title: 'Advanced Mathematics for Grade 10' });
  if (!course) {
    console.error('\n❌  Course "Advanced Mathematics for Grade 10" not found.');
    console.error('    Run seed-phase9.js + seed-phase10.js first.\n');
    process.exit(1);
  }

  const teacher = await User.findById(course.teacherId).lean();
  if (!teacher) {
    console.error('\n❌  Teacher not found for this course.\n');
    process.exit(1);
  }

  console.log(`\n👨‍🏫  Teacher : ${teacher.name}  (${teacher.email})`);
  console.log(`📚  Course  : ${course.title}`);
  console.log(`🏫  Institute: ${course.instituteId}`);
  hr();

  // ── 2. Clear previous Phase-11 data ────────────────────────────────────────
  const delAssignments = await Assignment.deleteMany({ courseId: course._id });
  const delSubmissions = await Submission.deleteMany({});
  await AuditLog.deleteMany({
    action: {
      $in: [
        'ASSIGNMENT_CREATED', 'ASSIGNMENT_PUBLISHED', 'ASSIGNMENT_CLOSED',
        'SUBMISSION_CREATED', 'SUBMISSION_UPDATED',  'SUBMISSION_GRADED',
      ],
    },
  });
  console.log(`🧹  Cleared ${delAssignments.deletedCount} assignments, ${delSubmissions.deletedCount} submissions, stale audit logs`);
  hr();

  // ── 3. Create Assignments ───────────────────────────────────────────────────
  const tenantFields = {
    instituteId: course.instituteId,
    branchId:    course.branchId || null,
    createdBy:   teacher._id,
  };

  // Assignment 1 — PUBLISHED, due in 7 days (on-time submissions possible)
  const published = await Assignment.create({
    title:       'Algebra Final Project',
    description: 'Solve the provided set of algebraic equations and submit your working.',
    courseId:    course._id,
    teacherId:   teacher._id,
    dueDate:     daysFromNow(7),
    maxMarks:    100,
    status:      'PUBLISHED',
    ...tenantFields,
  });

  // Assignment 2 — DRAFT (invisible to students)
  const draft = await Assignment.create({
    title:       'Geometry Basics Quiz',
    description: 'Quick quiz on triangles and circles. Still in draft.',
    courseId:    course._id,
    teacherId:   teacher._id,
    dueDate:     daysFromNow(14),
    maxMarks:    50,
    status:      'DRAFT',
    ...tenantFields,
  });

  // Assignment 3 — CLOSED, due date in the past (tests isLate flag)
  const pastDate = new Date('2026-01-01T00:00:00.000Z');
  const closed = await Assignment.create({
    title:       'Term-1 Calculus Homework',
    description: 'Submitted work from Term 1. Assignment now closed.',
    courseId:    course._id,
    teacherId:   teacher._id,
    dueDate:     pastDate,
    maxMarks:    75,
    status:      'CLOSED',
    ...tenantFields,
  });

  console.log(`📝  Assignment 1 : "${published.title}" → ${published.status}  (maxMarks: ${published.maxMarks})`);
  console.log(`📝  Assignment 2 : "${draft.title}"    → ${draft.status}     (maxMarks: ${draft.maxMarks})`);
  console.log(`📝  Assignment 3 : "${closed.title}"   → ${closed.status}    (maxMarks: ${closed.maxMarks})`);

  // Audit logs for assignments
  await AuditLog.create([
    { userId: teacher._id, role: 'TEACHER', action: 'ASSIGNMENT_CREATED', resource: 'Assignment', resourceId: published._id, metadata: { title: published.title } },
    { userId: teacher._id, role: 'TEACHER', action: 'ASSIGNMENT_PUBLISHED', resource: 'Assignment', resourceId: published._id, metadata: { status: 'PUBLISHED' } },
    { userId: teacher._id, role: 'TEACHER', action: 'ASSIGNMENT_CREATED', resource: 'Assignment', resourceId: draft._id, metadata: { title: draft.title } },
    { userId: teacher._id, role: 'TEACHER', action: 'ASSIGNMENT_CREATED', resource: 'Assignment', resourceId: closed._id, metadata: { title: closed.title } },
    { userId: teacher._id, role: 'TEACHER', action: 'ASSIGNMENT_CLOSED', resource: 'Assignment', resourceId: closed._id, metadata: { status: 'CLOSED' } },
  ]);

  hr();

  // ── 4. Get enrolled students ────────────────────────────────────────────────
  const enrollments = await Enrollment.find({ courseId: course._id, status: 'ACTIVE', isDeleted: false })
    .populate('studentId', 'name email')
    .lean();

  if (enrollments.length === 0) {
    console.log('⚠️   No active enrolled students found — skipping submission seed.');
    console.log('    Run seed-phase10.js first to enroll students.\n');
    await printSummary(published, draft, closed, []);
    await mongoose.disconnect();
    process.exit(0);
  }

  const students = enrollments.map(e => e.studentId).filter(Boolean);
  console.log(`👦  Found ${students.length} enrolled student(s):`);
  students.forEach((s, i) => console.log(`    ${i + 1}. ${s.name} (${s.email})`));
  hr();

  // ── 5. Create Submissions ───────────────────────────────────────────────────
  const submissions = [];

  // Student 0 — on-time submission on PUBLISHED assignment
  if (students[0]) {
    const sub = await Submission.create({
      assignmentId:   published._id,
      studentId:      students[0]._id,
      submissionText: 'Here are my complete algebra solutions. I have used the substitution method throughout.',
      fileUrl:        'https://example.com/submissions/student-1-algebra.pdf',
      isLate:         false,
      status:         'SUBMITTED',
      instituteId:    course.instituteId,
      branchId:       course.branchId || null,
      createdBy:      students[0]._id,
    });
    submissions.push(sub);
    await AuditLog.create({ userId: students[0]._id, role: 'STUDENT', action: 'SUBMISSION_CREATED', resource: 'Submission', resourceId: sub._id, metadata: { assignmentId: published._id, isLate: false } });
    console.log(`✅  Student 1 [${students[0].name}] submitted on time`);
  }

  // Student 1 — submission on CLOSED (past-due) assignment → isLate = true, then graded
  if (students[1]) {
    const sub = await Submission.create({
      assignmentId:   closed._id,
      studentId:      students[1]._id,
      submissionText: 'Apologies for the late submission. Here is my calculus work.',
      fileUrl:        '',
      isLate:         true,           // ✅ correctly flagged
      status:         'GRADED',
      marksObtained:  58,             // out of 75
      feedback:       'Good effort, but submitted after the deadline. Deduction applied.',
      instituteId:    course.instituteId,
      branchId:       course.branchId || null,
      createdBy:      students[1]._id,
      updatedBy:      teacher._id,
    });
    submissions.push(sub);
    await AuditLog.create([
      { userId: students[1]._id, role: 'STUDENT', action: 'SUBMISSION_CREATED', resource: 'Submission', resourceId: sub._id, metadata: { assignmentId: closed._id, isLate: true } },
      { userId: teacher._id, role: 'TEACHER', action: 'SUBMISSION_GRADED', resource: 'Submission', resourceId: sub._id, metadata: { marksObtained: 58, maxMarks: 75 } },
    ]);
    console.log(`⏰  Student 2 [${students[1].name}] submitted late → graded 58/${closed.maxMarks}`);
  }

  // Student 2 — submission on PUBLISHED assignment, graded (full marks)
  if (students[2]) {
    const sub = await Submission.create({
      assignmentId:   published._id,
      studentId:      students[2]._id,
      submissionText: 'All questions answered. Please find attached PDF for detailed working.',
      fileUrl:        'https://example.com/submissions/student-3-algebra-full.pdf',
      isLate:         false,
      status:         'GRADED',
      marksObtained:  97,             // out of 100
      feedback:       'Excellent work! Clean presentation and correct methodology.',
      instituteId:    course.instituteId,
      branchId:       course.branchId || null,
      createdBy:      students[2]._id,
      updatedBy:      teacher._id,
    });
    submissions.push(sub);
    await AuditLog.create([
      { userId: students[2]._id, role: 'STUDENT', action: 'SUBMISSION_CREATED', resource: 'Submission', resourceId: sub._id, metadata: { assignmentId: published._id, isLate: false } },
      { userId: teacher._id, role: 'TEACHER', action: 'SUBMISSION_GRADED', resource: 'Submission', resourceId: sub._id, metadata: { marksObtained: 97, maxMarks: 100 } },
    ]);
    console.log(`🏆  Student 3 [${students[2].name}] submitted → graded 97/${published.maxMarks}`);
  }

  // Student 3 — DRAFT submission (not yet submitted)
  if (students[3]) {
    const sub = await Submission.create({
      assignmentId:   published._id,
      studentId:      students[3]._id,
      submissionText: 'Work in progress...',
      fileUrl:        '',
      isLate:         false,
      status:         'DRAFT',
      instituteId:    course.instituteId,
      branchId:       course.branchId || null,
      createdBy:      students[3]._id,
    });
    submissions.push(sub);
    console.log(`📄  Student 4 [${students[3].name}] saved as DRAFT (not yet submitted)`);
  }

  hr();

  // ── 6. Assignment Statistics ────────────────────────────────────────────────
  await printStats(published, students.length);
  await printStats(closed, students.length);

  // ── 7. Final Summary ────────────────────────────────────────────────────────
  await printSummary(published, draft, closed, submissions);

  await mongoose.disconnect();
  process.exit(0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function printStats(assignment, totalStudents) {
  const submittedCount = await Submission.countDocuments({ assignmentId: assignment._id, isDeleted: false });
  const gradedCount    = await Submission.countDocuments({ assignmentId: assignment._id, status: 'GRADED', isDeleted: false });
  const pending        = Math.max(0, totalStudents - submittedCount);

  console.log(`\n📊  Stats for "${assignment.title}":`);
  console.log(`    Total Students : ${totalStudents}`);
  console.log(`    Submitted      : ${submittedCount}`);
  console.log(`    Graded         : ${gradedCount}`);
  console.log(`    Pending        : ${pending}`);
}

async function printSummary(published, draft, closed, submissions) {
  sep();
  console.log('\n  PHASE 11 SEED COMPLETE — Summary');
  sep();
  console.log('\n  Assignments Created:');
  console.log(`    ✅  ${published.title}  → PUBLISHED  (maxMarks: ${published.maxMarks})`);
  console.log(`    📋  ${draft.title}    → DRAFT      (maxMarks: ${draft.maxMarks})`);
  console.log(`    🔒  ${closed.title}   → CLOSED     (maxMarks: ${closed.maxMarks})`);

  console.log(`\n  Submissions Created : ${submissions.length}`);
  for (const s of submissions) {
    const statusIcon = s.status === 'GRADED' ? '🏅' : s.status === 'SUBMITTED' ? '✅' : '📄';
    const lateTag    = s.isLate ? ' [LATE]' : '';
    const marks      = s.marksObtained != null ? `  marks: ${s.marksObtained}` : '';
    console.log(`    ${statusIcon}  ${s.status}${lateTag}${marks}`);
  }

  console.log('\n  Audit Logs:');
  const auditCount = await AuditLog.countDocuments({
    action: { $in: [
      'ASSIGNMENT_CREATED', 'ASSIGNMENT_PUBLISHED', 'ASSIGNMENT_CLOSED',
      'SUBMISSION_CREATED', 'SUBMISSION_UPDATED',  'SUBMISSION_GRADED',
    ]},
  });
  console.log(`    📝  ${auditCount} audit log entries written`);

  console.log('\n  API Endpoints:');
  console.log('    POST   /api/assignments              → Create assignment (TEACHER)');
  console.log('    GET    /api/assignments              → List all (with filters)');
  console.log('    GET    /api/assignments/my           → Teacher dashboard');
  console.log('    GET    /api/assignments/:id          → Single assignment');
  console.log('    GET    /api/assignments/:id/stats    → Submission stats');
  console.log('    PATCH  /api/assignments/:id          → Update / publish / close');
  console.log('    DELETE /api/assignments/:id          → Soft delete');
  console.log('    POST   /api/submissions/assignment/:id → Submit (STUDENT)');
  console.log('    GET    /api/submissions/my           → Student dashboard');
  console.log('    GET    /api/submissions/assignment/:id → All submissions (TEACHER)');
  console.log('    GET    /api/submissions/student/:id  → Student review (TEACHER)');
  console.log('    PATCH  /api/submissions/:id/grade    → Grade submission (TEACHER)');

  sep();
  console.log('');
}

// ── Run ───────────────────────────────────────────────────────────────────────
seedPhase11().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
