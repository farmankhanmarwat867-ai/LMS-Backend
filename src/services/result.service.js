/**
 * Result Service — Phase 16
 * ═══════════════════════════════════════════════════════════════════════════════
 * Business Logic Layer for Result Management.
 *
 * Features:
 *  - Auto grade, gradePoint, percentage, PASS/FAIL calculation
 *  - Academic alignment validation (institute, branch, class, section)
 *  - Active enrollment check (student must be enrolled in the course)
 *  - Result locking (isPublished) — teachers cannot modify/delete published results
 *  - ResultHistory — immutable change log created on every update
 *  - Tenant isolation for all list queries
 *  - Audit logging for all mutation operations
 *  - bulkImportResults stub — future Excel/CSV upload readiness
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const Result        = require('../models/Result');
const ResultHistory = require('../models/ResultHistory');
const resultRepository        = require('../repositories/result.repository');
const resultHistoryRepository = require('../repositories/resultHistory.repository');
const examScheduleRepository  = require('../repositories/examSchedule.repository');
const userRepository          = require('../repositories/user.repository');
const Enrollment    = require('../models/Enrollment');
const AuditLogger   = require('../utils/auditLogger');
const mongoose      = require('mongoose');

// ══════════════════════════════════════════════════════════════════════════════
//  GRADE CALCULATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Grade scale (matches Phase 17 Report Card & Phase 18 GPA requirements).
 * gradePoint will be stored on Result for direct GPA aggregation.
 */
const GRADE_SCALE = [
  { min: 90, grade: 'A+', gradePoint: 4.0 },
  { min: 80, grade: 'A',  gradePoint: 3.7 },
  { min: 70, grade: 'B',  gradePoint: 3.0 },
  { min: 60, grade: 'C',  gradePoint: 2.0 },
  { min: 50, grade: 'D',  gradePoint: 1.0 },
  { min: 40, grade: 'E',  gradePoint: 0.5 },
  { min: 0,  grade: 'F',  gradePoint: 0.0 },
];

/**
 * Calculate percentage, grade, gradePoint, and pass/fail status.
 *
 * @param {number} marksObtained
 * @param {number} totalMarks
 * @param {number} passingMarks
 * @param {string|null} explicitStatus - ABSENT | WITHHELD | INCOMPLETE
 * @returns {{ percentage, grade, gradePoint, status }}
 */
const calculateGradeAndStatus = (marksObtained, totalMarks, passingMarks, explicitStatus = null) => {
  // For non-graded statuses, return zero values and retain the explicit status.
  if (explicitStatus && ['ABSENT', 'WITHHELD', 'INCOMPLETE'].includes(explicitStatus)) {
    return { percentage: 0, grade: 'F', gradePoint: 0.0, status: explicitStatus };
  }

  const percentage = parseFloat(((marksObtained / totalMarks) * 100).toFixed(2));
  const status     = marksObtained >= passingMarks ? 'PASS' : 'FAIL';

  const match = GRADE_SCALE.find((s) => percentage >= s.min);
  const grade      = match ? match.grade      : 'F';
  const gradePoint = match ? match.gradePoint : 0.0;

  return { percentage, grade, gradePoint, status };
};

// ══════════════════════════════════════════════════════════════════════════════
//  VALIDATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that a student belongs to the same Institute/Branch/Class/Section
 * as the ExamSchedule, and has an active enrollment in the schedule's course.
 */
