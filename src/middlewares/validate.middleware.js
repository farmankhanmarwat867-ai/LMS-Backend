const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/apiResponse');

/**
 * Validation Middleware — runs after express-validator chains
 * Collects all errors and returns a standardized 400 response
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return badRequest(res, 'Validation failed', formatted);
  }
  next();
};

module.exports = { validate };
