/**
 * Report Card Service — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * Business Logic Layer for Report Card Management.
 *
 * Key Design Decisions:
 *  - Snapshot-based: report cards are frozen snapshots of results at generation time
 *  - Session-wide attendance: uses full academic session date range (not exam date)
 *  - Dense Ranking: ties get same rank, next rank is immediate next integer
 *  - Locking: publishing sets isLocked=true, only admins can unlock
 *  - RBAC: students/parents can only see PUBLISHED cards
 *  - Tenant isolation: all queries scoped to instituteId/branchId
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ReportCard   = require('../models/ReportCard');
const Result       = require('../models/Result');
const Exam         = require('../models/Exam');
const ExamSchedule = require('../models/ExamSchedule');
const Attendance   = require('../models/Attendance');
const Subject      = require('../models/Subject');
const AcademicSession = require('../models/AcademicSession');
const reportCardRepository = require('../repositories/reportCard.repository');
const AuditLogger  = require('../utils/auditLogger');
const mongoose     = require('mongoose');

// ══════════════════════════════════════════════════════════════════════════════
//  PRIVATE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Dense Ranking — assigns ranks by descending percentage.
 * Ties receive the SAME rank; the next distinct percentage gets rank+1.
 *
 * Example:
 *   95%, 95%, 90% → Rank 1, 1, 2   ✓ (Dense)
 *   NOT: 1, 1, 3                    ✗ (Standard)
 *
 * @param {Array}  cards     - Array of plain objects with a `percentage` field.
 * @param {String} rankField - 'rankInClass' or 'rankInSection'.
 */
const applyDenseRanking = (cards, rankField) => {
  if (!cards || cards.length === 0) return;

  // Sort descending by percentage
  cards.sort((a, b) => b.percentage - a.percentage);

  let currentRank = 1;
  let prevPct = cards[0].percentage;

  for (const card of cards) {
    if (card.percentage < prevPct) {
      currentRank++;
      prevPct = card.percentage;
    }
    card[rankField] = currentRank;
  }
};

/**
 * Overall Grade & GPA from final percentage.
 * Scale matches result.service.js — keep both in sync.
 *
 * @param {Number} percentage
 * @returns {{ grade: String, gpa: Number }}
 */
const getOverallGradeAndGPA = (percentage) => {
  if (percentage >= 90) return { grade: 'A+', gpa: 4.0 };
  if (percentage >= 80) return { grade: 'A',  gpa: 3.7 };
  if (percentage >= 70) return { grade: 'B',  gpa: 3.0 };
  if (percentage >= 60) return { grade: 'C',  gpa: 2.0 };
  if (percentage >= 50) return { grade: 'D',  gpa: 1.0 };
  if (percentage >= 40) return { grade: 'E',  gpa: 0.5 };
  return { grade: 'F', gpa: 0.0 };
};

/**
 * Generates a human-readable report card number.
 * Format: RC-{EXAMCODE}-{STUDENT_ID_SUFFIX}
 * e.g.  RC-MID-2026-A3F9B2
 *
 * @param {String} examCode
 * @param {ObjectId} studentId
 * @returns {String}
 */
const buildReportCardNumber = (examCode, studentId) =>
  `RC-${examCode}-${String(studentId).slice(-6).toUpperCase()}`;

/**
 * Fetch session-wide attendance summary for a student.
 *
 * Per spec: attendance covers the ENTIRE academic session period,
 * not just the exam date range.
 *
 * @param {ObjectId} studentId
 * @param {Object}   session   - AcademicSession document (startDate, endDate)
 * @param {ObjectId} instituteId
 * @returns {{ totalDays, present, absent, late }}
 */