const validateStudentForSchedule = async (student, schedule) => {
  if (String(student.instituteId) !== String(schedule.instituteId)) {
    throw { status: 400, message: 'Student does not belong to this institute' };
  }
  if (String(student.branchId) !== String(schedule.branchId)) {
    throw { status: 400, message: 'Student does not belong to this branch' };
  }
  if (String(student.classId) !== String(schedule.classId)) {
    throw { status: 400, message: 'Student does not belong to this class' };
  }
  if (String(student.sectionId) !== String(schedule.sectionId)) {
    throw { status: 400, message: 'Student does not belong to this section' };
  }

  // Active enrollment check — student must be enrolled in the schedule's course
  const enrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId:  schedule.courseId,
    isDeleted: false,
    status: { $in: ['ACTIVE', 'COMPLETED'] },
  });
  if (!enrollment) {
    throw {
      status: 400,
      message: `Student is not enrolled in the course linked to this exam schedule`,
    };
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  SERVICE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * CREATE a single result.
 * Validates schedule, student, academic placement, marks range, and duplicates.
 * Auto-calculates percentage, grade, gradePoint, and status.
 */
const createResult = async (data, user) => {
  // 1. Resolve ExamSchedule
  const schedule = await examScheduleRepository.findById(data.examScheduleId);
  if (!schedule || schedule.isDeleted) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  // 2. Teacher RBAC — only for their assigned schedule
  if (user.role === 'TEACHER' && String(schedule.teacherId) !== String(user._id)) {
    throw { status: 403, message: 'You are not authorized to add results for this schedule' };
  }

  // 3. Resolve Student
  const student = await userRepository.findById(data.studentId);
  if (!student || student.role !== 'STUDENT' || student.isDeleted) {
    throw { status: 404, message: 'Student not found' };
  }

  // 4. Academic alignment + enrollment check
  await validateStudentForSchedule(student, schedule);

  // 5. Marks range check
  if (data.marksObtained > schedule.totalMarks) {
    throw {
      status: 400,
      message: `Marks obtained (${data.marksObtained}) cannot exceed total marks (${schedule.totalMarks})`,
    };
  }

  // 6. Duplicate check
  const existing = await resultRepository.findOne({
    examScheduleId: data.examScheduleId,
    studentId:      data.studentId,
    isDeleted:      false,
  });
  if (existing) {
    throw { status: 409, message: 'Result already exists for this student on this schedule' };
  }

  // 7. Auto-calculate
  const calc = calculateGradeAndStatus(
    data.marksObtained,
    schedule.totalMarks,
    schedule.passingMarks,
    data.status || null
  );

  // 8. Persist
  const resultData = {
    studentId:      data.studentId,
    examScheduleId: data.examScheduleId,
    classId:        schedule.classId,
    sectionId:      schedule.sectionId,
    marksObtained:  data.marksObtained,
    percentage:     calc.percentage,
    grade:          calc.grade,
    gradePoint:     calc.gradePoint,
    status:         calc.status,
    remarks:        data.remarks || '',
    instituteId:    schedule.instituteId,
    branchId:       schedule.branchId,
    createdBy:      user._id,
  };

  const result = await resultRepository.create(resultData);

  // 9. Audit log
  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'RESULT_CREATED',
    resource:   'Result',
    resourceId: result._id,
    metadata: {
      studentId:      result.studentId,
      examScheduleId: result.examScheduleId,
      marks:          result.marksObtained,
      grade:          result.grade,
      status:         result.status,
    },
  });

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET paginated results with tenant isolation and role-based filtering.
 */
const getResults = async (filters, pagination, user) => {
  const query = { isDeleted: false };

  // Apply tenant isolation
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;
  else if (user.role === 'TEACHER')         query.instituteId = user.instituteId;
  else if (user.role === 'STUDENT')         query.studentId   = user._id;
  else if (user.role === 'PARENT')          query.studentId   = { $in: user.parentOf || [] };

  // Apply extra filters (examScheduleId, classId, sectionId, status, etc.)
  const allowedFilters = ['examScheduleId', 'classId', 'sectionId', 'studentId', 'status', 'isPublished'];
  for (const key of allowedFilters) {
    if (filters[key]) query[key] = filters[key];
  }

  const page  = Math.max(parseInt(pagination.page)  || 1, 1);
  const limit = Math.min(parseInt(pagination.limit) || 10, 100);
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Result.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'name email avatar')
      .populate({
        path: 'examScheduleId',
        select: 'examDate totalMarks passingMarks startTime endTime subjectId examId',
        populate: [
          { path: 'subjectId', select: 'name code' },
          { path: 'examId',    select: 'title examCode' },
        ],
      })
      .populate('classId',   'name code')
      .populate('sectionId', 'name')
      .lean(),
    Result.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages:   Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET single result by ID with full population.
 * Enforces tenant/student/parent scoping.
 */
