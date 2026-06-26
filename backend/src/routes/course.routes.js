const express = require('express');
const router = express.Router();

const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  changeCourseStatus,
  deleteCourse,
} = require('../controllers/course.controller');

const { protect }       = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard }   = require('../middlewares/tenant.middleware');
const { validate }      = require('../middlewares/validate.middleware');

const {
  createCourseValidator,
  updateCourseValidator,
  changeCourseStatusValidator,
  listCoursesValidator,
} = require('../validators/course.validator');

// All routes require auth and tenant context
router.use(protect);
router.use(tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router
  .route('/')
  .post(
    hasPermission('courses:create'),
    createCourseValidator,
    validate,
    createCourse
  )
  .get(
    hasPermission('courses:read'),
    listCoursesValidator,
    validate,
    getAllCourses
  );

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL RESOURCE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router
  .route('/:id')
  .get(
    hasPermission('courses:read'),
    getCourseById
  )
  .put(
    hasPermission('courses:update'),
    updateCourseValidator,
    validate,
    updateCourse
  )
  .delete(
    hasPermission('courses:delete'),
    deleteCourse
  );

// Publish / Archive / Draft Status Update
router.patch(
  '/:id/status',
  hasPermission('courses:update'), // Same permission required to update
  changeCourseStatusValidator,
  validate,
  changeCourseStatus
);

module.exports = router;
