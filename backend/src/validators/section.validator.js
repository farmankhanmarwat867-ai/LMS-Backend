const { body, param } = require('express-validator');

/**
 * SECTION VALIDATORS
 * Express-validator chains for request validation
 */

const createSectionValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Section name is required')
    .isLength({ max: 50 })
    .withMessage('Section name must not exceed 50 characters'),

  body('branchId')
    .notEmpty()
    .withMessage('Branch ID is required')
    .isMongoId()
    .withMessage('Branch ID must be a valid MongoID'),

  body('classId')
    .notEmpty()
    .withMessage('Class ID is required')
    .isMongoId()
    .withMessage('Class ID must be a valid MongoID'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const updateSectionValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Section name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Section name must not exceed 50 characters'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE'),
];

const sectionIdValidator = [
  param('id').isMongoId().withMessage('Invalid section ID format'),
];

module.exports = {
  createSectionValidator,
  updateSectionValidator,
  sectionIdValidator,
};
