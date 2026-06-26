const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const submitAssignmentValidator = [
  param('assignmentId').isMongoId().withMessage('Valid assignment ID is required'),
  body('submissionText').optional().isString(),
  body('fileUrl').optional({ nullable: true, checkFalsy: true }).isURL({ require_tld: false }).withMessage('Valid URL is required for fileUrl'),
  // Ensure at least one is provided
  body().custom((value, { req }) => {
    if (!req.body.submissionText && !req.body.fileUrl) {
      throw new Error('You must provide either submissionText or fileUrl');
    }
    return true;
  }),
  validate,
];

const gradeSubmissionValidator = [
  param('id').isMongoId().withMessage('Valid submission ID is required'),
  body('marksObtained').isNumeric().withMessage('Marks obtained is required and must be a number'),
  body('feedback').optional().isString(),
  validate,
];

const getSubmissionsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'GRADED']).withMessage('Invalid status filter'),
  validate,
];

const assignmentIdParamValidator = [
  param('assignmentId').isMongoId().withMessage('Valid assignment ID is required'),
  validate,
];

const studentIdParamValidator = [
  param('studentId').isMongoId().withMessage('Valid student ID is required'),
  validate,
];

module.exports = {
  submitAssignmentValidator,
  gradeSubmissionValidator,
  getSubmissionsValidator,
  assignmentIdParamValidator,
  studentIdParamValidator,
};