const getResultById = async (id, user) => {
  const query = { _id: id, isDeleted: false };

  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;
  else if (user.role === 'STUDENT')         query.studentId   = user._id;
  else if (user.role === 'PARENT')          query.studentId   = { $in: user.parentOf || [] };

  const result = await Result.findOne(query)
    .populate('studentId',  'name email avatar phone')
    .populate({
      path: 'examScheduleId',
      select: 'examDate totalMarks passingMarks startTime endTime roomNumber subjectId examId courseId',
      populate: [
        { path: 'subjectId', select: 'name code' },
        { path: 'examId',    select: 'title examCode' },
        { path: 'courseId',  select: 'title' },
      ],
    })
    .populate('classId',     'name code')
    .populate('sectionId',   'name')
    .populate('publishedBy', 'name role')
    .populate('createdBy',   'name role')
    .populate('updatedBy',   'name role')
    .lean();

  if (!result) throw { status: 404, message: 'Result not found' };
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * UPDATE a result.
 * - Blocks teachers from updating published results.
 * - Recalculates grade, gradePoint, percentage, status when marks change.
 * - Creates a ResultHistory entry for every change.
 * - Fires RESULT_UPDATED (and RESULT_STATUS_CHANGED if status changed).
 */
const updateResult = async (id, data, user) => {
  const query = { _id: id, isDeleted: false };
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;

  const result = await resultRepository.findOne(query);
  if (!result) throw { status: 404, message: 'Result not found' };

  // ── Locking check ─────────────────────────────────────────────────────────
  if (result.isPublished && user.role === 'TEACHER') {
    throw {
      status: 403,
      message: 'This result is published. Only INSTITUTE_ADMIN or BRANCH_ADMIN can modify it after unpublishing.',
    };
  }

  const schedule = await examScheduleRepository.findById(result.examScheduleId);

  // Teacher can only update results on their assigned schedule
  if (user.role === 'TEACHER' && String(schedule.teacherId) !== String(user._id)) {
    throw { status: 403, message: 'Not authorized to update this result' };
  }

  // ── Build update payload ──────────────────────────────────────────────────
  let updatePayload = { updatedBy: user._id };
  if (data.remarks !== undefined) updatePayload.remarks = data.remarks;

  // ── Recalculate if marks or status changed ────────────────────────────────
  const marksChanged  = data.marksObtained !== undefined && data.marksObtained !== result.marksObtained;
  const statusChanged = data.status        !== undefined && data.status        !== result.status;

  if (marksChanged || statusChanged) {
    const newMarks = data.marksObtained !== undefined ? data.marksObtained : result.marksObtained;

    if (newMarks > schedule.totalMarks) {
      throw {
        status: 400,
        message: `Marks obtained (${newMarks}) cannot exceed total marks (${schedule.totalMarks})`,
      };
    }

    const newStatus = data.status || null;
    const calc = calculateGradeAndStatus(newMarks, schedule.totalMarks, schedule.passingMarks, newStatus);

    updatePayload.marksObtained = newMarks;
    updatePayload.percentage    = calc.percentage;
    updatePayload.grade         = calc.grade;
    updatePayload.gradePoint    = calc.gradePoint;
    updatePayload.status        = calc.status;

    // ── Create ResultHistory entry ──────────────────────────────────────────
    await ResultHistory.create({
      resultId:       result._id,
      oldMarks:       result.marksObtained,
      newMarks:       newMarks,
      oldPercentage:  result.percentage,
      newPercentage:  calc.percentage,
      oldGrade:       result.grade,
      newGrade:       calc.grade,
      oldGradePoint:  result.gradePoint || 0,
      newGradePoint:  calc.gradePoint,
      oldStatus:      result.status,
      newStatus:      calc.status,
      changeReason:   data.changeReason || '',
      changedBy:      user._id,
      instituteId:    result.instituteId,
    });

    // ── Fire RESULT_STATUS_CHANGED if status changed ────────────────────────
    if (calc.status !== result.status) {
      await AuditLogger.log({
        userId:     user._id,
        role:       user.role,
        action:     'RESULT_STATUS_CHANGED',
        resource:   'Result',
        resourceId: result._id,
        metadata: {
          oldStatus: result.status,
          newStatus: calc.status,
          studentId: result.studentId,
        },
      });
    }
  }

  const updated = await resultRepository.updateById(id, updatePayload);

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'RESULT_UPDATED',
    resource:   'Result',
    resourceId: result._id,
    metadata: {
      studentId:      result.studentId,
      examScheduleId: result.examScheduleId,
      changes:        Object.keys(updatePayload),
    },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SOFT DELETE a result.
 * - Blocks teachers from deleting published results.
 * - TEACHER role is also blocked from deleting entirely (only Admins can delete).
 */
const deleteResult = async (id, user) => {
  const query = { _id: id, isDeleted: false };
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;

  const result = await resultRepository.findOne(query);
  if (!result) throw { status: 404, message: 'Result not found' };

  // Teachers cannot delete results (enforced at route level too, but double-checked here)
  if (user.role === 'TEACHER') {
    throw { status: 403, message: 'Teachers cannot delete results' };
  }

  // Locking check — even admins should unpublish first for clean workflow
  if (result.isPublished) {
    throw {
      status: 403,
      message: 'Cannot delete a published result. Please unpublish it first.',
    };
  }

  await resultRepository.softDelete(id, user._id);

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'RESULT_DELETED',
    resource:   'Result',
    resourceId: result._id,
    metadata: {
      studentId:      result.studentId,
      examScheduleId: result.examScheduleId,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUBLISH a result — locks it so teachers cannot modify.
 * Only INSTITUTE_ADMIN and BRANCH_ADMIN can publish.
 */
const publishResult = async (id, user) => {
  const query = { _id: id, isDeleted: false };
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;
  else throw { status: 403, message: 'Only INSTITUTE_ADMIN or BRANCH_ADMIN can publish results' };

  const result = await resultRepository.findOne(query);
  if (!result)            throw { status: 404, message: 'Result not found' };
  if (result.isPublished) throw { status: 409, message: 'Result is already published' };

  const updated = await resultRepository.updateById(id, {
    isPublished: true,
    publishedAt: new Date(),
    publishedBy: user._id,
    updatedBy:   user._id,
  });

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'RESULT_PUBLISHED',
    resource:   'Result',
    resourceId: result._id,
    metadata: {
      studentId:      result.studentId,
      examScheduleId: result.examScheduleId,
    },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * UNPUBLISH a result — unlocks it so teachers can modify again.
 * Only INSTITUTE_ADMIN and BRANCH_ADMIN can unpublish.
 */
const unpublishResult = async (id, user) => {
  const query = { _id: id, isDeleted: false };
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;
  else throw { status: 403, message: 'Only INSTITUTE_ADMIN or BRANCH_ADMIN can unpublish results' };

  const result = await resultRepository.findOne(query);
  if (!result)             throw { status: 404, message: 'Result not found' };
  if (!result.isPublished) throw { status: 409, message: 'Result is not published' };

  const updated = await resultRepository.updateById(id, {
    isPublished: false,
    publishedAt: null,
    publishedBy: null,
    updatedBy:   user._id,
  });

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'RESULT_UNPUBLISHED',
    resource:   'Result',
    resourceId: result._id,
    metadata: {
      studentId:      result.studentId,
      examScheduleId: result.examScheduleId,
    },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * BULK UPLOAD results — accepts an array of { studentId, marksObtained, status?, remarks? }
 * for a given examScheduleId.
 *
 * Strategy:
 *  - Validates each row individually; invalid rows are collected in `errors[]`
 *  - Valid rows are upserted (insert if not exists, update if already exists)
 *  - Published results are skipped if the user is a TEACHER
 *  - Returns { processed, failed, errors }
 */
const bulkUploadResults = async (examScheduleId, resultsData, user) => {
  const schedule = await examScheduleRepository.findById(examScheduleId);
  if (!schedule || schedule.isDeleted) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  if (user.role === 'TEACHER' && String(schedule.teacherId) !== String(user._id)) {
    throw { status: 403, message: 'Not authorized for this schedule' };
  }

  const operations       = [];
  const processedStudents = new Set();
  const errors           = [];

  for (const row of resultsData) {
    // ── Intra-batch duplicate check ─────────────────────────────────────────
    const studentKey = String(row.studentId);
    if (processedStudents.has(studentKey)) {
      errors.push({ studentId: row.studentId, error: 'Duplicate student in payload' });
      continue;
    }
    processedStudents.add(studentKey);

    // ── Marks range check ───────────────────────────────────────────────────
    if (row.marksObtained > schedule.totalMarks) {
      errors.push({
        studentId: row.studentId,
        error: `Marks (${row.marksObtained}) exceed totalMarks (${schedule.totalMarks})`,
      });
      continue;
    }

    // ── Validate student existence + academic alignment ─────────────────────
    let student;
    try {
      student = await userRepository.findById(row.studentId);
      if (!student || student.role !== 'STUDENT' || student.isDeleted) {
        throw new Error('Student not found or is not active');
      }
      await validateStudentForSchedule(student, schedule);
    } catch (err) {
      errors.push({ studentId: row.studentId, error: err.message });
      continue;
    }

    // ── Skip published results for teachers ─────────────────────────────────
    if (user.role === 'TEACHER') {
      const existingResult = await resultRepository.findOne({
        examScheduleId: schedule._id,
        studentId:      row.studentId,
        isDeleted:      false,
        isPublished:    true,
      });
      if (existingResult) {
        errors.push({ studentId: row.studentId, error: 'Result is published and cannot be updated' });
        continue;
      }
    }

    // ── Calculate grade ─────────────────────────────────────────────────────
    const calc = calculateGradeAndStatus(
      row.marksObtained,
      schedule.totalMarks,
      schedule.passingMarks,
      row.status || null
    );

    const doc = {
      studentId:      row.studentId,
      examScheduleId: schedule._id,
      classId:        schedule.classId,
      sectionId:      schedule.sectionId,
      marksObtained:  row.marksObtained,
      percentage:     calc.percentage,
      grade:          calc.grade,
      gradePoint:     calc.gradePoint,
      status:         calc.status,
      remarks:        row.remarks || '',
      instituteId:    schedule.instituteId,
      branchId:       schedule.branchId,
    };

    operations.push({
      updateOne: {
        filter: { examScheduleId: schedule._id, studentId: row.studentId, isDeleted: false },
        update: {
          $set:         { ...doc, updatedBy: user._id },
          $setOnInsert: { createdBy: user._id },
        },
        upsert: true,
      },
    });
  }

  // ── Execute bulk write ──────────────────────────────────────────────────────
  if (operations.length > 0) {
    await resultRepository.bulkWrite(operations);

    await AuditLogger.log({
      userId:   user._id,
      role:     user.role,
      action:   'RESULT_BULK_CREATED',
      resource: 'Result',
      metadata: {
        count:          operations.length,
        examScheduleId: schedule._id,
        errors:         errors.length,
      },
    });
  }

  return {
    processed: operations.length,
    failed:    errors.length,
    errors,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET student's own results (STUDENT dashboard).
 */
const getMyResults = async (user, pagination = {}) => {
  return resultRepository.findByStudentId(user._id, {}, pagination);
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET child's results (PARENT dashboard).
 * Validates that the requested studentId is in parent's parentOf array.
 */
const getChildResults = async (studentId, user, pagination = {}) => {
  const parentOf = (user.parentOf || []).map(String);
  if (!parentOf.includes(String(studentId))) {
    throw { status: 403, message: 'You are not authorized to view this student\'s results' };
  }
  return resultRepository.findByStudentId(studentId, {}, pagination);
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET result history for a given result ID.
 * Scoped to institute/branch for admins, or own student for student/parent.
 */
const getResultHistory = async (id, user) => {
  const query = { _id: id, isDeleted: false };
  if      (user.role === 'INSTITUTE_ADMIN') query.instituteId = user.instituteId;
  else if (user.role === 'BRANCH_ADMIN')    query.branchId    = user.branchId;
  else if (user.role === 'STUDENT')         query.studentId   = user._id;
  else if (user.role === 'PARENT')          query.studentId   = { $in: user.parentOf || [] };

  const result = await resultRepository.findOne(query);
  if (!result) throw { status: 404, message: 'Result not found' };

  return resultHistoryRepository.findByResultId(id);
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * BULK IMPORT RESULTS — Stub for future Excel/CSV upload support.
 *
 * When implemented, this will:
 *  1. Accept a parsed array from multer + xlsx/csv-parser
 *  2. Map columns to { studentId, marksObtained, status, remarks }
 *  3. Delegate to bulkUploadResults()
 *
 * POST /api/results/import  (future endpoint)
 * POST /api/results/export  (future endpoint)
 */
const bulkImportResults = async (parsedRows, examScheduleId, user) => {
  // TODO: Phase 17+ — implement Excel/CSV parsing and validation here
  // The service architecture is already in place via bulkUploadResults().
  throw {
    status: 501,
    message: 'Bulk import via Excel/CSV is not yet implemented. Use POST /api/results/bulk for JSON upload.',
  };
};

// ══════════════════════════════════════════════════════════════════════════════
module.exports = {
  createResult,
  getResults,
  getResultById,
  updateResult,
  deleteResult,
  publishResult,
  unpublishResult,
  bulkUploadResults,
  bulkImportResults,
  getMyResults,
  getChildResults,
  getResultHistory,
};
