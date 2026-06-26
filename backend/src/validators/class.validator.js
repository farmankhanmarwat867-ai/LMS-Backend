const { body, param } = require('express-validator');

/**
 * CLASS VALIDATORS
 * Express-validator chains for request validation
 */

const createClassValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Class name is required')
    .isLength({ max: 100 })
    .withMessage('Class name must not exceed 100 characters'),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Class code is required')
    .isAlphanumeric('en-US', { ignore: '-_' })
    .withMessage('Code must be alphanumeric (hyphens and underscores allowed)')
    .isLength({ max: 20 })
    .withMessage('Code must not exceed 20 characters'),

  body('branchId')
    .notEmpty()
    .withMessage('Branch ID is required')
    .isMongoId()
    .withMessage('Branch ID must be a valid MongoID'),

  body('sessionId')
    .notEmpty()
    .withMessage('Academic Session ID is required')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoID'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const updateClassValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Class name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Class name must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const classIdValidator = [
  param('id').isMongoId().withMessage('Invalid class ID format'),
];

module.exports = {
  createClassValidator,
  updateClassValidator,
  classIdValidator,
};