const fetchAttendanceSummary = async (studentId, session, instituteId) => {
  const dateFilter = {};
  if (session?.startDate) dateFilter.$gte = session.startDate;
  if (session?.endDate)   dateFilter.$lte = session.endDate;

  const records = await Attendance.find({
    instituteId,
    isDeleted: false,
    ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    'attendees.studentId': studentId,
  }).lean();

  let present = 0, absent = 0, late = 0;

  for (const record of records) {
    const attendee = record.attendees.find(
      (a) => String(a.studentId) === String(studentId)
    );
    if (!attendee) continue;
    switch (attendee.status) {
      case 'PRESENT': present++; break;
      case 'ABSENT':  absent++;  break;
      case 'LATE':    late++;    break;
      case 'EXCUSED': absent++;  break; // treat EXCUSED as absent for totals
    }
  }

  return {
    totalDays: present + absent + late,
    present,
    absent,
    late,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
//  GENERATE REPORT CARDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * generateReportCards(examId, filters, user)
 *
 * Flow:
 *   1. Validate Exam + RBAC
 *   2. Fetch PUBLISHED Results for the exam (via ExamSchedule join)
 *   3. Group results by student, aggregate marks
 *   4. Build snapshot subject-result list per student
 *   5. Calculate overall percentage, grade, GPA
 *   6. Fetch session-wide attendance per student
 *   7. Apply Dense Ranking (class + section)
 *   8. Bulk upsert DRAFT report cards
 *   9. Write audit log
 *
 * @param {String|ObjectId} examId
 * @param {Object}          filters  - { classId?, sectionId?, studentId? }
 * @param {Object}          user     - Authenticated user from req.user
 * @returns {{ generated: Number }}
 */
const generateReportCards = async (examId, filters = {}, user) => {
  // ── 1. Validate Exam ────────────────────────────────────────────────────────
  const exam = await Exam.findById(examId);
  if (!exam || exam.isDeleted) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Tenant / role authorization
  if (user.role === 'INSTITUTE_ADMIN' && String(exam.instituteId) !== String(user.instituteId)) {
    throw { status: 403, message: 'Not authorized for this exam' };
  }
  if (user.role === 'BRANCH_ADMIN' && String(exam.branchId) !== String(user.branchId)) {
    throw { status: 403, message: 'Not authorized for this exam' };
  }
  if (user.role === 'TEACHER' && String(exam.instituteId) !== String(user.instituteId)) {
    throw { status: 403, message: 'Not authorized for this exam' };
  }

  // ── 2. Fetch related ExamSchedules ─────────────────────────────────────────
  const schedules = await ExamSchedule.find({
    examId: exam._id,
    isDeleted: false,
  }).lean();

  if (schedules.length === 0) {
    throw { status: 400, message: 'No exam schedules found for this exam. Create ExamSchedules first.' };
  }

  const scheduleIds = schedules.map((s) => s._id);

  // Build a lookup map: scheduleId → schedule (for marks + subject info)
  const scheduleMap = {};
  for (const s of schedules) {
    scheduleMap[String(s._id)] = s;
  }

  // ── 3. Fetch PUBLISHED Results ──────────────────────────────────────────────
  const resultQuery = {
    examScheduleId: { $in: scheduleIds },
    isPublished: true,
    isDeleted: false,
  };
  if (filters.classId)   resultQuery.classId   = filters.classId;
  if (filters.sectionId) resultQuery.sectionId = filters.sectionId;
  if (filters.studentId) resultQuery.studentId = filters.studentId;

  const results = await Result.find(resultQuery).lean();

  if (results.length === 0) {
    throw {
      status: 400,
      message: 'No published results found for this exam. Publish results first before generating report cards.',
    };
  }

  // Pre-load all subjects in one query for efficiency
  const subjectIds = [...new Set(schedules.map((s) => String(s.subjectId)))];
  const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).lean();
  const subjectMap = {};
  for (const sub of subjectDocs) {
    subjectMap[String(sub._id)] = sub;
  }

  // ── 4. Group results by studentId ───────────────────────────────────────────
  const studentMap = {};

  for (const r of results) {
    const sId = String(r.studentId);
    const schedule = scheduleMap[String(r.examScheduleId)];
    if (!schedule) continue; // orphan result — skip

    if (!studentMap[sId]) {
      studentMap[sId] = {
        studentId:    r.studentId,
        classId:      r.classId,
        sectionId:    r.sectionId,
        subjectResults: [],
        totalMarks:   0,
        obtainedMarks: 0,
      };
    }

    const subject = subjectMap[String(schedule.subjectId)];
    const subjectName = subject ? subject.name : 'Unknown Subject';

    studentMap[sId].subjectResults.push({
      subjectId:     schedule.subjectId,
      subjectName,
      totalMarks:    schedule.totalMarks,
      marksObtained: r.marksObtained,
      percentage:    r.percentage,
      grade:         r.grade,
      gradePoint:    r.gradePoint,
      remarks:       r.remarks || '',
      status:        r.status,
    });

    studentMap[sId].totalMarks    += schedule.totalMarks;
    studentMap[sId].obtainedMarks += r.marksObtained;
  }

  // ── 5. Fetch Academic Session for attendance date range ─────────────────────
  let session = null;
  if (exam.sessionId) {
    session = await AcademicSession.findById(exam.sessionId).lean();
  }

  // ── 6. Build DRAFT report cards with attendance ─────────────────────────────
  const draftCards = [];

  for (const sId of Object.keys(studentMap)) {
    const st = studentMap[sId];

    // Avoid division by zero
    const percentage = st.totalMarks > 0
      ? parseFloat(((st.obtainedMarks / st.totalMarks) * 100).toFixed(2))
      : 0;

    const { grade, gpa } = getOverallGradeAndGPA(percentage);

    // Session-wide attendance
    const attendanceSummary = await fetchAttendanceSummary(
      st.studentId,
      session,
      exam.instituteId
    );

    draftCards.push({
      studentId:     st.studentId,
      examId:        exam._id,
      sessionId:     exam.sessionId,
      classId:       st.classId,
      sectionId:     st.sectionId,
      reportCardNumber: buildReportCardNumber(exam.examCode, st.studentId),
      subjectResults:   st.subjectResults,
      totalSubjects:    st.subjectResults.length,
      totalMarks:       st.totalMarks,
      obtainedMarks:    st.obtainedMarks,
      percentage,
      overallGrade:  grade,
      overallGPA:    gpa,
      attendanceSummary,
      rankInClass:   null,
      rankInSection: null,
      teacherComments:   '',
      principalComments: '',
      promotedToNextClass: percentage >= 40,
      status:    'DRAFT',
      isLocked:  false,
      publishedAt: null,
      publishedBy: null,
      instituteId: exam.instituteId,
      branchId:    exam.branchId,
    });
  }

  if (draftCards.length === 0) {
    throw { status: 400, message: 'No eligible students found to generate report cards for' };
  }

  // ── 7. Apply Dense Ranking ──────────────────────────────────────────────────
  // Class ranking (all students in the same class, across sections)
  const classGroups = {};
  for (const card of draftCards) {
    const key = String(card.classId);
    if (!classGroups[key]) classGroups[key] = [];
    classGroups[key].push(card);
  }
  for (const group of Object.values(classGroups)) {
    applyDenseRanking(group, 'rankInClass');
  }

  // Section ranking
  const sectionGroups = {};
  for (const card of draftCards) {
    const key = String(card.sectionId);
    if (!sectionGroups[key]) sectionGroups[key] = [];
    sectionGroups[key].push(card);
  }
  for (const group of Object.values(sectionGroups)) {
    applyDenseRanking(group, 'rankInSection');
  }

  // ── 8. Bulk Upsert ──────────────────────────────────────────────────────────
  // Fetch existing locked cards to avoid overwriting them or causing duplicate key errors on upsert
  const lockedCards = await ReportCard.find({
    examId: exam._id,
    isDeleted: false,
    isLocked: true
  }).select('studentId').lean();

  const lockedStudentIds = new Set(lockedCards.map(c => String(c.studentId)));

  const operations = draftCards
    .filter(card => !lockedStudentIds.has(String(card.studentId)))
    .map((card) => ({
      updateOne: {
        filter: {
          examId:    card.examId,
          studentId: card.studentId,
          isDeleted: false,
        },
        update: {
          $set:         { ...card, updatedBy: user._id },
          $setOnInsert: { createdBy: user._id },
        },
        upsert: true,
      },
    }));

  if (operations.length > 0) {
    await reportCardRepository.bulkWrite(operations);
  }

  // ── 9. Audit Log ────────────────────────────────────────────────────────────
  await AuditLogger.log({
    userId:   user._id,
    role:     user.role,
    action:   'REPORT_CARD_GENERATED',
    resource: 'ReportCard',
    metadata: {
      examId:    exam._id,
      examCode:  exam.examCode,
      generated: draftCards.length,
      filters,
    },
  });

  return { generated: draftCards.length };
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL REPORT CARDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * getReportCards(filters, pagination, user)
 * Paginated list — scoped by tenant and role.
 */
const getReportCards = async (filters = {}, pagination = {}, user) => {
  const query = { isDeleted: false };

  // Tenant isolation
  if (user.role === 'INSTITUTE_ADMIN' || user.role === 'TEACHER') {
    query.instituteId = user.instituteId;
  } else if (user.role === 'BRANCH_ADMIN') {
    query.branchId = user.branchId;
  }
  // SUPER_ADMIN sees everything (no tenant filter)

  // Optional filters
  if (filters.examId)    query.examId    = filters.examId;
  if (filters.classId)   query.classId   = filters.classId;
  if (filters.sectionId) query.sectionId = filters.sectionId;
  if (filters.status)    query.status    = filters.status;

  return reportCardRepository.getPaginatedReportCards(query, pagination);
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET SINGLE REPORT CARD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * getReportCardById(id, user)
 * Returns a single populated report card.
 * Students/parents can only see PUBLISHED cards.
 */
const getReportCardById = async (id, user) => {
  const query = { _id: id, isDeleted: false };

  switch (user.role) {
    case 'STUDENT':
      query.studentId = user._id;
      query.status = 'PUBLISHED';
      break;
    case 'PARENT': {
      const parentOf = (user.parentOf || []).map(String);
      if (parentOf.length === 0) {
        throw { status: 403, message: 'No linked children found for this parent account' };
      }
      query.studentId = { $in: user.parentOf };
      query.status = 'PUBLISHED';
      break;
    }
    case 'TEACHER':
    case 'INSTITUTE_ADMIN':
      query.instituteId = user.instituteId;
      break;
    case 'BRANCH_ADMIN':
      query.branchId = user.branchId;
      break;
    case 'SUPER_ADMIN':
      break; // no additional filter
    default:
      throw { status: 403, message: 'Access denied' };
  }

  const card = await ReportCard.findOne(query)
    .populate('studentId',   'name email avatar rollNumber')
    .populate('examId',      'title examCode examType startDate endDate')
    .populate('sessionId',   'name code startDate endDate')
    .populate('classId',     'name code')
    .populate('sectionId',   'name')
    .populate('publishedBy', 'name email')
    .populate('createdBy',   'name')
    .lean();

  if (!card) {
    throw { status: 404, message: 'Report card not found or access denied' };
  }

  return card;
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET STUDENT REPORT CARDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * getStudentReportCards(studentId, user)
 * Returns all report cards for a student.
 * Students see own PUBLISHED only; parents see child's PUBLISHED only.
 */
const getStudentReportCards = async (studentId, user) => {
  const query = { studentId, isDeleted: false };

  switch (user.role) {
    case 'STUDENT':
      if (String(user._id) !== String(studentId)) {
        throw { status: 403, message: 'You can only view your own report cards' };
      }
      query.status = 'PUBLISHED';
      break;
    case 'PARENT': {
      const parentOf = (user.parentOf || []).map(String);
      if (!parentOf.includes(String(studentId))) {
        throw { status: 403, message: 'This student is not linked to your parent account' };
      }
      query.status = 'PUBLISHED';
      break;
    }
    case 'TEACHER':
    case 'INSTITUTE_ADMIN':
      query.instituteId = user.instituteId;
      break;
    case 'BRANCH_ADMIN':
      query.branchId = user.branchId;
      break;
    case 'SUPER_ADMIN':
      break;
    default:
      throw { status: 403, message: 'Access denied' };
  }

  return ReportCard.find(query)
    .populate('examId',    'title examCode examType')
    .populate('sessionId', 'name code')
    .populate('classId',   'name code')
    .populate('sectionId', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

// ══════════════════════════════════════════════════════════════════════════════
//  ADD COMMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * addComments(id, comments, user)
 *
 * Rules:
 *  - TEACHER can only set teacherComments
 *  - INSTITUTE_ADMIN / BRANCH_ADMIN can set both
 *  - Locked (isLocked=true) cards reject all comment changes
 */
const addComments = async (id, comments, user) => {
  // Scope to tenant
  const query = { _id: id, isDeleted: false };
  if (user.role === 'TEACHER' || user.role === 'INSTITUTE_ADMIN') {
    query.instituteId = user.instituteId;
  } else if (user.role === 'BRANCH_ADMIN') {
    query.branchId = user.branchId;
  }

  const card = await ReportCard.findOne(query);
  if (!card) throw { status: 404, message: 'Report card not found' };

  if (card.isLocked) {
    throw {
      status: 403,
      message: 'Report card is locked (published). Unpublish first to edit comments.',
    };
  }

  switch (user.role) {
    case 'TEACHER':
      if (comments.teacherComments !== undefined) {
        card.teacherComments = comments.teacherComments;
      }
      break;
    case 'INSTITUTE_ADMIN':
    case 'BRANCH_ADMIN':
      if (comments.teacherComments !== undefined) {
        card.teacherComments = comments.teacherComments;
      }
      if (comments.principalComments !== undefined) {
        card.principalComments = comments.principalComments;
      }
      break;
    default:
      throw { status: 403, message: 'Not authorized to add comments' };
  }

  card.updatedBy = user._id;
  await card.save();

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'REPORT_CARD_COMMENT_ADDED',
    resource:   'ReportCard',
    resourceId: card._id,
    metadata:   { hasTeacherComment: !!card.teacherComments, hasPrincipalComment: !!card.principalComments },
  });

  return card;
};

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLISH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * publishReportCard(id, user)
 * Transitions DRAFT → PUBLISHED and locks the card.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN only.
 */
const publishReportCard = async (id, user) => {
  if (!['INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'].includes(user.role)) {
    throw { status: 403, message: 'Only INSTITUTE_ADMIN, BRANCH_ADMIN or TEACHER can publish report cards' };
  }

  const query = { _id: id, isDeleted: false };
  if (user.role === 'INSTITUTE_ADMIN' || user.role === 'TEACHER') query.instituteId = user.instituteId;
  if (user.role === 'BRANCH_ADMIN')   query.branchId    = user.branchId;

  const card = await ReportCard.findOne(query);
  if (!card) throw { status: 404, message: 'Report card not found' };
  if (card.status === 'PUBLISHED') {
    throw { status: 400, message: 'Report card is already published' };
  }

  card.status      = 'PUBLISHED';
  card.isLocked    = true;
  card.publishedAt = new Date();
  card.publishedBy = user._id;
  card.updatedBy   = user._id;

  await card.save();

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'REPORT_CARD_PUBLISHED',
    resource:   'ReportCard',
    resourceId: card._id,
    metadata:   { studentId: card.studentId, examId: card.examId },
  });

  return card;
};

// ══════════════════════════════════════════════════════════════════════════════
//  UNPUBLISH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * unpublishReportCard(id, user)
 * Transitions PUBLISHED → DRAFT and unlocks the card.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN only.
 */
const unpublishReportCard = async (id, user) => {
  if (!['INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'].includes(user.role)) {
    throw { status: 403, message: 'Only INSTITUTE_ADMIN, BRANCH_ADMIN or TEACHER can unpublish report cards' };
  }

  const query = { _id: id, isDeleted: false };
  if (user.role === 'INSTITUTE_ADMIN' || user.role === 'TEACHER') query.instituteId = user.instituteId;
  if (user.role === 'BRANCH_ADMIN')   query.branchId    = user.branchId;

  const card = await ReportCard.findOne(query);
  if (!card) throw { status: 404, message: 'Report card not found' };
  if (card.status !== 'PUBLISHED') {
    throw { status: 400, message: `Cannot unpublish a card with status '${card.status}'` };
  }

  card.status      = 'DRAFT';
  card.isLocked    = false;
  card.publishedAt = null;
  card.publishedBy = null;
  card.updatedBy   = user._id;

  await card.save();

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'REPORT_CARD_UNPUBLISHED',
    resource:   'ReportCard',
    resourceId: card._id,
    metadata:   { studentId: card.studentId, examId: card.examId },
  });

  return card;
};

