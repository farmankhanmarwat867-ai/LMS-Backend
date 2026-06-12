const { body, query, param } = require('express-validator');

/**
 * Enrollment Validators — Phase 10
 */

// ── POST /api/enrollments ───────────────────────────────────────────────────
const createEnrollmentValidator = [
  body('studentId')
    .notEmpty().withMessage('studentId is required')
    .isMongoId().withMessage('studentId must be a valid MongoDB ObjectId'),
  body('courseId')
    .notEmpty().withMessage('courseId is required')
    .isMongoId().withMessage('courseId must be a valid MongoDB ObjectId'),
];

// ── POST /api/enrollments/bulk ──────────────────────────────────────────────
const bulkEnrollmentValidator = [
  body('courseId')
    .notEmpty().withMessage('courseId is required')
    .isMongoId().withMessage('courseId must be a valid MongoDB ObjectId'),
  body('studentIds')
    .isArray({ min: 1, max: 200 })
    .withMessage('studentIds must be an array with 1–200 entries'),
  body('studentIds.*')
    .isMongoId().withMessage('Each studentId in the array must be a valid MongoDB ObjectId'),
];

// ── PATCH /api/enrollments/:id/status ───────────────────────────────────────
const updateEnrollmentStatusValidator = [
  param('id')
    .isMongoId().withMessage('Enrollment ID must be a valid MongoDB ObjectId'),
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(['ACTIVE', 'DROPPED', 'COMPLETED'])
    .withMessage('status must be one of: ACTIVE, DROPPED, COMPLETED'),
];

// ── GET /api/enrollments ─────────────────────────────────────────────────────
const listEnrollmentValidator = [
  query('status')
    .optional()
    .isIn(['ACTIVE', 'DROPPED', 'COMPLETED'])
    .withMessage('status must be one of: ACTIVE, DROPPED, COMPLETED'),
  query('courseId')
    .optional()
    .isMongoId().withMessage('courseId must be a valid MongoDB ObjectId'),
  query('studentId')
    .optional()
    .isMongoId().withMessage('studentId must be a valid MongoDB ObjectId'),
  query('classId')
    .optional()
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),
  query('sectionId')
    .optional()
    .isMongoId().withMessage('sectionId must be a valid MongoDB ObjectId'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// ── GET /api/enrollments/:id ─────────────────────────────────────────────────
const getEnrollmentByIdValidator = [
  param('id')
    .isMongoId().withMessage('Enrollment ID must be a valid MongoDB ObjectId'),
];

module.exports = {
  createEnrollmentValidator,
  bulkEnrollmentValidator,
  updateEnrollmentStatusValidator,
  listEnrollmentValidator,
  getEnrollmentByIdValidator,
};
