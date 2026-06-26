const { body } = require('express-validator');

const createBranchValidator = [
  body('name').trim().notEmpty().withMessage('Branch name is required'),
  body('code').trim().notEmpty().withMessage('Branch code is required').isAlphanumeric().withMessage('Code must be alphanumeric'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  
  // Admin user details needed for auto-creation
  body('adminName').trim().notEmpty().withMessage('Admin name is required'),
  body('adminEmail').isEmail().withMessage('Valid admin email is required').normalizeEmail(),
  body('adminPassword').isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
  body('logo').optional().trim(),
];

const updateBranchValidator = [
  body('name').optional().trim().notEmpty().withMessage('Branch name cannot be empty'),
  body('phone').optional().trim().notEmpty(),
  body('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE']).withMessage('Invalid status'),
  body('logo').optional().trim(),
];

module.exports = { createBranchValidator, updateBranchValidator };
