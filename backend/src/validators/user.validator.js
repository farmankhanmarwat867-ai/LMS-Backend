const { body, query } = require('express-validator');
const { ROLES } = require('../constants/roles');

/**
 * Phase 8 — User Management Validators
 */

// Roles that can be created via the User Management API (not SUPER_ADMIN)
const CREATABLE_ROLES = [
  ROLES.INSTITUTE_ADMIN,
  ROLES.BRANCH_ADMIN,
  ROLES.TEACHER,
  ROLES.STUDENT,
  ROLES.PARENT,
];

// ── Create User ───────────────────────────────────────────────────────────
const createUserValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(CREATABLE_ROLES).withMessage(`Role must be one of: ${CREATABLE_ROLES.join(', ')}`),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMobilePhone().withMessage('Please provide a valid phone number'),

  body('branchId')
    .optional()
    .isMongoId().withMessage('branchId must be a valid MongoDB ObjectId'),

  body('instituteId')
    .optional()
    .isMongoId().withMessage('instituteId must be a valid MongoDB ObjectId'),

  body('classId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),

  body('sectionId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('sectionId must be a valid MongoDB ObjectId'),

  // Parent-specific: array of student ObjectIds to link
  body('parentOf')
    .optional()
    .isArray().withMessage('parentOf must be an array'),
  body('parentOf.*')
    .optional()
    .isMongoId().withMessage('Each parentOf entry must be a valid MongoDB ObjectId'),
];

// ── Update User ───────────────────────────────────────────────────────────
const updateUserValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMobilePhone().withMessage('Please provide a valid phone number'),

  body('avatar')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ require_tld: false }).withMessage('Avatar must be a valid URL'),

  body('branchId')
    .optional()
    .isMongoId().withMessage('branchId must be a valid MongoDB ObjectId'),

  body('classId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),

  body('sectionId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('sectionId must be a valid MongoDB ObjectId'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .not().exists().withMessage('Use /auth/change-password to update the password'),

  body('role')
    .not().exists().withMessage('Role cannot be changed via this endpoint'),
];

// ── Status Change ─────────────────────────────────────────────────────────
const changeUserStatusValidator = [
  body('isActive')
    .notEmpty().withMessage('isActive is required')
    .isBoolean().withMessage('isActive must be true or false'),
];

// ── List Users (Query Params) ─────────────────────────────────────────────
const listUsersValidator = [
  query('role')
    .optional()
    .isIn(CREATABLE_ROLES).withMessage(`role filter must be one of: ${CREATABLE_ROLES.join(', ')}`),

  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('search query too long'),

  query('classId')
    .optional()
    .isMongoId().withMessage('classId must be a valid MongoDB ObjectId'),
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  changeUserStatusValidator,
  listUsersValidator,
};
