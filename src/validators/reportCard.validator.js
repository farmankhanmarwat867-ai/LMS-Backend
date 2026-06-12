/**
 * Report Card Validators — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * Input validation middleware for all report card endpoints.
 * Uses express-validator for declarative validation chains.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { body, param, query } = require('express-validator');

// ── Generate Report Cards ─────────────────────────────────────────────────────
/**
 * POST /api/report-cards/generate
 * Required: examId (MongoID)
 * Optional: classId, sectionId, studentId (MongoIDs for filtering)
 */
exports.generateValidator = [
  body('examId')
    .notEmpty().withMessage('examId is required')
    .isMongoId().withMessage('examId must be a valid MongoDB ObjectId'),

  body('classId')
    .optional()
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),

  body('sectionId')
    .optional()
    .isMongoId().withMessage('sectionId must be a valid MongoDB ObjectId'),

  body('studentId')
    .optional()
    .isMongoId().withMessage('studentId must be a valid MongoDB ObjectId'),
];

// ── Comments ──────────────────────────────────────────────────────────────────
/**
 * PATCH /api/report-cards/:id/comments
 * At least one comment field is expected.
 */
exports.commentsValidator = [
  param('id')
    .isMongoId().withMessage('Report card ID must be a valid MongoDB ObjectId'),

  body('teacherComments')
    .optional()
    .isString().withMessage('teacherComments must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('teacherComments cannot exceed 1000 characters'),

  body('principalComments')
    .optional()
    .isString().withMessage('principalComments must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('principalComments cannot exceed 1000 characters'),
];

// ── Get List Query Params ─────────────────────────────────────────────────────
/**
 * GET /api/report-cards
 * Optional query filters.
 */
exports.listValidator = [
  query('examId')
    .optional()
    .isMongoId().withMessage('examId must be a valid MongoDB ObjectId'),

  query('classId')
    .optional()
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),

  query('sectionId')
    .optional()
    .isMongoId().withMessage('sectionId must be a valid MongoDB ObjectId'),

  query('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('status must be DRAFT, PUBLISHED, or ARCHIVED'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// ── ID Param ──────────────────────────────────────────────────────────────────
/**
 * Validates :id route param for single-resource endpoints.
 */
exports.idParamValidator = [
  param('id')
    .isMongoId().withMessage('Report card ID must be a valid MongoDB ObjectId'),
];

/**
 * Validates :studentId route param.
 */
exports.studentIdParamValidator = [
  param('studentId')
    .isMongoId().withMessage('Student ID must be a valid MongoDB ObjectId'),
];
