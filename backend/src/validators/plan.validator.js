const { body } = require('express-validator');

const planValidator = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('monthlyPrice').isNumeric().withMessage('Monthly price must be a number').isFloat({ min: 0 }),
  body('yearlyPrice').isNumeric().withMessage('Yearly price must be a number').isFloat({ min: 0 }),
  body('studentLimit').isInt({ min: 1 }).withMessage('Student limit must be an integer >= 1'),
  body('teacherLimit').isInt({ min: 1 }).withMessage('Teacher limit must be an integer >= 1'),
  body('branchLimit').isInt({ min: 1 }).withMessage('Branch limit must be an integer >= 1'),
  body('storageLimit').isInt({ min: 1 }).withMessage('Storage limit (GB) must be an integer >= 1'),
  body('features').isArray().withMessage('Features must be an array of strings'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

module.exports = { planValidator };
