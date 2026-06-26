const examScheduleRepository = require('../repositories/examSchedule.repository');
const examRepository = require('../repositories/exam.repository');
const subjectRepository = require('../repositories/subject.repository');
const courseRepository = require('../repositories/course.repository');
const userRepository = require('../repositories/user.repository');
const AuditLogger = require('../utils/auditLogger');
const { ROLES } = require('../constants/roles');

const validateReferences = async (examId, subjectId, teacherId, tenantFilter) => {
  const exam = await examRepository.findById(examId);
  if (!exam || exam.isDeleted) throw { status: 404, message: 'Exam not found' };

  const subject = await subjectRepository.findById(subjectId);
  if (!subject || subject.isDeleted) throw { status: 404, message: 'Subject not found' };

  const teacher = await userRepository.findById(teacherId);
  if (!teacher || teacher.isDeleted || teacher.role !== ROLES.TEACHER) {
    throw { status: 404, message: 'Teacher not found or user is not a teacher' };
  }

  // Basic tenant checks
  if (tenantFilter.instituteId) {
    if (exam.instituteId.toString() !== tenantFilter.instituteId.toString()) throw { status: 404, message: 'Exam not found' };
  }

  return { exam, subject, teacher };
};

const createSchedule = async (data, user, tenantFilter) => {
  const { examId, subjectId, teacherId, classId, sectionId, examDate, startTime, endTime, totalMarks, passingMarks, roomNumber, instructions } = data;

  const { exam } = await validateReferences(examId, subjectId, teacherId, tenantFilter);

  // Validate passingMarks <= totalMarks
  if (passingMarks > totalMarks) {
    throw { status: 400, message: 'passingMarks cannot be greater than totalMarks' };
  }

  // Prevent duplicate schedules
  const existing = await examScheduleRepository.findDuplicate(examId, subjectId, classId, sectionId, tenantFilter);
  if (existing) {
    throw { status: 409, message: 'Exam schedule for this subject and class already exists in this exam' };
  }

  // Ensure instituteId and branchId from tenantFilter are applied, or user, or exam container
  const instituteId = tenantFilter.instituteId || user.instituteId || exam.instituteId;
  const branchId = tenantFilter.branchId || user.branchId || exam.branchId;

  const schedule = await examScheduleRepository.create({
    examId,
    subjectId,
    teacherId,
    classId,
    sectionId,
    examDate,
    startTime,
    endTime,
    totalMarks,
    passingMarks,
    roomNumber,
    instructions,
    status: 'SCHEDULED',
    instituteId,
    branchId,
    createdBy: user._id,
  });

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'EXAM_SCHEDULE_CREATED',
    resource: 'ExamSchedule',
    resourceId: schedule._id,
    metadata: { examId, subjectId, classId, sectionId },
  });

  return schedule;
};

const getSchedules = async (query, user, tenantFilter) => {
  const { page, limit, examId, subjectId, classId, sectionId, teacherId, status } = query;
  return examScheduleRepository.searchSchedules(tenantFilter, { examId, subjectId, classId, sectionId, teacherId, status }, { page, limit });
};

const getScheduleById = async (id, user, tenantFilter) => {
  const schedule = await examScheduleRepository.findByIdPopulated(id, tenantFilter);
  if (!schedule) {
    throw { status: 404, message: 'Exam schedule not found' };
  }
  return schedule;
};

const updateSchedule = async (id, data, user, tenantFilter) => {
  const schedule = await examScheduleRepository.findById(id);
  if (!schedule || schedule.isDeleted) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && schedule.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }
  if (tenantFilter.branchId && schedule.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  // Handle updates that change references
  if (data.examId || data.subjectId || data.teacherId) {
    await validateReferences(
      data.examId || schedule.examId,
      data.subjectId || schedule.subjectId,
      data.teacherId || schedule.teacherId,
      tenantFilter
    );
  }

  if (data.totalMarks !== undefined || data.passingMarks !== undefined) {
    const total = data.totalMarks !== undefined ? data.totalMarks : schedule.totalMarks;
    const passing = data.passingMarks !== undefined ? data.passingMarks : schedule.passingMarks;
    if (passing > total) {
      throw { status: 400, message: 'passingMarks cannot be greater than totalMarks' };
    }
  }

  const payload = { ...data, updatedBy: user._id };
  // Cannot update status via this endpoint, use PATCH
  delete payload.status;

  const updatedSchedule = await examScheduleRepository.updateById(id, payload);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'EXAM_SCHEDULE_UPDATED',
    resource: 'ExamSchedule',
    resourceId: schedule._id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return updatedSchedule;
};

const updateScheduleStatus = async (id, status, user, tenantFilter) => {
  const schedule = await examScheduleRepository.findById(id);
  if (!schedule || schedule.isDeleted) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && schedule.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }
  if (tenantFilter.branchId && schedule.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  const validStatuses = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const updatedSchedule = await examScheduleRepository.updateById(id, { status, updatedBy: user._id });

  let action = 'EXAM_SCHEDULE_UPDATED';
  if (status === 'CANCELLED') action = 'EXAM_SCHEDULE_CANCELLED';
  if (status === 'COMPLETED') action = 'EXAM_SCHEDULE_COMPLETED';

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action,
    resource: 'ExamSchedule',
    resourceId: schedule._id,
    metadata: { previousStatus: schedule.status, newStatus: status },
  });

  return updatedSchedule;
};

const deleteSchedule = async (id, user, tenantFilter) => {
  const schedule = await examScheduleRepository.findById(id);
  if (!schedule || schedule.isDeleted) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  // Check tenant access
  if (tenantFilter.instituteId && schedule.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }
  if (tenantFilter.branchId && schedule.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 404, message: 'Exam schedule not found' };
  }

  await examScheduleRepository.softDelete(id);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'EXAM_SCHEDULE_DELETED',
    resource: 'ExamSchedule',
    resourceId: schedule._id,
  });

  return { message: 'Exam schedule soft deleted successfully' };
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
};
