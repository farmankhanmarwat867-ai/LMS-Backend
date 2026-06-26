const enrollmentService = require('../services/enrollment.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/enrollments ───────────────────────────────────────────────────
const enrollStudent = async (req, res, next) => {
  try {
    const enrollment = await enrollmentService.enrollStudent(req.body, req.user);
    return created(res, enrollment, 'Student enrolled successfully');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/enrollments/bulk ──────────────────────────────────────────────
const bulkEnrollStudents = async (req, res, next) => {
  try {
    const results = await enrollmentService.bulkEnrollStudents(req.body, req.user);
    return success(
      res,
      results,
      `Bulk enrollment processed: ${results.successful.length} succeeded, ${results.failed.length} failed`,
      201
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/enrollments ────────────────────────────────────────────────────
const getEnrollments = async (req, res, next) => {
  try {
    const { data, pagination } = await enrollmentService.getEnrollments(
      req.query, req.user, req.tenantFilter
    );
    return success(res, data, 'Enrollments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/enrollments/:id ────────────────────────────────────────────────
const getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await enrollmentService.getEnrollmentById(
      req.params.id, req.user, req.tenantFilter
    );
    return success(res, enrollment, 'Enrollment retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/enrollments/course/:courseId ───────────────────────────────────
const getCourseEnrollments = async (req, res, next) => {
  try {
    const { data, pagination } = await enrollmentService.getCourseEnrollments(
      req.params.courseId, req.user, req.tenantFilter, req.query
    );
    return success(res, data, 'Subject enrollments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/enrollments/student/:studentId ─────────────────────────────────
const getStudentEnrollments = async (req, res, next) => {
  try {
    const { data, pagination } = await enrollmentService.getStudentEnrollments(
      req.params.studentId, req.user, req.tenantFilter
    );
    return success(res, data, 'Student enrollments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/enrollments/my ─────────────────────────────────────────────────
const getMyEnrollments = async (req, res, next) => {
  try {
    const { data, pagination } = await enrollmentService.getMyEnrollments(
      req.user, req.tenantFilter
    );
    return success(res, data, 'My enrollments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/enrollments/:id/status ───────────────────────────────────────
const changeEnrollmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const enrollment = await enrollmentService.changeEnrollmentStatus(
      req.params.id, status, req.user, req.tenantFilter
    );
    return success(res, enrollment, `Enrollment status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/enrollments/:id ─────────────────────────────────────────────
const deleteEnrollment = async (req, res, next) => {
  try {
    await enrollmentService.deleteEnrollment(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Enrollment deleted successfully');
  } catch (err) {
    next(err);
  }
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
