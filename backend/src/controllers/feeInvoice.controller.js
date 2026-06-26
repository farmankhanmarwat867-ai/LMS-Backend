/**
 * Fee Invoice Controller — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * HTTP controller for Fee Invoice & Payment endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const feeService  = require('../services/fee.service');
const apiResponse = require('../utils/apiResponse');

// ── Invoices ──────────────────────────────────────────────────────────────────

/**
 * POST /api/fee-invoices
 * Generate a fee invoice for a student.
 */
exports.createInvoice = async (req, res, next) => {
  try {
    const invoice = await feeService.createInvoice(req.body, req.user);
    return apiResponse.created(res, invoice, 'Fee invoice created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fee-invoices
 * List invoices with role-aware filtering.
 */
exports.getInvoices = async (req, res, next) => {
  try {
    const { studentId, instituteId, branchId, sessionId, status, page, limit } = req.query;
    const filters    = { studentId, instituteId, branchId, sessionId, status };
    const pagination = { page, limit };
    const result = await feeService.getInvoices(filters, pagination, req.user);
    return apiResponse.success(res, result.data, 'Invoices fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fee-invoices/:id
 * Get a single invoice with full details.
 */
exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await feeService.getInvoiceById(req.params.id, req.user);
    return apiResponse.success(res, invoice, 'Invoice fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fee-invoices/:id/discounts
 * Add a discount or scholarship to an invoice.
 */
exports.addDiscount = async (req, res, next) => {
  try {
    const invoice = await feeService.addDiscount(req.params.id, req.body, req.user);
    return apiResponse.success(res, invoice, 'Discount applied successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fee-invoices/:id/fines
 * Add a late-fee fine to an invoice.
 */
exports.addFine = async (req, res, next) => {
  try {
    const invoice = await feeService.addFine(req.params.id, req.body, req.user);
    return apiResponse.success(res, invoice, 'Fine added successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fee-invoices/:id/cancel
 * Cancel an invoice.
 */
exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await feeService.cancelInvoice(req.params.id, req.user);
    return apiResponse.success(res, invoice, 'Invoice cancelled');
  } catch (err) {
    next(err);
  }
};

// ── Parent Portal ─────────────────────────────────────────────────────────────

/**
 * GET /api/fee-invoices/parent-portal
 * Returns fee status summary for all children of the authenticated parent.
 */
exports.getParentPortalFeeStatus = async (req, res, next) => {
  try {
    const result = await feeService.getParentPortalFeeStatus(req.user._id);
    return apiResponse.success(res, result, 'Parent portal fee status fetched');
  } catch (err) {
    next(err);
  }
};
