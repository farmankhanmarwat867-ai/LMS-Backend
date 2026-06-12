/**
 * Standardized API Response Utility
 */

const success = (res, data = null, message = 'Operation successful', statusCode = 200, pagination = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

const created = (res, data = null, message = 'Created successfully') =>
  success(res, data, message, 201);

const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const forbidden = (res, message = 'Access denied') =>
  error(res, message, 403);

const unauthorized = (res, message = 'Not authorized') =>
  error(res, message, 401);

const badRequest = (res, message = 'Bad request', errors = null) =>
  error(res, message, 400, errors);

module.exports = { success, created, error, notFound, forbidden, unauthorized, badRequest };
