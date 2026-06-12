/**
 * Fee Validators — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * express-validator rules for Fee Structure, Invoice, and Payment endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { body, param, query } = require('express-validator');

// ─────────────────────────────────────────────────────────────────────────────
// FEE STRUCTURE VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

exports.createFeeStructureValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Fee structure name is required')
    .isLength({ max: 120 }).withMessage('Name too long'),

  body('instituteId')
    .notEmpty().withMessage('instituteId is required')
    .isMongoId().withMessage('Invalid instituteId'),

  body('branchId')
    .notEmpty().withMessage('branchId is required')
    .isMongoId().withMessage('Invalid branchId'),

  body('sessionId')
    .notEmpty().withMessage('sessionId is required')
    .isMongoId().withMessage('Invalid sessionId'),

  body('classId')
    .optional()
    .isMongoId().withMessage('Invalid classId'),

  body('frequency')
    .optional()
    .isIn(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'])
    .withMessage('Invalid frequency'),

  body('items')
    .isArray({ min: 1 }).withMessage('At least one fee item is required'),

  body('items.*.type')
    .isIn(['TUITION', 'ADMISSION', 'EXAM', 'LIBRARY', 'TRANSPORT', 'CUSTOM'])
    .withMessage('Invalid fee item type'),

  body('items.*.label')
    .trim()
    .notEmpty().withMessage('Fee item label is required'),

  body('items.*.amount')
    .isFloat({ min: 0 }).withMessage('Fee item amount must be a non-negative number'),

  body('items.*.isOptional')
    .optional()
    .isBoolean(),
];

exports.updateFeeStructureValidator = [
  param('id').isMongoId().withMessage('Invalid fee structure ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('frequency')
    .optional()
    .isIn(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
  body('items')
    .optional()
    .isArray({ min: 1 }),
  body('items.*.type')
    .optional()
    .isIn(['TUITION', 'ADMISSION', 'EXAM', 'LIBRARY', 'TRANSPORT', 'CUSTOM']),
  body('items.*.amount')
    .optional()
    .isFloat({ min: 0 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// FEE INVOICE VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

exports.createInvoiceValidator = [
  body('studentId')
    .notEmpty().withMessage('studentId is required')
    .isMongoId().withMessage('Invalid studentId'),

  body('feeStructureId')
    .notEmpty().withMessage('feeStructureId is required')
    .isMongoId().withMessage('Invalid feeStructureId'),

  body('sessionId')
    .notEmpty().withMessage('sessionId is required')
    .isMongoId().withMessage('Invalid sessionId'),

  body('branchId')
    .notEmpty().withMessage('branchId is required')
    .isMongoId().withMessage('Invalid branchId'),

  body('instituteId')
    .notEmpty().withMessage('instituteId is required')
    .isMongoId().withMessage('Invalid instituteId'),

  body('dueDate')
    .notEmpty().withMessage('dueDate is required')
    .isISO8601().withMessage('dueDate must be a valid date'),

  body('billingMonth')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('billingMonth must be 1–12'),

  body('billingYear')
    .optional()
    .isInt({ min: 2000, max: 2100 }),

  body('discounts')
    .optional()
    .isArray(),

  body('discounts.*.label')
    .if(body('discounts').exists())
    .notEmpty().withMessage('Discount label is required'),

  body('discounts.*.type')
    .optional()
    .isIn(['PERCENT', 'FLAT']),

  body('discounts.*.value')
    .if(body('discounts').exists())
    .isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
];

exports.addDiscountValidator = [
  param('id').isMongoId().withMessage('Invalid invoice ID'),
  body('label').trim().notEmpty().withMessage('Discount label is required'),
  body('type').optional().isIn(['PERCENT', 'FLAT']),
  body('value').isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
];

exports.addFineValidator = [
  param('id').isMongoId().withMessage('Invalid invoice ID'),
  body('reason').trim().notEmpty().withMessage('Fine reason is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Fine amount must be positive'),
];

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

exports.recordPaymentValidator = [
  body('invoiceId')
    .notEmpty().withMessage('invoiceId is required')
    .isMongoId().withMessage('Invalid invoiceId'),

  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),

  body('paymentMethod')
    .isIn(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CARD', 'OTHER'])
    .withMessage('Invalid payment method'),

  body('transactionReference')
    .optional()
    .isString(),

  body('paymentDate')
    .optional()
    .isISO8601().withMessage('paymentDate must be a valid ISO date'),
];
