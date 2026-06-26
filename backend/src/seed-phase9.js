require('dotenv').config();
const mongoose = require('mongoose');
const User            = require('./models/User');
const Institute       = require('./models/Institute');
const Branch          = require('./models/Branch');
const AcademicSession = require('./models/AcademicSession');
const Subject         = require('./models/Subject');
const Class           = require('./models/Class');
const Section         = require('./models/Section');
const Course          = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

async function seedPhase9() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  // 1. Get base data
  const institute = await Institute.findOne({ email: 'info@greenwood.seedlms.com' });
  const branch    = await Branch.findOne({ code: 'SEED-BRA', instituteId: institute._id });
  const teacher   = await User.findOne({ email: 'teacher1@seedlms.com' });
  const admin     = await User.findOne({ role: 'INSTITUTE_ADMIN' });

  if (!institute || !branch || !teacher || !admin) {
    console.log('❌ Base data from Phase 8 not found. Run seed:phase8 first.');
    process.exit(1);
  }

  // 2. Clean previous phase 9 data
  await AcademicSession.deleteMany({ instituteId: institute._id });
  await Subject.deleteMany({ instituteId: institute._id });
  await Class.deleteMany({ instituteId: institute._id });
  await Section.deleteMany({ instituteId: institute._id });
  await Course.deleteMany({ instituteId: institute._id });
  console.log('🧹 Cleared existing Phase 9 related data');

  // 3. Create Session
  const session = await AcademicSession.create({
    name: 'Fall 2026',
    code: 'FA26',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-12-31'),
    instituteId: institute._id,
    createdBy: admin._id,
  });
  console.log(`📅 Created Session: ${session.name}`);

  // 4. Create Class
  const cls = await Class.create({
    name: 'Grade 10',
    code: 'GR10',
    instituteId: institute._id,
    branchId: branch._id,
    sessionId: session._id,
    createdBy: admin._id,
  });
  console.log(`🏫 Created Class: ${cls.name}`);

  // 5. Create Section
  const section = await Section.create({
    name: 'Section A',
    classId: cls._id,
    instituteId: institute._id,
    branchId: branch._id,
    createdBy: admin._id,
  });
  console.log(`📏 Created Section: ${section.name}`);

  // 6. Create Subject
  const subject = await Subject.create({
    name: 'Mathematics',
    code: 'MATH101',
    instituteId: institute._id,
    branchId: branch._id,
    createdBy: admin._id,
  });
  console.log(`📚 Created Subject: ${subject.name}`);

  // 7. Create Course
  const course = await Course.create({
    title: 'Advanced Mathematics for Grade 10',
    description: 'A comprehensive study of Algebra and Geometry.',
    teacherId: teacher._id,
    subjectId: subject._id,
    classId: cls._id,
    sectionId: section._id,
    sessionId: session._id,
    instituteId: institute._id,
    branchId: branch._id,
    status: 'ACTIVE',
    createdBy: admin._id,
  });
  console.log(`🎓 Created Course: ${course.title} (Assigned to: ${teacher.name})`);

  console.log('\n✅ PHASE 9 SEED COMPLETE!');
  
  await mongoose.disconnect();
  process.exit(0);
}

seedPhase9().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
