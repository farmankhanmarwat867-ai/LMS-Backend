require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const AcademicSession = require('./models/AcademicSession');
const Class = require('./models/Class');
const Section = require('./models/Section');
const Exam = require('./models/Exam');
const AuditLog = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

async function seedPhase14() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');

  const cls = await Class.findOne({ status: 'ACTIVE' });
  if (!cls) {
    console.error('\n❌  Class not found.\n');
    process.exit(1);
  }

  const section = await Section.findOne({ classId: cls._id });
  if (!section) {
    console.error('\n❌  Section not found.\n');
    process.exit(1);
  }

  const admin = await User.findOne({ role: 'INSTITUTE_ADMIN', instituteId: cls.instituteId });
  if (!admin) {
    console.error('\n❌  Institute Admin not found for this class.\n');
    process.exit(1);
  }

  const session = await AcademicSession.findOne({ _id: cls.sessionId });
  if (!session) {
    console.error('\n❌  Academic Session not found.\n');
    process.exit(1);
  }

  // Clear existing Phase 14 data
  await Exam.deleteMany({ instituteId: admin.instituteId });
  await AuditLog.deleteMany({ action: { $in: ['EXAM_CREATED', 'EXAM_UPDATED', 'EXAM_SCHEDULED', 'EXAM_CANCELLED', 'EXAM_COMPLETED'] } });
  console.log('🧹  Cleared existing Exam data and Audit Logs');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 10);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 5);

  const exam = await Exam.create({
    title: 'Mid Term Examinations 2026',
    examCode: 'MID-2026',
    examType: 'MID_TERM',
    sessionId: session._id,
    classId: cls._id,
    sectionId: section._id,
    startDate,
    endDate,
    description: 'First semester comprehensive exams',
    status: 'DRAFT',
    instituteId: admin.instituteId,
    branchId: admin.branchId || admin.instituteId, // Default if branchId is missing on admin
    createdBy: admin._id,
  });

  console.log(`\n🚀 Created Exam (Container):`);
  console.log(`   Title:      ${exam.title}`);
  console.log(`   Code:       ${exam.examCode}`);
  console.log(`   Start Date: ${exam.startDate.toLocaleDateString()}`);
  console.log(`   Status:     ${exam.status}`);

  // Test PATCH Status
  exam.status = 'SCHEDULED';
  await exam.save();
  console.log(`\n✅  Updated Exam Status to: SCHEDULED`);

  console.log(`\nTo test in Thunder Client:`);
  console.log(`1. Login as Admin (${admin.email})`);
  console.log(`2. GET /api/exams`);
  console.log(`3. PATCH /api/exams/${exam._id}/status`);
  console.log(`   Body: { "status": "ONGOING" }`);

  await mongoose.disconnect();
  process.exit(0);
}

seedPhase14().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
