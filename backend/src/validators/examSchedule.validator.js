const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

// ── Helpers ────────────────────────────────────────────────────────────────
const VALID_STATUSES = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

// ── Shared time-format check (HH:MM or HH:MM AM/PM) ──────────────────────
const TIME_REGEX = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

// ═══════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════
const createExamScheduleValidator = [
  body('examId')
    .isMongoId().withMessage('Valid examId (ObjectId) is required'),

  body('subjectId')
    .isMongoId().withMessage('Valid subjectId (ObjectId) is required'),

  body('courseId')
    .isMongoId().withMessage('Valid courseId (ObjectId) is required'),

  body('teacherId')
    .isMongoId().withMessage('Valid teacherId (ObjectId) is required'),

  body('classId')
    .isMongoId().withMessage('Valid classId (ObjectId) is required'),

  body('sectionId')
    .isMongoId().withMessage('Valid sectionId (ObjectId) is required'),

  body('examDate')
    .isISO8601().withMessage('examDate must be a valid ISO 8601 date').toDate(),

  body('startTime')
    .isString().withMessage('startTime is required')
    .trim()
    .notEmpty()
    .matches(TIME_REGEX).withMessage('startTime must be in format "HH:MM AM" or "HH:MM PM"'),

  body('endTime')
    .isString().withMessage('endTime is required')
    .trim()
    .notEmpty()
    .matches(TIME_REGEX).withMessage('endTime must be in format "HH:MM AM" or "HH:MM PM"'),

  body('totalMarks')
    .isInt({ min: 1 }).withMessage('totalMarks must be an integer ≥ 1'),

  body('passingMarks')
    .isInt({ min: 0 }).withMessage('passingMarks must be a non-negative integer'),

  body('roomNumber')
    .optional()
    .isString().trim().isLength({ max: 50 }).withMessage('roomNumber max 50 chars'),

  body('instructions')
    .optional()
    .isString().trim().isLength({ max: 1000 }).withMessage('instructions max 1000 chars'),

  validate,
];

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE  (PUT /:id — all fields optional, at least one must be sent)
// ═══════════════════════════════════════════════════════════════════════════
const updateExamScheduleValidator = [
  param('id').isMongoId().withMessage('Valid exam schedule ID is required'),

  body('examId')
    .optional().isMongoId().withMessage('Valid examId (ObjectId) is required'),

  body('subjectId')
    .optional().isMongoId().withMessage('Valid subjectId (ObjectId) is required'),

  body('courseId')
    .optional().isMongoId().withMessage('Valid courseId (ObjectId) is required'),

  body('teacherId')
    .optional().isMongoId().withMessage('Valid teacherId (ObjectId) is required'),

  body('classId')
    .optional().isMongoId().withMessage('Valid classId (ObjectId) is required'),

  body('sectionId')
    .optional().isMongoId().withMessage('Valid sectionId (ObjectId) is required'),

  body('examDate')
    .optional().isISO8601().withMessage('examDate must be a valid ISO 8601 date').toDate(),

  body('startTime')
    .optional()
    .isString().trim().notEmpty()
    .matches(TIME_REGEX).withMessage('startTime must be in format "HH:MM AM" or "HH:MM PM"'),

  body('endTime')
    .optional()
    .isString().trim().notEmpty()
    .matches(TIME_REGEX).withMessage('endTime must be in format "HH:MM AM" or "HH:MM PM"'),

  body('totalMarks')
    .optional().isInt({ min: 1 }).withMessage('totalMarks must be an integer ≥ 1'),

  body('passingMarks')
    .optional().isInt({ min: 0 }).withMessage('passingMarks must be a non-negative integer'),

  body('roomNumber')
    .optional().isString().trim().isLength({ max: 50 }),

  body('instructions')
    .optional().isString().trim().isLength({ max: 1000 }),

  validate,
];

// ═══════════════════════════════════════════════════════════════════════════
// STATUS UPDATE  (PATCH /:id/status)
// ═══════════════════════════════════════════════════════════════════════════
const updateExamScheduleStatusValidator = [
  param('id').isMongoId().withMessage('Valid exam schedule ID is required'),

  body('status')
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  validate,
];

// ═══════════════════════════════════════════════════════════════════════════
// LIST / FILTERS  (GET /)
// ═══════════════════════════════════════════════════════════════════════════
const getExamSchedulesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be ≥ 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('examId').optional().isMongoId().withMessage('examId must be a valid ObjectId'),
  query('subjectId').optional().isMongoId().withMessage('subjectId must be a valid ObjectId'),
  query('courseId').optional().isMongoId().withMessage('courseId must be a valid ObjectId'),
  query('classId').optional().isMongoId().withMessage('classId must be a valid ObjectId'),
  query('sectionId').optional().isMongoId().withMessage('sectionId must be a valid ObjectId'),
  query('teacherId').optional().isMongoId().withMessage('teacherId must be a valid ObjectId'),
  query('status').optional().isIn(VALID_STATUSES).withMessage(`status filter must be one of: ${VALID_STATUSES.join(', ')}`),
  validate,
];

// ═══════════════════════════════════════════════════════════════════════════
// ID PARAM  (GET /:id, DELETE /:id)
// ═══════════════════════════════════════════════════════════════════════════
const idParamValidator = [
  param('id').isMongoId().withMessage('Valid exam schedule ID is required'),
  validate,
];

module.exports = {
  createExamScheduleValidator,
  updateExamScheduleValidator,
  updateExamScheduleStatusValidator,
  getExamSchedulesValidator,
  idParamValidator,
};
