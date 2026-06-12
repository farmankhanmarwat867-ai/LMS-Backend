/**
 * Payment Controller — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * HTTP controller for Payment endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const feeService  = require('../services/fee.service');
const apiResponse = require('../utils/apiResponse');

/**
 * POST /api/payments
 * Record a payment against an invoice (supports partial payments).
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const result = await feeService.recordPayment(req.body, req.user);
    return apiResponse.created(res, result, 'Payment recorded successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments
 * Paginated payment history with role-based filtering.
 */
exports.getPayments = async (req, res, next) => {
  try {
    const { studentId, instituteId, branchId, invoiceId, paymentMethod, status, page, limit } = req.query;
    const filters    = { studentId, instituteId, branchId, invoiceId, paymentMethod, status };
    const pagination = { page, limit };
    const result = await feeService.getPayments(filters, pagination, req.user);
    return apiResponse.success(res, result.data, 'Payments fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/:id
 * Get a single payment / receipt details.
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await feeService.getPaymentById(req.params.id, req.user);
    return apiResponse.success(res, payment, 'Payment fetched');
  } catch (err) {
    next(err);
  }
};
