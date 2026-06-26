/**
 * Result Validators — Phase 16
 * ════════════════════════════════════════════════════════════
 * Validates incoming request bodies for all Result endpoints.
 * Uses express-validator.
 */
const { body } = require('express-validator');

const VALID_STATUSES = ['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE'];

// ── Create Single Result ──────────────────────────────────────────────────────
exports.createResultValidator = [
  body('studentId')
    .isMongoId()
    .withMessage('Valid studentId (MongoID) is required'),

  body('examScheduleId')
    .isMongoId()
    .withMessage('Valid examScheduleId (MongoID) is required'),

  body('marksObtained')
    .isFloat({ min: 0 })
    .withMessage('marksObtained must be a number >= 0'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('remarks must be a string'),
];

// ── Update Result ─────────────────────────────────────────────────────────────
exports.updateResultValidator = [
  body('marksObtained')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('marksObtained must be a number >= 0'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('remarks must be a string'),

  body('changeReason')
    .optional()
    .isString()
    .trim()
    .withMessage('changeReason must be a string'),
];

// ── Bulk Upload Results ───────────────────────────────────────────────────────
exports.bulkResultValidator = [
  body('examScheduleId')
    .isMongoId()
    .withMessage('Valid examScheduleId (MongoID) is required'),

  body('results')
    .isArray({ min: 1 })
    .withMessage('results must be a non-empty array'),

  body('results.*.studentId')
    .isMongoId()
    .withMessage('Each result must have a valid studentId (MongoID)'),

  body('results.*.marksObtained')
    .isFloat({ min: 0 })
    .withMessage('Each result must have marksObtained >= 0'),

  body('results.*.status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('results.*.remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('remarks must be a string'),
];
