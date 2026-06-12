const assignmentRepository = require('../repositories/assignment.repository');
const courseRepository = require('../repositories/course.repository');
const enrollmentRepository = require('../repositories/enrollment.repository');
const submissionRepository = require('../repositories/submission.repository');
const AuditLogger = require('../utils/auditLogger');
const { ROLES } = require('../constants/roles');

// ── Create Assignment ───────────────────────────────────────────────────────
const createAssignment = async (data, user, tenantFilter) => {
  // 1. Validate course exists and belongs to tenant
  const course = await courseRepository.findById(data.courseId);
  if (!course) throw { status: 404, message: 'Course not found' };

  if (
    tenantFilter.instituteId &&
    course.instituteId?.toString() !== tenantFilter.instituteId?.toString()
  ) {
    throw { status: 404, message: 'Course not found' };
  }

  // 2. Validate teacher owns the course
  // If user is TEACHER, course.teacherId must match user._id
  if (user.role === ROLES.TEACHER && course.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only create assignments for your own courses' };
  }

  // 3. Create the assignment
  const assignment = await assignmentRepository.create({
    ...data,
    teacherId: user._id, // Enforce the current user as the teacher creating it (or course.teacherId)
    instituteId: course.instituteId,
    branchId: course.branchId,
    createdBy: user._id,
  });

  // 4. Audit Log
  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ASSIGNMENT_CREATED',
    resource: 'Assignment',
    resourceId: assignment._id,
    metadata: { courseId: course._id, title: assignment.title },
  });

  return assignment;
};

// ── Get All Assignments (With Pagination) ───────────────────────────────────
const getAssignments = async (query, user, tenantFilter) => {
  const { page, limit, sortBy, sortOrder, status, courseId } = query;

  const filter = { ...tenantFilter, isDeleted: false };
  if (status) filter.status = status;
  if (courseId) filter.courseId = courseId;

  // STUDENT: only see PUBLISHED and CLOSED assignments
  if (user.role === ROLES.STUDENT) {
    filter.status = { $in: ['PUBLISHED', 'CLOSED'] };
    // Wait, technically they should only see assignments for courses they are enrolled in.
    // If courseId is provided, we can validate enrollment later or assume they are restricted in UI.
    // Ideally we filter by courses they are enrolled in.
    // We'll trust the frontend providing courseId, and if they access one directly we block.
    // For a global list, we fetch their enrollments first:
    if (!courseId) {
       const enrollments = await enrollmentRepository.find({ studentId: user._id, status: 'ACTIVE' });
       const courseIds = enrollments.map(e => e.courseId);
       filter.courseId = { $in: courseIds };
    } else {
       // Check if student is enrolled in the requested course
       const isEnrolled = await enrollmentRepository.find({ studentId: user._id, courseId: courseId, status: 'ACTIVE' });
       if (!isEnrolled || isEnrolled.length === 0) {
          throw { status: 403, message: 'You are not enrolled in this course' };
       }
    }
  }

  // TEACHER: only see their own assignments
  if (user.role === ROLES.TEACHER) {
    filter.teacherId = user._id;
  }

  return assignmentRepository.findWithPagination(filter, { page, limit, sortBy, sortOrder });
};

// ── Get Single Assignment ───────────────────────────────────────────────────
const getAssignmentById = async (id, user, tenantFilter) => {
  const assignment = await assignmentRepository.findByIdPopulated(id, tenantFilter);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };

  // STUDENT checks
  if (user.role === ROLES.STUDENT) {
    if (assignment.status === 'DRAFT') {
      throw { status: 403, message: 'Assignment is not published yet' };
    }
    // Check enrollment
    const isEnrolled = await enrollmentRepository.find({ studentId: user._id, courseId: assignment.courseId._id, status: 'ACTIVE' });
    if (!isEnrolled || isEnrolled.length === 0) {
      throw { status: 403, message: 'You are not enrolled in this course' };
    }
  }

  // TEACHER checks
  if (user.role === ROLES.TEACHER && assignment.teacherId._id?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You do not have permission to view this assignment' };
  }

  return assignment;
};

// ── Update Assignment ───────────────────────────────────────────────────────
const updateAssignment = async (id, data, user, tenantFilter) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment || assignment.isDeleted) throw { status: 404, message: 'Assignment not found' };

  // Tenant / Role check
  if (tenantFilter.instituteId && assignment.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Assignment not found' };
  }
  if (user.role === ROLES.TEACHER && assignment.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only update your own assignments' };
  }

  data.updatedBy = user._id;
  const updated = await assignmentRepository.updateById(id, data);

  // If status changed
  if (data.status && data.status !== assignment.status) {
    const action = data.status === 'PUBLISHED' ? 'ASSIGNMENT_PUBLISHED' : 'ASSIGNMENT_CLOSED';
    await AuditLogger.log({
      userId: user._id,
      role: user.role,
      action: action,
      resource: 'Assignment',
      resourceId: updated._id,
      metadata: { previousStatus: assignment.status, newStatus: data.status },
    });
  }

  return updated;
};

// ── Delete Assignment ───────────────────────────────────────────────────────
const deleteAssignment = async (id, user, tenantFilter) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment || assignment.isDeleted) throw { status: 404, message: 'Assignment not found' };

  if (tenantFilter.instituteId && assignment.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Assignment not found' };
  }
  if (user.role === ROLES.TEACHER && assignment.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only delete your own assignments' };
  }

  const deleted = await assignmentRepository.softDelete(id, user._id);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'SOFT_DELETE',
    resource: 'Assignment',
    resourceId: id,
  });

  return deleted;
};

// ── Assignment Statistics ───────────────────────────────────────────────────
const getAssignmentStats = async (id, user, tenantFilter) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment || assignment.isDeleted) throw { status: 404, message: 'Assignment not found' };

  if (user.role === ROLES.TEACHER && assignment.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'Forbidden' };
  }

  // 1. Total students enrolled in the course
  const totalStudents = await enrollmentRepository.count({ courseId: assignment.courseId, status: 'ACTIVE', isDeleted: false });
  
  // 2. Submissions
  const submittedCount = await submissionRepository.countSubmissionsByAssignment(id);
  const gradedCount = await submissionRepository.countGradedSubmissions(id);

  return {
    totalStudents,
    submitted: submittedCount,
    pending: Math.max(0, totalStudents - submittedCount),
    graded: gradedCount,
  };
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats,
};
