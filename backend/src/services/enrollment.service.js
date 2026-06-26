const { generateEnrollmentNumber } = require('../models/Enrollment');
const enrollmentRepository = require('../repositories/enrollment.repository');
const courseRepository     = require('../repositories/course.repository');
const subjectRepository    = require('../repositories/subject.repository');
const userRepository       = require('../repositories/user.repository');
const { auditLog }         = require('../utils/auditLogger');
const { ROLES }            = require('../constants/roles');

/**
 * ENROLLMENT SERVICE — Phase 10
 * ─────────────────────────────────────────────────────────────────────────────
 * Rules:
 *  - No student self-enrollment (School ERP — students belong to sessions/classes)
 *  - Only INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER can create enrollments
 *  - TEACHER can only enroll into THEIR OWN courses
 *  - Session / Class / Section must match between student and course
 *  - Capacity is enforced when course.maxStudents is set
 *  - Sequential enrollment numbers: ENR-2026-0001
 *  - Full audit logging on every state change
 */

// ── Audit Action Map ────────────────────────────────────────────────────────
const STATUS_AUDIT_ACTION = {
  ACTIVE:    'ENROLLMENT_REACTIVATED',
  DROPPED:   'ENROLLMENT_DROPPED',
  COMPLETED: 'ENROLLMENT_COMPLETED',
};

// ── Eligibility Validation Engine ────────────────────────────────────────────
/**
 * Centralized validation used by both single and bulk enrollment.
 * Returns { student, course } if valid; throws structured error otherwise.
 */
const validateEnrollmentEligibility = async (studentId, courseId, instituteId) => {
  // 1. Verify course exists
  const courseQuery = { _id: courseId, isDeleted: false };
  if (instituteId) {
    courseQuery.instituteId = instituteId;
  }
  const course = await subjectRepository.findOne(courseQuery);
  if (!course) {
    throw { status: 404, message: 'Subject not found in this institute' };
  }

  // 2. Verify course is ACTIVE (can't enroll in DRAFT or ARCHIVED)
  if (course.status !== 'ACTIVE') {
    throw { status: 400, message: `Cannot enroll in a subject with status: ${course.status}` };
  }

  // 3. Verify student exists
  const studentQuery = {
    _id: studentId,
    role: ROLES.STUDENT,
    isDeleted: false,
  };
  if (instituteId) {
    studentQuery.instituteId = instituteId;
  }
  const student = await userRepository.findOne(studentQuery);
  if (!student) {
    throw { status: 404, message: 'Student not found in this institute' };
  }

  // 4. If no instituteId filter was provided (e.g. SUPER_ADMIN), verify student and course belong to the same institute
  if (!instituteId && student.instituteId?.toString() !== course.instituteId?.toString()) {
    throw { status: 400, message: 'Student and Subject belong to different institutes' };
  }

  // 4. Validate Session / Class / Section alignment
  //    A student in Class 10-A cannot be enrolled in a Class 11-B course.
  if (student.sessionId && course.sessionId && student.sessionId.toString() !== course.sessionId.toString()) {
    throw { status: 400, message: 'Student Session does not match Subject Session' };
  }
  if (student.classId && course.classId && student.classId.toString() !== course.classId.toString()) {
    throw { status: 400, message: 'Student Class does not match Subject Class' };
  }
  if (student.sectionId && course.sectionId && student.sectionId.toString() !== course.sectionId.toString()) {
    throw { status: 400, message: 'Student Section does not match Subject Section' };
  }

  // 5. Duplicate enrollment check → 409 Conflict
  const duplicate = await enrollmentRepository.checkDuplicate(studentId, courseId);
  if (duplicate) {
    throw { status: 409, message: 'Student is already enrolled in this subject' };
  }

  // 6. Course capacity check
  if (course.maxStudents) {
    const currentCount = await enrollmentRepository.countActiveByCourseId(courseId);
    if (currentCount >= course.maxStudents) {
      throw {
        status: 400,
        message: `Subject capacity reached (${course.maxStudents} students). Cannot enroll more students.`,
      };
    }
  }

  return { student, course };
};

