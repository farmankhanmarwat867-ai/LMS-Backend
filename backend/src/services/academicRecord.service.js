/**
 * Academic Record Service — Phase 18
 * ═══════════════════════════════════════════════════════════════════════════════
 * Business Logic Layer for CGPA, GPA History, and Global Rankings.
 *
 * Core Features:
 *  - Session CGPA calculation from PUBLISHED report cards.
 *  - Multi-level dense ranking (Section, Class, Branch, Institute).
 *  - Academic standing evaluation.
 *  - Merit List generation and Academic Analytics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const AcademicRecord = require('../models/AcademicRecord');
const ReportCard = require('../models/ReportCard');
const AcademicSession = require('../models/AcademicSession');
const academicRecordRepository = require('../repositories/academicRecord.repository');
const AuditLogger = require('../utils/auditLogger');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * determineAcademicStanding
 * Returns academic standing string based on CGPA.
 * @param {Number} cgpa
 * @returns {String}
 */
const determineAcademicStanding = (cgpa) => {
  if (cgpa >= 3.5) return 'HONORS';
  if (cgpa >= 2.0) return 'GOOD_STANDING';
  if (cgpa >= 1.0) return 'ACADEMIC_WARNING';
  return 'PROBATION';
};

/**
 * applyDenseRanking
 * Sorts records descending by CGPA (and overallPercentage on tie).
 * Assigns ranks where ties share the same rank, and the next score gets rank + 1.
 *
 * @param {Array} records - Array of AcademicRecord objects
 * @param {String} rankField - e.g., 'ranking.classRank'
 */
const applyDenseRanking = (records, rankField) => {
  if (!records || records.length === 0) return;

  records.sort((a, b) => {
    if (b.cgpa !== a.cgpa) return b.cgpa - a.cgpa;
    return b.overallPercentage - a.overallPercentage;
  });

  let currentRank = 1;
  let prevCgpa = records[0].cgpa;
  let prevPct = records[0].overallPercentage;

  for (const record of records) {
    if (record.cgpa < prevCgpa || record.overallPercentage < prevPct) {
      currentRank++;
      prevCgpa = record.cgpa;
      prevPct = record.overallPercentage;
    }
    
    // Set nested field
    if (!record.ranking) record.ranking = {};
    const keys = rankField.split('.');
    if (keys.length === 2) {
      record[keys[0]][keys[1]] = currentRank;
    } else {
      record[rankField] = currentRank;
    }
  }
};

// ── Core Operations ───────────────────────────────────────────────────────────

/**
 * calculateSessionRecords
 * Aggregates all published report cards in a session to calculate CGPA and GPA history.
 *
 * @param {ObjectId} sessionId
 * @param {Object} user
 * @returns {Object} { generated: Number }
 */
