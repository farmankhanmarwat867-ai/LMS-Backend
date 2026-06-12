const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const createAssignmentValidator = [
  body('title').notEmpty().withMessage('Assignment title is required').trim(),
  body('description').optional().isString(),
  body('courseId').isMongoId().withMessage('Valid course ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('maxMarks').optional().isNumeric().withMessage('Max marks must be a number'),
  validate,
];

const updateAssignmentValidator = [
  param('id').isMongoId().withMessage('Valid assignment ID is required'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty').trim(),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('maxMarks').optional().isNumeric().withMessage('Max marks must be a number'),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'CLOSED']).withMessage('Invalid status'),
  validate,
];

const getAssignmentsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'CLOSED']).withMessage('Invalid status filter'),
  query('courseId').optional().isMongoId().withMessage('Invalid course ID filter'),
  validate,
];

const idParamValidator = [
  param('id').isMongoId().withMessage('Valid ID is required'),
  validate,
];

module.exports = {
  createAssignmentValidator,
  updateAssignmentValidator,
  getAssignmentsValidator,
  idParamValidator,
};