// ══════════════════════════════════════════════════════════════════════════════
//  PDF STUB (Phase 17)  →  Puppeteer PDF in Phase 18
// ══════════════════════════════════════════════════════════════════════════════

/**
 * generatePdfStub(id, user)
 * Returns a styled HTML string representing the report card.
 * Phase 18 will replace this with an actual Puppeteer PDF.
 */
const generatePdfStub = async (id, user) => {
  const card = await getReportCardById(id, user);

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'REPORT_CARD_DOWNLOADED',
    resource:   'ReportCard',
    resourceId: card._id,
    metadata:   { format: 'HTML', phase: 17 },
  });

  const subjectRows = (card.subjectResults || [])
    .map(
      (s) => `
        <tr>
          <td>${s.subjectName}</td>
          <td>${s.marksObtained} / ${s.totalMarks}</td>
          <td>${s.percentage}%</td>
          <td><span class="grade grade-${s.grade?.replace('+', 'plus')}">${s.grade}</span></td>
          <td>${s.gradePoint}</td>
          <td><span class="badge ${s.status}">${s.status}</span></td>
        </tr>`
    )
    .join('');

  const att = card.attendanceSummary || {};
  const attPct = att.totalDays > 0
    ? ((att.present / att.totalDays) * 100).toFixed(1)
    : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Report Card — ${card.reportCardNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f4f6fb;
      color: #1a1d2e;
      padding: 40px;
    }
    .card {
      max-width: 860px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%);
      color: #fff;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; opacity: 0.8; }
    .rc-number { font-size: 12px; background: rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 12px; }
    .body { padding: 32px 40px; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 16px; }
    .info-box label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; display: block; margin-bottom: 6px; }
    .info-box .value { font-size: 15px; font-weight: 600; color: #1a1d2e; }
    .section-title {
      font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;
      color: #6b7280; margin-bottom: 12px; padding-bottom: 6px;
      border-bottom: 2px solid #e5e7eb;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th {
      background: #f1f5f9; text-align: left; padding: 10px 14px;
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
      color: #475569; font-weight: 600;
    }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafcff; }
    .grade { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 13px; background: #dbeafe; color: #1d4ed8; }
    .grade-A\\.plus, .grade-Aplus { background: #d1fae5; color: #065f46; }
    .grade-A { background: #dbeafe; color: #1d4ed8; }
    .grade-B { background: #ede9fe; color: #5b21b6; }
    .grade-C { background: #fef3c7; color: #92400e; }
    .grade-D { background: #ffedd5; color: #9a3412; }
    .grade-E { background: #fee2e2; color: #991b1b; }
    .grade-F { background: #fee2e2; color: #991b1b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge.PASS { background: #d1fae5; color: #065f46; }
    .badge.FAIL { background: #fee2e2; color: #991b1b; }
    .badge.ABSENT { background: #f3f4f6; color: #4b5563; }
    .badge.WITHHELD { background: #fef3c7; color: #92400e; }
    .badge.INCOMPLETE { background: #ede9fe; color: #5b21b6; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .summary-box {
      text-align: center; background: #f8fafc; border-radius: 10px; padding: 20px 12px;
      border: 1px solid #e5e7eb;
    }
    .summary-box .big { font-size: 28px; font-weight: 800; color: #1e3a5f; }
    .summary-box .label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-top: 4px; }
    .att-bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin: 8px 0; overflow: hidden; }
    .att-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); border-radius: 4px; }
    .comments { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .comments .label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
    .comments .text { font-size: 14px; color: #374151; font-style: italic; }
    .footer {
      background: #f8fafc; padding: 20px 40px;
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;
    }
    .published-badge {
      display: inline-block; background: #d1fae5; color: #065f46;
      border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600;
    }
    .draft-badge {
      display: inline-block; background: #fef3c7; color: #92400e;
      border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600;
    }
  </style>
</head>
<body>
<div class="card">
  <!-- Header -->
  <div class="header">
    <div>
      <h1>${card.examId?.title || 'Exam'} — Report Card</h1>
      <div class="subtitle">${card.sessionId?.name || 'Academic Session'} &nbsp;|&nbsp; ${card.classId?.name || ''} ${card.sectionId?.name || ''}</div>
    </div>
    <div class="rc-number">${card.reportCardNumber}</div>
  </div>

  <div class="body">
    <!-- Student Info -->
    <div class="section-title">Student Information</div>
    <div class="info-grid">
      <div class="info-box">
        <label>Student Name</label>
        <div class="value">${card.studentId?.name || 'N/A'}</div>
      </div>
      <div class="info-box">
        <label>Roll Number</label>
        <div class="value">${card.studentId?.rollNumber || 'N/A'}</div>
      </div>
      <div class="info-box">
        <label>Status</label>
        <div class="value">
          ${card.status === 'PUBLISHED'
            ? '<span class="published-badge">PUBLISHED</span>'
            : '<span class="draft-badge">DRAFT</span>'}
        </div>
      </div>
    </div>

    <!-- Overall Summary -->
    <div class="section-title">Overall Performance</div>
    <div class="summary-grid">
      <div class="summary-box">
        <div class="big">${card.percentage}%</div>
        <div class="label">Percentage</div>
      </div>
      <div class="summary-box">
        <div class="big" style="color:#2d6a9f">${card.overallGrade}</div>
        <div class="label">Overall Grade</div>
      </div>
      <div class="summary-box">
        <div class="big" style="color:#7c3aed">${card.overallGPA}</div>
        <div class="label">GPA (4.0 Scale)</div>
      </div>
      <div class="summary-box">
        <div class="big" style="color:#059669">#${card.rankInClass || 'N/A'}</div>
        <div class="label">Rank in Class</div>
      </div>
    </div>

    <!-- Subject Results -->
    <div class="section-title">Subject-wise Results (${card.totalSubjects} Subjects)</div>
    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Marks</th>
          <th>Percentage</th>
          <th>Grade</th>
          <th>Grade Points</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows}
      </tbody>
    </table>

    <!-- Totals -->
    <table style="margin-bottom:28px">
      <tr style="background:#f1f5f9;font-weight:700">
        <td>TOTAL</td>
        <td>${card.obtainedMarks} / ${card.totalMarks}</td>
        <td>${card.percentage}%</td>
        <td><span class="grade">${card.overallGrade}</span></td>
        <td>${card.overallGPA}</td>
        <td></td>
      </tr>
    </table>

    <!-- Attendance -->
    <div class="section-title">Attendance Summary (Full Session)</div>
    <div class="info-grid">
      <div class="info-box">
        <label>Total Days</label>
        <div class="value">${att.totalDays || 0}</div>
        <div class="att-bar"><div class="att-fill" style="width:100%"></div></div>
      </div>
      <div class="info-box">
        <label>Present</label>
        <div class="value" style="color:#059669">${att.present || 0} days (${attPct}%)</div>
        <div class="att-bar"><div class="att-fill" style="width:${attPct}%"></div></div>
      </div>
      <div class="info-box">
        <label>Absent / Late</label>
        <div class="value" style="color:#dc2626">${att.absent || 0} absent &nbsp; ${att.late || 0} late</div>
      </div>
    </div>

    <!-- Comments -->
    ${card.teacherComments ? `
    <div class="comments">
      <div class="label">Teacher Comments</div>
      <div class="text">"${card.teacherComments}"</div>
    </div>` : ''}
    ${card.principalComments ? `
    <div class="comments">
      <div class="label">Principal / Admin Comments</div>
      <div class="text">"${card.principalComments}"</div>
    </div>` : ''}

    <!-- Ranking -->
    <div class="info-grid">
      <div class="info-box">
        <label>Rank in Class</label>
        <div class="value">${card.rankInClass || '—'}</div>
      </div>
      <div class="info-box">
        <label>Rank in Section</label>
        <div class="value">${card.rankInSection || '—'}</div>
      </div>
      <div class="info-box">
        <label>Promoted to Next Class</label>
        <div class="value">${card.promotedToNextClass ? '✅ Yes' : '❌ No'}</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Report Card No: ${card.reportCardNumber}</span>
    ${card.publishedAt
      ? `<span>Published: ${new Date(card.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>`
      : '<span>Status: Draft — Not for Distribution</span>'}
    <span>Generated by LMS ERP &copy; ${new Date().getFullYear()}</span>
  </div>
</div>
</body>
</html>`;
};

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  generateReportCards,
  getReportCards,
  getReportCardById,
  getStudentReportCards,
  addComments,
  publishReportCard,
  unpublishReportCard,
  generatePdfStub,
};