const calculateSessionRecords = async (sessionId, user) => {
  // 1. Verify Session
  const session = await AcademicSession.findById(sessionId);
  if (!session || session.isDeleted) {
    throw { status: 404, message: 'Academic session not found' };
  }

  // Tenant Authorization
  if (user.role === 'INSTITUTE_ADMIN' && String(session.instituteId) !== String(user.instituteId)) {
    throw { status: 403, message: 'Not authorized for this session' };
  }

  // 2. Fetch all PUBLISHED report cards for this session & tenant
  const query = {
    sessionId,
    status: 'PUBLISHED',
    isDeleted: false,
  };
  if (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  if (user.role === 'BRANCH_ADMIN') query.branchId = user.branchId;

  const reportCards = await ReportCard.find(query).lean();

  if (reportCards.length === 0) {
    throw { status: 400, message: 'No published report cards found for this session to calculate CGPA' };
  }

  // 3. Group by Student
  const studentMap = {};

  for (const rc of reportCards) {
    const sId = String(rc.studentId);
    if (!studentMap[sId]) {
      studentMap[sId] = {
        studentId: rc.studentId,
        sessionId: rc.sessionId,
        classId: rc.classId,
        sectionId: rc.sectionId,
        branchId: rc.branchId,
        instituteId: rc.instituteId,
        totalExamsTaken: 0,
        totalMarks: 0,
        obtainedMarks: 0,
        gpaHistory: [],
      };
    }

    const st = studentMap[sId];
    st.totalExamsTaken++;
    st.totalMarks += rc.totalMarks;
    st.obtainedMarks += rc.obtainedMarks;
    st.gpaHistory.push({
      examId: rc.examId,
      reportCardId: rc._id,
      percentage: rc.percentage,
      gpa: rc.overallGPA,
      grade: rc.overallGrade,
      dateRecorded: rc.publishedAt || rc.createdAt,
    });
  }

  // 4. Calculate Aggregates
  const draftRecords = [];

  for (const sId of Object.keys(studentMap)) {
    const st = studentMap[sId];

    // Overall Percentage
    st.overallPercentage = st.totalMarks > 0
      ? parseFloat(((st.obtainedMarks / st.totalMarks) * 100).toFixed(2))
      : 0;

    // CGPA (Average of GPAs from all exams in the session)
    const totalGpa = st.gpaHistory.reduce((sum, h) => sum + h.gpa, 0);
    st.cgpa = st.gpaHistory.length > 0
      ? parseFloat((totalGpa / st.gpaHistory.length).toFixed(2))
      : 0;

    st.academicStanding = determineAcademicStanding(st.cgpa);

    draftRecords.push({
      ...st,
      ranking: {
        classRank: null,
        sectionRank: null,
        branchRank: null,
        instituteRank: null,
      },
      lastCalculatedAt: new Date(),
    });
  }

  // 5. Apply Dense Ranking Locally Before DB Save
  
  // Section Ranking
  const sectionGroups = {};
  for (const rec of draftRecords) {
    const key = String(rec.sectionId);
    if (!sectionGroups[key]) sectionGroups[key] = [];
    sectionGroups[key].push(rec);
  }
  Object.values(sectionGroups).forEach(group => applyDenseRanking(group, 'ranking.sectionRank'));

  // Class Ranking
  const classGroups = {};
  for (const rec of draftRecords) {
    const key = String(rec.classId);
    if (!classGroups[key]) classGroups[key] = [];
    classGroups[key].push(rec);
  }
  Object.values(classGroups).forEach(group => applyDenseRanking(group, 'ranking.classRank'));

  // Branch Ranking
  const branchGroups = {};
  for (const rec of draftRecords) {
    const key = String(rec.branchId);
    if (!branchGroups[key]) branchGroups[key] = [];
    branchGroups[key].push(rec);
  }
  Object.values(branchGroups).forEach(group => applyDenseRanking(group, 'ranking.branchRank'));

  // Institute Ranking
  const instituteGroups = {};
  for (const rec of draftRecords) {
    const key = String(rec.instituteId);
    if (!instituteGroups[key]) instituteGroups[key] = [];
    instituteGroups[key].push(rec);
  }
  Object.values(instituteGroups).forEach(group => applyDenseRanking(group, 'ranking.instituteRank'));

  // 6. Bulk Upsert into AcademicRecord
  const operations = draftRecords.map(rec => ({
    updateOne: {
      filter: { studentId: rec.studentId, sessionId: rec.sessionId, isDeleted: false },
      update: {
        $set: { ...rec, updatedBy: user._id },
        $setOnInsert: { createdBy: user._id },
      },
      upsert: true,
    },
  }));

  await academicRecordRepository.bulkWrite(operations);

  // 7. Audit Logging
  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ACADEMIC_RECORDS_CALCULATED',
    resource: 'AcademicRecord',
    metadata: { sessionId, calculatedCount: draftRecords.length },
  });

  return { generated: draftRecords.length };
};

/**
 * getMeritList
 * Returns paginated academic records sorted by ranking.
 * Support filters: classId, sectionId, branchId
 */
const getMeritList = async (sessionId, filters = {}, pagination = {}, user) => {
  const query = { sessionId, isDeleted: false };

  // Tenant Isolation
  if (user.role === 'INSTITUTE_ADMIN' || user.role === 'TEACHER') {
    query.instituteId = user.instituteId;
  } else if (user.role === 'BRANCH_ADMIN') {
    query.branchId = user.branchId;
  }

  if (filters.classId) query.classId = filters.classId;
  if (filters.sectionId) query.sectionId = filters.sectionId;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.academicStanding) query.academicStanding = filters.academicStanding;

  // Determine correct sort field based on filter granularity
  let sortField = 'ranking.instituteRank';
  if (query.sectionId) sortField = 'ranking.sectionRank';
  else if (query.classId) sortField = 'ranking.classRank';
  else if (query.branchId) sortField = 'ranking.branchRank';

  // Sort ascending by rank (1 is best)
  pagination.sort = { [sortField]: 1 };

  return academicRecordRepository.getPaginatedRecords(query, pagination);
};

/**
 * getStudentAnalytics
 * Returns a student's full academic record including GPA history.
 */
const getStudentAnalytics = async (studentId, sessionId, user) => {
  const query = { studentId, sessionId, isDeleted: false };

  // RBAC checks
  switch (user.role) {
    case 'STUDENT':
      if (String(user._id) !== String(studentId)) {
        throw { status: 403, message: 'You can only view your own academic records' };
      }
      break;
    case 'PARENT':
      const parentOf = (user.parentOf || []).map(String);
      if (!parentOf.includes(String(studentId))) {
        throw { status: 403, message: 'This student is not linked to your parent account' };
      }
      break;
    case 'TEACHER':
    case 'INSTITUTE_ADMIN':
      query.instituteId = user.instituteId;
      break;
    case 'BRANCH_ADMIN':
      query.branchId = user.branchId;
      break;
  }

  const record = await academicRecordRepository.getStudentAnalytics(query);
  
  if (!record) {
    throw { status: 404, message: 'Academic record not found' };
  }

  return record;
};

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  calculateSessionRecords,
  getMeritList,
  getStudentAnalytics,
};