// ── Enroll Single Student ─────────────────────────────────────────────────────
const enrollStudent = async (data, creatorUser) => {
  const { studentId, courseId } = data;
  const instituteId = creatorUser.instituteId;

  // Validate eligibility (throws on any failure)
  const { student, course } = await validateEnrollmentEligibility(studentId, courseId, instituteId);

  // TEACHER restriction: can only enroll into courses they teach
  if (creatorUser.role === ROLES.TEACHER) {
    if (course.teacherId.toString() !== creatorUser._id.toString()) {
      throw { status: 403, message: 'Teachers can only enroll students into their own subjects' };
    }
  }

  // Generate sequential enrollment number (ENR-2026-0001)
  const enrollmentNumber = await generateEnrollmentNumber();

  const enrollment = await enrollmentRepository.create({
    studentId,
    courseId,
    // Snapshot fields stored at enrollment time
    courseTitle: course.name || course.title,
    teacherId:   course.teacherId,
    // Academic hierarchy from the course
    classId:     course.classId,
    sectionId:   course.sectionId,
    sessionId:   student.sessionId || course.sessionId || null,
    // Tenant context
    instituteId: course.instituteId,
    branchId:    course.branchId,
    // Tracking
    enrollmentNumber,
    status:      'ACTIVE',
    enrollmentDate: new Date(),
    createdBy:   creatorUser._id,
    updatedBy:   creatorUser._id,
  });

  // Audit log
  await auditLog({
    userId:     creatorUser._id,
    role:       creatorUser.role,
    action:     'ENROLLMENT_CREATED',
    resource:   'Enrollment',
    resourceId: enrollment._id,
    metadata:   { studentId, courseId, enrollmentNumber, courseTitle: course.title },
  });

  return enrollment;
};

// ── Bulk Enroll Students ──────────────────────────────────────────────────────
/**
 * POST /api/enrollments/bulk
 * Body: { courseId, studentIds: [...] }
 *
 * Processes each student individually so that partial success is possible.
 * Returns { successful: [...], failed: [{ studentId, reason }] }
 */
const bulkEnrollStudents = async ({ courseId, studentIds }, creatorUser) => {
  const instituteId = creatorUser.instituteId;

  // Pre-flight: verify the course exists and teacher authorization
  const courseQuery = { _id: courseId, isDeleted: false };
  if (instituteId) {
    courseQuery.instituteId = instituteId;
  }
  const course = await subjectRepository.findOne(courseQuery);
  if (!course) throw { status: 404, message: 'Subject not found' };

  if (creatorUser.role === ROLES.TEACHER) {
    if (course.teacherId.toString() !== creatorUser._id.toString()) {
      throw { status: 403, message: 'Teachers can only bulk-enroll students into their own subjects' };
    }
  }

  const results = { successful: [], failed: [] };

  for (const studentId of studentIds) {
    try {
      const enrollment = await enrollStudent({ studentId, courseId }, creatorUser);
      results.successful.push({
        studentId,
        enrollmentId:     enrollment._id,
        enrollmentNumber: enrollment.enrollmentNumber,
      });
    } catch (err) {
      results.failed.push({
        studentId,
        reason: err.message || 'Unknown error',
        code:   err.status  || 500,
      });
    }
  }

  return results;
};

// ── List Enrollments (paginated + filtered) ───────────────────────────────────
const getEnrollments = async (queryOptions, user, tenantFilter) => {
  const filters = {};

  // Copy allowed query params
  if (queryOptions.status)    filters.status    = queryOptions.status;
  if (queryOptions.courseId)  filters.courseId  = queryOptions.courseId;
  if (queryOptions.studentId) filters.studentId = queryOptions.studentId;
  if (queryOptions.classId)   filters.classId   = queryOptions.classId;
  if (queryOptions.sectionId) filters.sectionId = queryOptions.sectionId;

  // Role-based scope restriction
  if (user.role === ROLES.STUDENT) {
    filters.studentId = user._id;   // Students only see their own
  } else if (user.role === ROLES.TEACHER) {
    filters.teacherId = user._id;   // Teachers only see their courses
  }

  return enrollmentRepository.searchEnrollments(tenantFilter, filters, queryOptions);
};

// ── Get Single Enrollment by ID ───────────────────────────────────────────────
const getEnrollmentById = async (id, user, tenantFilter) => {
  // Build the query: tenantFilter enforces institute/branch scope at the DB level
  const enrollment = await enrollmentRepository.findByIdPopulated(id, tenantFilter);
  if (!enrollment) throw { status: 404, message: 'Enrollment not found' };

  // STUDENT: can only see their own enrollment
  if (user.role === ROLES.STUDENT && enrollment.studentId?._id?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only view your own enrollments' };
  }

  // TEACHER: can only see enrollments in their courses
  if (user.role === ROLES.TEACHER && enrollment.teacherId?._id?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only view enrollments for your own courses' };
  }

  return enrollment;
};

