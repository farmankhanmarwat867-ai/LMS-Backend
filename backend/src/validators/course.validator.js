const { body, query } = require('express-validator');

const createCourseValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Subject title is required')
    .isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('teacherId')
    .notEmpty().withMessage('Teacher assignment is required')
    .isMongoId().withMessage('Invalid Teacher ID'),

  body('subjectId')
    .notEmpty().withMessage('Subject association is required')
    .isMongoId().withMessage('Invalid Subject ID'),

  body('classId')
    .notEmpty().withMessage('Class association is required')
    .isMongoId().withMessage('Invalid Class ID'),

  body('sectionId')
    .notEmpty().withMessage('Section association is required')
    .isMongoId().withMessage('Invalid Section ID'),

  body('sessionId')
    .notEmpty().withMessage('Academic session association is required')
    .isMongoId().withMessage('Invalid Session ID'),

  body('branchId')
    .notEmpty().withMessage('Branch association is required')
    .isMongoId().withMessage('Invalid Branch ID'),
];

const updateCourseValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty if provided'),
    
  body('teacherId')
    .optional()
    .isMongoId().withMessage('Invalid Teacher ID'),

  body('status')
    .optional()
    .isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']).withMessage('Status must be DRAFT, ACTIVE, or ARCHIVED'),
    
  body('branchId')
    .not().exists().withMessage('branchId cannot be updated after creation'),
    
  body('instituteId')
    .not().exists().withMessage('instituteId cannot be updated after creation'),
];

const changeCourseStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']).withMessage('Status must be DRAFT, ACTIVE, or ARCHIVED'),
];

const listCoursesValidator = [
  query('status')
    .optional()
    .isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  query('teacherId')
    .optional()
    .isMongoId(),
  query('classId')
    .optional()
    .isMongoId(),
  query('sectionId')
    .optional()
    .isMongoId(),
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
];

module.exports = {
  createCourseValidator,
  updateCourseValidator,
  changeCourseStatusValidator,
  listCoursesValidator,
};
