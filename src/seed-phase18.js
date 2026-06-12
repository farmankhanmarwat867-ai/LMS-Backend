/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Seed Phase 18 — Academic Records & Rankings
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   Phase 17 → Report Cards generated and PUBLISHED.
 *   Phase 14 → Exam / Session references.
 *
 * What this seed does:
 *   1. Resolves Session & Admin.
 *   2. Ensures Report Cards are PUBLISHED (so they count for CGPA).
 *   3. Calls calculateSessionRecords to generate AcademicRecords.
 *   4. Outputs Merit List and CGPA Rankings to console.
 *   5. Prints Thunder Client cheat sheet.
 *
 * Run: node src/seed-phase18.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const AcademicSession = require('./models/AcademicSession');
const ReportCard = require('./models/ReportCard');
const AcademicRecord = require('./models/AcademicRecord');

const academicRecordService = require('./services/academicRecord.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_erp_dev';

const line = (char = '─', len = 72) => char.repeat(len);
const pad  = (str, n = 24) => String(str).padEnd(n);

async function seedPhase18() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  MongoDB connected');
  console.log(line('═'));
  console.log('  PHASE 18 — Academic Records & Rankings Seed');
  console.log(line('═'));

  // 1. Resolve Session that has Report Cards
  const rcs = await ReportCard.find({ isDeleted: false }).limit(1);
  if (rcs.length === 0) {
    console.error('\n❌ No Report Cards found. Run Phase 17 seed first.');
    process.exit(1);
  }
  const session = await AcademicSession.findById(rcs[0].sessionId);
  if (!session) {
    console.error('\n❌ Session not found for the report cards.');
    process.exit(1);
  }

  // 2. Resolve Admin
  let admin = await User.findOne({
    role: 'INSTITUTE_ADMIN',
    instituteId: session.instituteId,
    isDeleted: false,
  });
  if (!admin) {
    admin = await User.findOne({ email: 'iadmin@seedlms.com' });
  }
  console.log(`\n📋  Session : ${session.name}`);
  console.log(`👤  Admin   : ${admin.email}`);

  // 3. Ensure some report cards are PUBLISHED
  const rcUpdate = await ReportCard.updateMany(
    { sessionId: session._id, isDeleted: false },
    { $set: { status: 'PUBLISHED', isLocked: true } }
  );
  console.log(`\n📌  Forced ${rcUpdate.modifiedCount} Report Cards to PUBLISHED state for CGPA calculation.`);

  // 4. Calculate Session Records
  console.log('\n⚙️  Calculating CGPA & Multi-level Dense Rankings...');
  let genResult;
  try {
    genResult = await academicRecordService.calculateSessionRecords(session._id, admin);
    console.log(`   ✅  Calculated ${genResult.generated} Academic Record(s).`);
  } catch (err) {
    console.error('\n❌  Calculation failed:', err.message);
    process.exit(1);
  }

  // 5. Fetch Records for Display
  const records = await AcademicRecord.find({ sessionId: session._id })
    .populate('studentId', 'name rollNumber email')
    .sort({ cgpa: -1, overallPercentage: -1 })
    .lean();

  if (records.length === 0) {
    console.error('\n❌  No records generated.');
    process.exit(1);
  }

  // 6. Print Merit List
  console.log(`\n🏆  SESSION MERIT LIST (Sorted by Institute Rank)\n`);
  console.log(line('─', 85));
  console.log(
    `  ${pad('Student Name', 20)} | ${pad('CGPA', 5)} | ${pad('Pct%', 6)} | ${pad('Standing', 16)} | Ranks (C/S/B/I)`
  );
  console.log(line('─', 85));
  for (const r of records) {
    const ranks = `${r.ranking.classRank}/${r.ranking.sectionRank}/${r.ranking.branchRank}/${r.ranking.instituteRank}`;
    console.log(
      `  ${pad(r.studentId.name || r.studentId.email, 20)} | ` +
      `${pad(r.cgpa.toFixed(2), 5)} | ` +
      `${pad(r.overallPercentage + '%', 6)} | ` +
      `${pad(r.academicStanding, 16)} | ${ranks}`
    );
  }
  console.log(line('─', 85));

  const studentId = records[0].studentId._id;

  // 7. Thunder Client Cheat Sheet
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║       THUNDER CLIENT — PHASE 18 API TEST GUIDE                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ─── CALCULATION ─────────────────────────────────────────────────────  ║
║                                                                          ║
║  ① POST   /api/academic-records/calculate/${session._id}      ║
║      Role : INSTITUTE_ADMIN                                              ║
║                                                                          ║
║  ─── MERIT LIST & RANKINGS ───────────────────────────────────────────  ║
║                                                                          ║
║  ② GET    /api/academic-records/merit-list?sessionId=${session._id}  ║
║      Role : TEACHER / ADMIN                                              ║
║      Note : Add ?academicStanding=HONORS or ?classId=...                 ║
║                                                                          ║
║  ─── STUDENT ANALYTICS ───────────────────────────────────────────────  ║
║                                                                          ║
║  ③ GET    /api/academic-records/student/${studentId}?sessionId=${session._id}  ║
║      Role : STUDENT (own) / PARENT / TEACHER / ADMIN                     ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝`);

  await mongoose.disconnect();
  console.log('\n✅  Phase 18 seed complete.\n');
  process.exit(0);
}

seedPhase18().catch((err) => {
  console.error(err);
  process.exit(1);
});
