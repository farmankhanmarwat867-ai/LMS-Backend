const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const createExamValidator = [
  body('title').isString().withMessage('Title is required').trim().notEmpty(),
  body('examCode').isString().withMessage('Exam Code is required').trim().notEmpty(),
  body('examType')
    .isIn(['QUIZ', 'MONTHLY', 'MID_TERM', 'FINAL', 'MOCK', 'PRACTICAL', 'CUSTOM'])
    .withMessage('Invalid exam type'),
  body('sessionId').isMongoId().withMessage('Valid sessionId is required'),
  body('classId').isMongoId().withMessage('Valid classId is required'),
  body('sectionId').isMongoId().withMessage('Valid sectionId is required'),
  body('startDate').isISO8601().withMessage('Valid startDate is required (ISO 8601)').toDate(),
  body('endDate').isISO8601().withMessage('Valid endDate is required (ISO 8601)').toDate(),
  body('description').optional().isString().trim(),
  validate,
];

const updateExamValidator = [
  param('id').isMongoId().withMessage('Valid exam ID is required'),
  body('title').optional().isString().trim().notEmpty(),
  body('examCode').optional().isString().trim().notEmpty(),
  body('examType')
    .optional()
    .isIn(['QUIZ', 'MONTHLY', 'MID_TERM', 'FINAL', 'MOCK', 'PRACTICAL', 'CUSTOM'])
    .withMessage('Invalid exam type'),
  body('startDate').optional().isISO8601().withMessage('Valid startDate is required').toDate(),
  body('endDate').optional().isISO8601().withMessage('Valid endDate is required').toDate(),
  body('description').optional().isString().trim(),
  body('status')
    .optional()
    .isIn(['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status'),
  validate,
];

const updateExamStatusValidator = [
  param('id').isMongoId().withMessage('Valid exam ID is required'),
  body('status')
    .isIn(['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status'),
  validate,
];

const getExamsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sessionId').optional().isMongoId(),
  query('classId').optional().isMongoId(),
  query('sectionId').optional().isMongoId(),
  query('examType').optional().isString(),
  query('status').optional().isString(),
  validate,
];

const idParamValidator = [
  param('id').isMongoId().withMessage('Valid exam ID is required'),
  validate,
];

module.exports = {
  createExamValidator,
  updateExamValidator,
  updateExamStatusValidator,
  getExamsValidator,
  idParamValidator,
};
