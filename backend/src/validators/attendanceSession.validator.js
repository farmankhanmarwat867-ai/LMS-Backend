const { body, param } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const createSessionValidator = [
  body('courseId')
    .isMongoId().withMessage('Valid course ID is required'),
  body('validForMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 }).withMessage('validForMinutes must be between 1 and 1440 (24h)'),
  body('date')
    .optional()
    .isISO8601().withMessage('Valid date is required (ISO 8601 format)')
    .toDate(),
  body('topic')
    .optional()
    .isString().withMessage('Topic must be a string')
    .trim(),
  validate,
];

const idParamValidator = [
  param('id').isMongoId().withMessage('Valid session ID is required'),
  validate,
];

const scanQrValidator = [
  body('qrToken')
    .isString().withMessage('QR token is required')
    .notEmpty().withMessage('QR token cannot be empty')
    .trim(),
  validate,
];

module.exports = {
  createSessionValidator,
  idParamValidator,
  scanQrValidator,
};
