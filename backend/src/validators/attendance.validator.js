const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

// ── POST /api/attendance ──────────────────────────────────────────────────────
const markAttendanceValidator = [
  body('courseId')
    .isMongoId().withMessage('Valid course ID is required'),

  body('date')
    .isISO8601().withMessage('Valid date is required (ISO 8601 format, e.g. 2026-06-07)')
    .toDate(),

  body('topic')
    .optional()
    .isString().withMessage('Topic must be a string')
    .trim(),

  body('attendees')
    .isArray({ min: 1 }).withMessage('attendees must be a non-empty array'),

  body('attendees.*.studentId')
    .isMongoId().withMessage('Each attendee must have a valid studentId'),

  body('attendees.*.status')
    .isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
    .withMessage('Status must be one of: PRESENT, ABSENT, LATE, EXCUSED'),

  body('attendees.*.remarks')
    .optional()
    .isString().withMessage('Remarks must be a string')
    .trim(),

  validate,
];

// ── PUT /api/attendance/:id ───────────────────────────────────────────────────
const updateAttendanceValidator = [
  param('id')
    .isMongoId().withMessage('Valid attendance record ID is required'),

  body('topic')
    .optional()
    .isString().withMessage('Topic must be a string')
    .trim(),

  body('attendees')
    .optional()
    .isArray({ min: 1 }).withMessage('attendees must be a non-empty array'),

  body('attendees.*.studentId')
    .if(body('attendees').exists())
    .isMongoId().withMessage('Each attendee must have a valid studentId'),

  body('attendees.*.status')
    .if(body('attendees').exists())
    .isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
    .withMessage('Status must be one of: PRESENT, ABSENT, LATE, EXCUSED'),

  body('attendees.*.remarks')
    .optional()
    .isString().withMessage('Remarks must be a string')
    .trim(),

  validate,
];

// ── GET /api/attendance (list filters) ───────────────────────────────────────
const getAttendanceValidator = [
  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('courseId')
    .optional().isMongoId().withMessage('Invalid courseId'),
  query('classId')
    .optional().isMongoId().withMessage('Invalid classId'),
  query('sectionId')
    .optional().isMongoId().withMessage('Invalid sectionId'),
  query('date')
    .optional().isISO8601().withMessage('Invalid date format'),
  query('sortBy')
    .optional().isIn(['date', 'createdAt']).withMessage('sortBy must be date or createdAt'),
  query('sortOrder')
    .optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  validate,
];

// ── GET /api/attendance/student/:studentId ────────────────────────────────────
const studentAttendanceValidator = [
  param('studentId')
    .isMongoId().withMessage('Valid student ID is required'),
  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('courseId')
    .optional().isMongoId().withMessage('Invalid courseId'),
  validate,
];

// ── GET/DELETE /api/attendance/:id ────────────────────────────────────────────
const idParamValidator = [
  param('id').isMongoId().withMessage('Valid attendance record ID is required'),
  validate,
];

module.exports = {
  markAttendanceValidator,
  updateAttendanceValidator,
  getAttendanceValidator,
  studentAttendanceValidator,
  idParamValidator,
};
