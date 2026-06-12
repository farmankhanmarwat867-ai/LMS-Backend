const { body, param } = require('express-validator');

/**
 * ACADEMIC SESSION VALIDATORS
 * Express-validator chains for request validation
 */

// ── Create Session ─────────────────────────────────────────────────────
const createSessionValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Session name is required')
    .isLength({ max: 100 })
    .withMessage('Session name must not exceed 100 characters'),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Session code is required')
    .isAlphanumeric('en-US', { ignore: '-_' })
    .withMessage('Code must be alphanumeric (hyphens and underscores allowed)')
    .isLength({ max: 20 })
    .withMessage('Code must not exceed 20 characters'),

  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date (ISO 8601 format)'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date (ISO 8601 format)'),

  body('status')
    .optional()
    .isIn(['UPCOMING', 'ACTIVE'])
    .withMessage('Status must be UPCOMING or ACTIVE when creating a session'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

// ── Update Session ─────────────────────────────────────────────────────
const updateSessionValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Session name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Session name must not exceed 100 characters'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (ISO 8601 format)'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (ISO 8601 format)'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

// ── Change Status ──────────────────────────────────────────────────────
const changeStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status must be one of: UPCOMING, ACTIVE, COMPLETED, CANCELLED'),
];

// ── Param ID validator ─────────────────────────────────────────────────
const sessionIdValidator = [
  param('id').isMongoId().withMessage('Invalid session ID format'),
];

module.exports = {
  createSessionValidator,
  updateSessionValidator,
  changeStatusValidator,
  sessionIdValidator,
};
