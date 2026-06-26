const { error } = require('../utils/apiResponse');

/**
 * Global Error Handler Middleware
 * Must be registered last in app.js
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Custom thrown errors with status
  if (err.status) {
    return error(res, err.message, err.status);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return error(res, 'Validation failed', 400, messages);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return error(res, `'${err.keyValue[field]}' already exists for field: ${field}`, 409);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return error(res, `Invalid value for field: ${err.path}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return error(res, 'Invalid token', 401);
  if (err.name === 'TokenExpiredError') return error(res, 'Token expired', 401);

  // Default 500
  return error(res, err.message || 'Internal server error', err.statusCode || 500);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = { errorHandler, notFoundHandler };
