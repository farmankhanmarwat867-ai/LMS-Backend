const express = require('express');
const router  = express.Router();

const {
  enrollStudent,
  bulkEnrollStudents,
  getEnrollments,
  getEnrollmentById,
  getCourseEnrollments,
  getStudentEnrollments,
  getMyEnrollments,
  changeEnrollmentStatus,
  deleteEnrollment,
} = require('../controllers/enrollment.controller');

const { protect }       = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard }   = require('../middlewares/tenant.middleware');
const { validate }      = require('../middlewares/validate.middleware');

const {
  createEnrollmentValidator,
  bulkEnrollmentValidator,
  updateEnrollmentStatusValidator,
  listEnrollmentValidator,
  getEnrollmentByIdValidator,
} = require('../validators/enrollment.validator');

// ── All routes require authentication + tenant context ────────────────────────
router.use(protect);
router.use(tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// WRITE ROUTES (INSTITUTE_ADMIN | BRANCH_ADMIN | TEACHER only)
// STUDENT = READ ONLY — no self-enrollment in School ERP
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/enrollments — enroll a single student
router.post(
  '/',
  hasPermission('enrollments:create'),
  createEnrollmentValidator,
  validate,
  enrollStudent
);

// POST /api/enrollments/bulk — enroll multiple students into one course
// IMPORTANT: must be declared BEFORE /:id routes to avoid routing conflicts
router.post(
  '/bulk',
  hasPermission('enrollments:create'),
  bulkEnrollmentValidator,
  validate,
  bulkEnrollStudents
);

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZED READ ROUTES (all authenticated roles)
// IMPORTANT: must be declared BEFORE /:id to avoid Express treating
//            'my', 'course', 'student' as :id params
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/enrollments/my — student's own enrollments
router.get(
  '/my',
  hasPermission('enrollments:read'),
  getMyEnrollments
);

// GET /api/enrollments/course/:courseId — all enrollments for a course
router.get(
  '/course/:courseId',
  hasPermission('enrollments:read'),
  getCourseEnrollments
);

// GET /api/enrollments/student/:studentId — all enrollments for a student
router.get(
  '/student/:studentId',
  hasPermission('enrollments:read'),
  getStudentEnrollments
);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ROUTE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/enrollments — list all (role-scoped)
router.get(
  '/',
  hasPermission('enrollments:read'),
  listEnrollmentValidator,
  validate,
  getEnrollments
);

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL RESOURCE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/enrollments/:id — get single enrollment by ID
router.get(
  '/:id',
  hasPermission('enrollments:read'),
  getEnrollmentByIdValidator,
  validate,
  getEnrollmentById
);

// PATCH /api/enrollments/:id/status — change status (ACTIVE | DROPPED | COMPLETED)
router.patch(
  '/:id/status',
  hasPermission('enrollments:update'),
  updateEnrollmentStatusValidator,
  validate,
  changeEnrollmentStatus
);

// DELETE /api/enrollments/:id — soft delete (INSTITUTE_ADMIN | BRANCH_ADMIN only)
router.delete(
  '/:id',
  hasPermission('enrollments:delete'),
  getEnrollmentByIdValidator,
  validate,
  deleteEnrollment
);

module.exports = router;
