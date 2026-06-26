const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const scanValidator = [
  body('qrCodeValue')
    .isString().withMessage('QR code value is required')
    .notEmpty().withMessage('QR code cannot be empty')
    .trim(),
  validate,
];

module.exports = {
  scanValidator,
};
