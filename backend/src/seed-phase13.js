require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const AttendanceSession = require('./models/AttendanceSession');
const Attendance = require('./models/Attendance');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

async function seedPhase13() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');

  const course = await Course.findOne({ title: 'Advanced Mathematics for Grade 10' });
  if (!course) {
    console.error('\n❌  Course not found. Run seed-phase9.js first.\n');
    process.exit(1);
  }

  const teacher = await User.findById(course.teacherId);
  const enrollments = await Enrollment.find({ courseId: course._id, status: 'ACTIVE' }).populate('studentId');
  const students = enrollments.map(e => e.studentId);

  // Clear existing sessions
  await AttendanceSession.deleteMany({ courseId: course._id });
  console.log('🧹  Cleared existing attendance sessions');

  // Create an active session
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const session = await AttendanceSession.create({
    courseId: course._id,
    teacherId: teacher._id,
    expiresAt,
    date: new Date(),
    topic: 'QR Attendance Test',
    classId: course.classId,
    sectionId: course.sectionId,
    instituteId: course.instituteId,
    branchId: course.branchId,
    createdBy: teacher._id,
  });

  console.log(`\n🚀 Created QR Session:`);
  console.log(`   Session ID: ${session._id}`);
  console.log(`   QR Token:   ${session.qrToken}`);
  console.log(`   Expires At: ${expiresAt.toLocaleTimeString()}`);

  console.log(`\n👨‍🎓 Students available to scan this token:`);
  students.forEach(s => console.log(`   ${s.email}`));

  console.log(`\nTo test in Thunder Client:`);
  console.log(`1. Login as Student (e.g. ${students[0]?.email})`);
  console.log(`2. POST /api/attendance/scan`);
  console.log(`   Body: { "qrToken": "${session.qrToken}" }`);

  console.log(`\n3. Login as Teacher (${teacher.email})`);
  console.log(`4. PATCH /api/attendance/session/${session._id}/close`);

  await mongoose.disconnect();
  process.exit(0);
}

seedPhase13().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
