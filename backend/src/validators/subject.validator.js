const { body, param } = require('express-validator');

/**
 * SUBJECT VALIDATORS
 * Express-validator chains for request validation
 */

const createSubjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required')
    .isLength({ max: 100 })
    .withMessage('Subject name must not exceed 100 characters'),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required')
    .isAlphanumeric('en-US', { ignore: '-_' })
    .withMessage('Code must be alphanumeric (hyphens and underscores allowed)')
    .isLength({ max: 20 })
    .withMessage('Code must not exceed 20 characters'),

  body('branchId')
    .notEmpty()
    .withMessage('Branch ID is required')
    .isMongoId()
    .withMessage('Branch ID must be a valid MongoID'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const updateSubjectValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Subject name must not exceed 100 characters'),

  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject code cannot be empty')
    .isAlphanumeric('en-US', { ignore: '-_' })
    .withMessage('Code must be alphanumeric')
    .isLength({ max: 20 })
    .withMessage('Code must not exceed 20 characters'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const subjectIdValidator = [
  param('id').isMongoId().withMessage('Invalid subject ID format'),
];

module.exports = {
  createSubjectValidator,
  updateSubjectValidator,
  subjectIdValidator,
};
