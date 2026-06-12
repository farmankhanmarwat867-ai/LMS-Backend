require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User      = require('./models/User');
const Institute = require('./models/Institute');
const Branch    = require('./models/Branch');
const Plan      = require('./models/Plan');

/**
 * PHASE 8 — User Management Seed Script
 *
 * Creates a realistic multi-tenant dataset:
 *   1 SUPER_ADMIN
 *   1 Subscription Plan (Standard)
 *   1 Institute  → INSTITUTE_ADMIN
 *   2 Branches   → 2 BRANCH_ADMINs
 *   3 TEACHERs
 *   4 STUDENTs
 *   2 PARENTs   (each linked to 2 students)
 *
 * Run: node src/seed-phase8.js
 */

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

const hash = async (pw) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(pw, salt);
};

async function seedPhase8() {
  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected');

  // ── Clean up previous seed data ──────────────────────────────────────
  await User.deleteMany({ email: { $regex: /@seedlms\.com$/ } });
  console.log('🧹  Cleared previous seed users');

  // ── 1. SUPER_ADMIN ───────────────────────────────────────────────────
  const superAdmin = await User.create({
    name:        'Super Admin',
    email:       'superadmin@seedlms.com',
    password:    await hash('Admin@1234'),
    role:        'SUPER_ADMIN',
    instituteId: null,
    branchId:    null,
    isActive:    true,
  });
  console.log('👑  SUPER_ADMIN created:', superAdmin.email);

  // ── 2. Subscription Plan ─────────────────────────────────────────────
  let plan = await Plan.findOne({ name: 'Standard' });
  if (!plan) {
    plan = await Plan.create({
      name:          'Standard',
      description:   'Standard plan for mid-size institutes',
      monthlyPrice:  49,
      yearlyPrice:   499,
      studentLimit:  500,
      teacherLimit:  50,
      branchLimit:   5,
      storageLimit:  10240, // 10 GB in MB
      features:      ['QR Attendance', 'Course Management', 'Result Management', 'Fee Management'],
      status:        'ACTIVE',
    });
  }
  console.log('📋  Plan ready:', plan.name);

  // ── 3. Institute ─────────────────────────────────────────────────────
  let institute = await Institute.findOne({ email: 'info@greenwood.seedlms.com' });
  if (!institute) {
    institute = await Institute.create({
      name:      'Greenwood Academy',
      code:      'GREENWOOD',
      email:     'info@greenwood.seedlms.com',
      phone:     '+923001234567',
      address:   { street: '12 Education Avenue', city: 'Lahore', country: 'Pakistan' },
      domain:    'greenwood.seedlms.com',
      planId:    plan._id,
      status:    'ACTIVE',
      createdBy: superAdmin._id,
    });
  }
  console.log('🏛️   Institute ready:', institute.name);

  // ── 4. INSTITUTE_ADMIN ───────────────────────────────────────────────
  const instituteAdmin = await User.create({
    name:        'Institute Admin',
    email:       'iadmin@seedlms.com',
    password:    await hash('Admin@1234'),
    role:        'INSTITUTE_ADMIN',
    instituteId: institute._id,
    branchId:    null,
    isActive:    true,
    createdBy:   superAdmin._id,
  });

  // Attach ownerId to institute if not set
  if (!institute.ownerId) {
    await Institute.findByIdAndUpdate(institute._id, { ownerId: instituteAdmin._id });
  }
  console.log('🏢  INSTITUTE_ADMIN created:', instituteAdmin.email);

  // ── 5. Branches ──────────────────────────────────────────────────────
  let branchA = await Branch.findOne({ code: 'SEED-BRA', instituteId: institute._id });
  if (!branchA) {
    branchA = await Branch.create({
      name:        'Main Campus',
      code:        'SEED-BRA',
      email:       'main@greenwood.seedlms.com',
      phone:       '+923001111111',
      address:     'Main Campus, Lahore',
      instituteId: institute._id,
      status:      'ACTIVE',
      createdBy:   instituteAdmin._id,
    });
  }

  let branchB = await Branch.findOne({ code: 'SEED-BRB', instituteId: institute._id });
  if (!branchB) {
    branchB = await Branch.create({
      name:        'North Campus',
      code:        'SEED-BRB',
      email:       'north@greenwood.seedlms.com',
      phone:       '+923002222222',
      address:     'North Campus, Lahore',
      instituteId: institute._id,
      status:      'ACTIVE',
      createdBy:   instituteAdmin._id,
    });
  }
  console.log('🏫  Branches ready:', branchA.name, '|', branchB.name);

  // ── 6. BRANCH_ADMINs ─────────────────────────────────────────────────
  const branchAdminA = await User.create({
    name:        'Branch Admin - Main',
    email:       'badmin.main@seedlms.com',
    password:    await hash('Admin@1234'),
    role:        'BRANCH_ADMIN',
    instituteId: institute._id,
    branchId:    branchA._id,
    isActive:    true,
    createdBy:   instituteAdmin._id,
  });

  const branchAdminB = await User.create({
    name:        'Branch Admin - North',
    email:       'badmin.north@seedlms.com',
    password:    await hash('Admin@1234'),
    role:        'BRANCH_ADMIN',
    instituteId: institute._id,
    branchId:    branchB._id,
    isActive:    true,
    createdBy:   instituteAdmin._id,
  });
  console.log('👔  BRANCH_ADMINs created');

  // ── 7. TEACHERs ──────────────────────────────────────────────────────
  // NOTE: Must use User.create (not insertMany) so bcrypt pre-save hook fires
  const teachers = [];
  teachers.push(await User.create({
    name: 'Ms. Sarah Khan', email: 'teacher1@seedlms.com',
    password: 'Teacher@123', role: 'TEACHER',
    instituteId: institute._id, branchId: branchA._id,
    phone: '+923011111111', isActive: true, createdBy: branchAdminA._id,
  }));
  teachers.push(await User.create({
    name: 'Mr. Ali Raza', email: 'teacher2@seedlms.com',
    password: 'Teacher@123', role: 'TEACHER',
    instituteId: institute._id, branchId: branchA._id,
    phone: '+923022222222', isActive: true, createdBy: branchAdminA._id,
  }));
  teachers.push(await User.create({
    name: 'Ms. Hina Malik', email: 'teacher3@seedlms.com',
    password: 'Teacher@123', role: 'TEACHER',
    instituteId: institute._id, branchId: branchB._id,
    phone: '+923033333333', isActive: true, createdBy: branchAdminB._id,
  }));
  console.log('👩‍🏫  TEACHERs created:', teachers.length);

  // ── 8. STUDENTs ──────────────────────────────────────────────────────
  // NOTE: Must use User.create (not insertMany) so bcrypt pre-save hook fires
  const students = [];
  students.push(await User.create({
    name: 'Ahmed Bilal', email: 'student1@seedlms.com',
    password: 'Student@123', role: 'STUDENT',
    instituteId: institute._id, branchId: branchA._id,
    phone: '+923044444444', isActive: true, createdBy: branchAdminA._id,
  }));
  students.push(await User.create({
    name: 'Fatima Noor', email: 'student2@seedlms.com',
    password: 'Student@123', role: 'STUDENT',
    instituteId: institute._id, branchId: branchA._id,
    phone: '+923055555555', isActive: true, createdBy: branchAdminA._id,
  }));
  students.push(await User.create({
    name: 'Usman Tariq', email: 'student3@seedlms.com',
    password: 'Student@123', role: 'STUDENT',
    instituteId: institute._id, branchId: branchB._id,
    phone: '+923066666666', isActive: true, createdBy: branchAdminB._id,
  }));
  students.push(await User.create({
    name: 'Sana Iqbal', email: 'student4@seedlms.com',
    password: 'Student@123', role: 'STUDENT',
    instituteId: institute._id, branchId: branchB._id,
    phone: '+923077777777', isActive: true, createdBy: branchAdminB._id,
  }));
  console.log('👦  STUDENTs created:', students.length);

  // ── 9. PARENTs (linked to students) ──────────────────────────────────
  const parent1 = await User.create({
    name:        'Mr. Bilal Sr.',
    email:       'parent1@seedlms.com',
    password:    await hash('Parent@123'),
    role:        'PARENT',
    instituteId: institute._id,
    branchId:    branchA._id,
    phone:       '+923088888888',
    parentOf:    [students[0]._id, students[1]._id],
    isActive:    true,
    createdBy:   branchAdminA._id,
  });

  const parent2 = await User.create({
    name:        'Mrs. Tariq',
    email:       'parent2@seedlms.com',
    password:    await hash('Parent@123'),
    role:        'PARENT',
    instituteId: institute._id,
    branchId:    branchB._id,
    phone:       '+923099999999',
    parentOf:    [students[2]._id, students[3]._id],
    isActive:    true,
    createdBy:   branchAdminB._id,
  });
  console.log('👨‍👩‍👧  PARENTs created');

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  PHASE 8 SEED COMPLETE — Login Credentials');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  SUPER_ADMIN      → superadmin@seedlms.com   / Admin@1234`);
  console.log(`  INSTITUTE_ADMIN  → iadmin@seedlms.com       / Admin@1234`);
  console.log(`  BRANCH_ADMIN (A) → badmin.main@seedlms.com  / Admin@1234`);
  console.log(`  BRANCH_ADMIN (B) → badmin.north@seedlms.com / Admin@1234`);
  console.log(`  TEACHER 1        → teacher1@seedlms.com     / Teacher@123`);
  console.log(`  TEACHER 2        → teacher2@seedlms.com     / Teacher@123`);
  console.log(`  TEACHER 3        → teacher3@seedlms.com     / Teacher@123`);
  console.log(`  STUDENT 1        → student1@seedlms.com     / Student@123`);
  console.log(`  STUDENT 2        → student2@seedlms.com     / Student@123`);
  console.log(`  STUDENT 3        → student3@seedlms.com     / Student@123`);
  console.log(`  STUDENT 4        → student4@seedlms.com     / Student@123`);
  console.log(`  PARENT 1         → parent1@seedlms.com      / Parent@123`);
  console.log(`  PARENT 2         → parent2@seedlms.com      / Parent@123`);
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seedPhase8().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
