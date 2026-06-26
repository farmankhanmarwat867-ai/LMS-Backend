const examRepository = require('../repositories/exam.repository');
const classRepository = require('../repositories/class.repository');
const AuditLogger = require('../utils/auditLogger');
const { ROLES } = require('../constants/roles');

const createExam = async (data, user, tenantFilter) => {
  const { title, examCode, examType, sessionId, classId, sectionId, startDate, endDate, description, status } = data;

  // Validate Dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    throw { status: 400, message: 'startDate cannot be in the past' };
  }
  if (start > end) {
    throw { status: 400, message: 'startDate must be before or equal to endDate' };
  }

  // Check unique examCode within tenant
  const existingCode = await examRepository.findByExamCode(examCode, tenantFilter);
  if (existingCode) {
    throw { status: 409, message: 'An exam with this code already exists in your institute/branch' };
  }

  const classObj = await classRepository.findById(classId);
  if (!classObj || classObj.isDeleted) {
    throw { status: 404, message: 'Class not found' };
  }

  // Ensure instituteId and branchId from tenantFilter are applied, or user, or class
  const instituteId = tenantFilter.instituteId || user.instituteId || classObj.instituteId;
  const branchId = tenantFilter.branchId || user.branchId || classObj.branchId;

  const exam = await examRepository.create({
    title,
    examCode,
    examType,
    sessionId,
    classId,
    sectionId,
    startDate,
    endDate,
    description,
    status: status || 'DRAFT',
    instituteId,
    branchId,
    createdBy: user._id,
  });

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'EXAM_CREATED',
    resource: 'Exam',
    resourceId: exam._id,
    metadata: { title, examCode, examType },
  });

  return exam;
};

const getExams = async (query, user, tenantFilter) => {
  const { page, limit, sessionId, classId, sectionId, examType, status, search } = query;
  return examRepository.searchExams(tenantFilter, { sessionId, classId, sectionId, examType, status, search }, { page, limit });
};

const getExamById = async (id, user, tenantFilter) => {
  const exam = await examRepository.findByIdPopulated(id, tenantFilter);
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }
  return exam;
};

const updateExam = async (id, data, user, tenantFilter) => {
  const exam = await examRepository.findById(id);
  if (!exam || exam.isDeleted) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && exam.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }
  if (tenantFilter.branchId && exam.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }

  if (data.examCode && data.examCode !== exam.examCode) {
    const existingCode = await examRepository.findByExamCode(data.examCode, tenantFilter);
    if (existingCode && existingCode._id.toString() !== id.toString()) {
      throw { status: 409, message: 'An exam with this code already exists' };
    }
  }

  if (data.startDate || data.endDate) {
    const start = new Date(data.startDate || exam.startDate);
    const end = new Date(data.endDate || exam.endDate);
    if (start > end) {
      throw { status: 400, message: 'startDate must be before or equal to endDate' };
    }
  }

  const payload = { ...data, updatedBy: user._id };

  const updatedExam = await examRepository.updateById(id, payload);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'EXAM_UPDATED',
    resource: 'Exam',
    resourceId: exam._id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return updatedExam;
};

const updateExamStatus = async (id, status, user, tenantFilter) => {
  const exam = await examRepository.findById(id);
  if (!exam || exam.isDeleted) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && exam.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }
  if (tenantFilter.branchId && exam.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }

  const validStatuses = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const updatedExam = await examRepository.updateById(id, { status, updatedBy: user._id });

  let action = 'EXAM_UPDATED';
  if (status === 'SCHEDULED') action = 'EXAM_SCHEDULED';
  if (status === 'CANCELLED') action = 'EXAM_CANCELLED';
  if (status === 'COMPLETED') action = 'EXAM_COMPLETED';

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action,
    resource: 'Exam',
    resourceId: exam._id,
    metadata: { previousStatus: exam.status, newStatus: status },
  });

  return updatedExam;
};

const deleteExam = async (id, user, tenantFilter) => {
  const exam = await examRepository.findById(id);
  if (!exam || exam.isDeleted) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && exam.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }
  if (tenantFilter.branchId && exam.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam not found' };
  }

  await examRepository.softDelete(id);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'Exam',
    resourceId: exam._id,
  });

  return { message: 'Exam soft deleted successfully' };
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  updateExamStatus,
  deleteExam,
};
