const courseRepository   = require('../repositories/course.repository');
const userRepository     = require('../repositories/user.repository');
const subjectRepository  = require('../repositories/subject.repository');
const classRepository    = require('../repositories/class.repository');
const sectionRepository  = require('../repositories/section.repository');
const { auditLog }       = require('../utils/auditLogger');
const { ROLES }          = require('../constants/roles');

/**
 * COURSE SERVICE — Phase 9
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
const validateRelationalEntities = async (data, instituteId) => {
  // 1. Verify Teacher
  const teacher = await userRepository.findOne({
    _id: data.teacherId,
    instituteId,
    role: ROLES.TEACHER,
  });
  if (!teacher) throw { status: 404, message: 'Teacher not found in this institute' };

  // 2. Verify Subject
  const subject = await subjectRepository.findOne({ _id: data.subjectId, instituteId });
  if (!subject) throw { status: 404, message: 'Subject not found in this institute' };

  // 3. Verify Class & Section
  const cls = await classRepository.findOne({ _id: data.classId, instituteId });
  if (!cls) throw { status: 404, message: 'Class not found in this institute' };

  const section = await sectionRepository.findOne({ _id: data.sectionId, classId: data.classId, instituteId });
  if (!section) throw { status: 404, message: 'Section not found for this class' };
};

// ── Create Course ─────────────────────────────────────────────────────────────
const createCourse = async (data, creatorUser) => {
  const instituteId = creatorUser.instituteId;
  const branchId = data.branchId;

  // TEACHER role check: can only create courses for themselves
  if (creatorUser.role === ROLES.TEACHER) {
    if (data.teacherId !== creatorUser._id.toString()) {
      throw { status: 403, message: 'Teachers can only create courses assigned to themselves' };
    }
    if (data.branchId !== creatorUser.branchId.toString()) {
      throw { status: 403, message: 'Teachers can only create courses in their own branch' };
    }
  }

  // Validate Foreign Keys
  await validateRelationalEntities(data, instituteId);

  // Prevent Duplicate Course
  const duplicate = await courseRepository.findOne({
    teacherId: data.teacherId,
    subjectId: data.subjectId,
    sectionId: data.sectionId,
    sessionId: data.sessionId,
  });

  if (duplicate) {
    throw { status: 409, message: 'This teacher already has a course for this subject in the specified section and session.' };
  }

  const course = await courseRepository.create({
    ...data,
    instituteId,
    createdBy: creatorUser._id,
    updatedBy: creatorUser._id,
  });

  await auditLog({
    userId: creatorUser._id,
    role: creatorUser.role,
    action: 'CREATE',
    resource: 'Course',
    resourceId: course._id,
  });

  return course;
};

// ── Get All Courses ───────────────────────────────────────────────────────────
const getAllCourses = async (queryOptions, tenantFilter) => {
  return courseRepository.searchCourses(tenantFilter, queryOptions, queryOptions);
};

// ── Get Single Course ─────────────────────────────────────────────────────────
const getCourseById = async (id, tenantFilter) => {
  const course = await courseRepository.findOne(
    { _id: id, ...tenantFilter },
    'teacherId subjectId classId sectionId sessionId branchId createdBy'
  );
  if (!course) throw { status: 404, message: 'Course not found or access denied' };
  return course;
};

// ── Update Course ─────────────────────────────────────────────────────────────
const updateCourse = async (id, data, updaterUser, tenantFilter) => {
  const existing = await courseRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'Course not found or access denied' };

  // TEACHER role check: can only update their own courses
  if (updaterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== updaterUser._id.toString()) {
    throw { status: 403, message: 'You can only update your own courses' };
  }

  // Prevent foreign key changes without full validation
  if (data.teacherId || data.subjectId || data.sectionId) {
    const checkData = {
      teacherId: data.teacherId || existing.teacherId,
      subjectId: data.subjectId || existing.subjectId,
      classId:   data.classId   || existing.classId,
      sectionId: data.sectionId || existing.sectionId,
    };
    await validateRelationalEntities(checkData, existing.instituteId);
  }

  const updated = await courseRepository.updateById(id, {
    ...data,
    updatedBy: updaterUser._id,
  });

  await auditLog({
    userId: updaterUser._id,
    role: updaterUser.role,
    action: 'UPDATE',
    resource: 'Course',
    resourceId: id,
  });

  return updated;
};

// ── Change Status ─────────────────────────────────────────────────────────────
const changeCourseStatus = async (id, status, updaterUser, tenantFilter) => {
  const existing = await courseRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'Course not found or access denied' };

  if (updaterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== updaterUser._id.toString()) {
    throw { status: 403, message: 'You can only change the status of your own courses' };
  }

  const updated = await courseRepository.updateById(id, { status, updatedBy: updaterUser._id });

  await auditLog({
    userId: updaterUser._id,
    role: updaterUser.role,
    action: 'STATUS_CHANGE',
    resource: 'Course',
    resourceId: id,
    metadata: { oldStatus: existing.status, newStatus: status },
  });

  return updated;
};

// ── Delete Course ─────────────────────────────────────────────────────────────
const deleteCourse = async (id, deleterUser, tenantFilter) => {
  const existing = await courseRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'Course not found or access denied' };

  if (deleterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== deleterUser._id.toString()) {
    throw { status: 403, message: 'You can only delete your own courses' };
  }

  await courseRepository.softDelete(id, deleterUser._id);

  await auditLog({
    userId: deleterUser._id,
    role: deleterUser.role,
    action: 'SOFT_DELETE',
    resource: 'Course',
    resourceId: id,
  });
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  changeCourseStatus,
  deleteCourse,
};
