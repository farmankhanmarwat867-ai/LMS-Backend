const { body } = require('express-validator');

const createInstituteValidator = [
  body('name').trim().notEmpty().withMessage('Institute name is required'),
  body('code').trim().notEmpty().withMessage('Institute code is required').isAlphanumeric().withMessage('Code must be alphanumeric'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('planId').isMongoId().withMessage('Valid Plan ID is required'),
  body('logo').optional().trim(),
  
  // Admin user details needed for auto-creation
  body('adminName').trim().notEmpty().withMessage('Admin name is required'),
  body('adminEmail').isEmail().withMessage('Valid admin email is required').normalizeEmail(),
  body('adminPassword').isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
];

const updateInstituteValidator = [
  body('name').optional().trim().notEmpty().withMessage('Institute name cannot be empty'),
  body('phone').optional().trim().notEmpty(),
  body('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE']).withMessage('Invalid status'),
  body('logo').optional().trim(),
];

module.exports = { createInstituteValidator, updateInstituteValidator };