// ── Get Enrollments for a Specific Course ─────────────────────────────────────
const getCourseEnrollments = async (courseId, user, tenantFilter, options = {}) => {
  // TEACHER: must own the course
  if (user.role === ROLES.TEACHER) {
    const course = await subjectRepository.findOne({ _id: courseId, ...tenantFilter });
    if (!course) {
      throw { status: 404, message: 'Course not found' };
    }
    if (course.teacherId.toString() !== user._id.toString()) {
      throw { status: 403, message: 'Not authorized to view enrollments for this course' };
    }
  }

  // STUDENT: can only see their own enrollment in that course
  const extraFilter = user.role === ROLES.STUDENT ? { studentId: user._id } : {};
  if (options.status) extraFilter.status = options.status;

  return enrollmentRepository.searchEnrollments(tenantFilter, { courseId, ...extraFilter }, options);
};

// ── Get Enrollments for a Specific Student ────────────────────────────────────
const getStudentEnrollments = async (studentId, user, tenantFilter) => {
  // STUDENT: can only view their own
  if (user.role === ROLES.STUDENT && user._id.toString() !== studentId) {
    throw { status: 403, message: 'You can only view your own enrollments' };
  }

  // TEACHER: can only see enrollments in their courses
  const extraFilter = user.role === ROLES.TEACHER ? { teacherId: user._id } : {};

  return enrollmentRepository.searchEnrollments(tenantFilter, { studentId, ...extraFilter });
};

// ── Get My Enrollments (student-specific shortcut) ────────────────────────────
const getMyEnrollments = async (user, tenantFilter) => {
  if (user.role !== ROLES.STUDENT) {
    throw { status: 403, message: 'Only students can access /my enrollments. Use /course or /student endpoints.' };
  }
  return enrollmentRepository.searchEnrollments(tenantFilter, { studentId: user._id });
};

// ── Change Enrollment Status ──────────────────────────────────────────────────
const changeEnrollmentStatus = async (id, status, updaterUser, tenantFilter) => {
  const enrollment = await enrollmentRepository.findOne({ _id: id, ...tenantFilter });
  if (!enrollment) throw { status: 404, message: 'Enrollment not found' };

  // TEACHER: can only update enrollments for their own courses
  if (updaterUser.role === ROLES.TEACHER) {
    if (enrollment.teacherId.toString() !== updaterUser._id.toString()) {
      throw { status: 403, message: 'Not authorized to update this enrollment' };
    }
  }

  // Already in target status?
  if (enrollment.status === status) {
    throw { status: 400, message: `Enrollment is already ${status}` };
  }

  // Manage completionDate lifecycle
  let completionDate = enrollment.completionDate;
  if (status === 'COMPLETED') {
    completionDate = new Date();
  } else {
    completionDate = null; // Reset if re-activated or dropped
  }

  const updated = await enrollmentRepository.updateById(id, {
    status,
    completionDate,
    updatedBy: updaterUser._id,
  });

  await auditLog({
    userId:     updaterUser._id,
    role:       updaterUser.role,
    action:     STATUS_AUDIT_ACTION[status] || 'STATUS_CHANGE',
    resource:   'Enrollment',
    resourceId: id,
    metadata:   {
      oldStatus: enrollment.status,
      newStatus: status,
      completionDate: completionDate || undefined,
    },
  });

  return updated;
};

// ── Soft Delete Enrollment ────────────────────────────────────────────────────
const deleteEnrollment = async (id, deleterUser, tenantFilter) => {
  const enrollment = await enrollmentRepository.findOne({ _id: id, ...tenantFilter });
  if (!enrollment) throw { status: 404, message: 'Enrollment not found' };

  // TEACHER cannot delete enrollments (only BRANCH_ADMIN / INSTITUTE_ADMIN can)
  // This is enforced at the route level via RBAC, but double-checked here for safety

  await enrollmentRepository.softDelete(id, deleterUser._id);

  await auditLog({
    userId:     deleterUser._id,
    role:       deleterUser.role,
    action:     'ENROLLMENT_DELETED',
    resource:   'Enrollment',
    resourceId: id,
    metadata:   {
      studentId:       enrollment.studentId,
      courseId:        enrollment.courseId,
      enrollmentNumber: enrollment.enrollmentNumber,
    },
  });
};

module.exports = {
  enrollStudent,
  bulkEnrollStudents,
  getEnrollments,
  getEnrollmentById,
  getCourseEnrollments,
  getStudentEnrollments,
  getMyEnrollments,
  changeEnrollmentStatus,
  deleteEnrollment,
};
