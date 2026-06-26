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
      throw { status: 403, message: 'Teachers can only create subjects assigned to themselves' };
    }
    if (data.branchId !== creatorUser.branchId.toString()) {
      throw { status: 403, message: 'Teachers can only create subjects in their own branch' };
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
    throw { status: 409, message: 'This teacher already has this subject assigned in the specified section and session.' };
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
  const Subject = require('../models/Subject');
  const query = { ...tenantFilter, isDeleted: { $ne: true } };

  if (queryOptions.teacherId) query.teacherId = queryOptions.teacherId;
  if (queryOptions.branchId) query.branchId = queryOptions.branchId;
  if (queryOptions.status) query.status = queryOptions.status;

  if (queryOptions.search) {
    query.$or = [
      { name: { $regex: queryOptions.search, $options: 'i' } },
      { code: { $regex: queryOptions.search, $options: 'i' } },
    ];
  }

  const page = parseInt(queryOptions.page) || 1;
  const limit = parseInt(queryOptions.limit) || 100;
  const skip = (page - 1) * limit;

  const [subjects, total] = await Promise.all([
    Subject.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('teacherId', 'name email avatar')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('branchId', 'name code'),
    Subject.countDocuments(query),
  ]);

  const Enrollment = require('../models/Enrollment');

  const mappedCourses = await Promise.all(subjects.map(async (s) => {
    const enrolledCount = await Enrollment.countDocuments({
      courseId: s._id,
      status: 'ACTIVE',
      isDeleted: false,
    });

    return {
      _id: s._id,
      title: s.name,
      code: s.code,
      description: `Assigned Subject: ${s.name}`,
      teacherId: s.teacherId || null,
      subjectId: s._id,
      classId: s.classId || null,
      sectionId: s.sectionId || null,
      status: s.status === 'ACTIVE' ? 'PUBLISHED' : 'DRAFT',
      branchId: s.branchId,
      createdBy: s.createdBy || null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      enrolledCount,
    };
  }));

  return {
    data: mappedCourses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

// ── Get Single Course ─────────────────────────────────────────────────────────
const getCourseById = async (id, tenantFilter) => {
  const Subject = require('../models/Subject');
  const subject = await Subject.findOne({ _id: id, ...tenantFilter })
    .populate('teacherId', 'name email avatar')
    .populate('classId', 'name code')
    .populate('sectionId', 'name')
    .populate('branchId', 'name code');

  if (!subject) throw { status: 404, message: 'Subject not found or access denied' };

  return {
    _id: subject._id,
    title: subject.name,
    code: subject.code,
    description: `Assigned Subject: ${subject.name}`,
    teacherId: subject.teacherId || null,
    subjectId: subject._id,
    classId: subject.classId || null,
    sectionId: subject.sectionId || null,
    status: subject.status === 'ACTIVE' ? 'PUBLISHED' : 'DRAFT',
    branchId: subject.branchId,
    createdBy: subject.createdBy || null,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
  };
};

// ── Update Course ─────────────────────────────────────────────────────────────
const updateCourse = async (id, data, updaterUser, tenantFilter) => {
  const existing = await courseRepository.findOne({ _id: id, ...tenantFilter });
  if (!existing) throw { status: 404, message: 'Subject not found or access denied' };

  // TEACHER role check: can only update their own courses
  if (updaterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== updaterUser._id.toString()) {
    throw { status: 403, message: 'You can only update your own subjects' };
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
  if (!existing) throw { status: 404, message: 'Subject not found or access denied' };

  if (updaterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== updaterUser._id.toString()) {
    throw { status: 403, message: 'You can only change the status of your own subjects' };
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
  if (!existing) throw { status: 404, message: 'Subject not found or access denied' };

  if (deleterUser.role === ROLES.TEACHER && existing.teacherId.toString() !== deleterUser._id.toString()) {
    throw { status: 403, message: 'You can only delete your own subjects' };
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
