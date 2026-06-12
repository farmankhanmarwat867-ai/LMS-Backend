/**
 * Academic Record Validators — Phase 18
 * ═══════════════════════════════════════════════════════════════════════════════
 * Input validation for Academic Record endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { param, query } = require('express-validator');

exports.calculateValidator = [
  param('sessionId')
    .isMongoId()
    .withMessage('sessionId must be a valid MongoDB ObjectId'),
];

exports.meritListValidator = [
  query('sessionId')
    .isMongoId()
    .withMessage('sessionId is required to fetch merit list'),
  query('classId')
    .optional()
    .isMongoId(),
  query('sectionId')
    .optional()
    .isMongoId(),
  query('branchId')
    .optional()
    .isMongoId(),
  query('academicStanding')
    .optional()
    .isIn(['HONORS', 'GOOD_STANDING', 'ACADEMIC_WARNING', 'PROBATION']),
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
];

exports.studentAnalyticsValidator = [
  param('studentId')
    .isMongoId()
    .withMessage('studentId must be a valid MongoDB ObjectId'),
  query('sessionId')
    .isMongoId()
    .withMessage('sessionId is required in query params'),
];
