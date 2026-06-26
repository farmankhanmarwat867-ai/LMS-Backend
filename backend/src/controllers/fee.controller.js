/**
 * Fee Controller — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * HTTP controller for Fee Structure endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const feeService  = require('../services/fee.service');
const apiResponse = require('../utils/apiResponse');

// ── Fee Structures ────────────────────────────────────────────────────────────

/**
 * POST /api/fees
 * Create a new fee structure.
 */
exports.createFeeStructure = async (req, res, next) => {
  try {
    const structure = await feeService.createFeeStructure(req.body, req.user);
    return apiResponse.created(res, structure, 'Fee structure created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fees
 * List fee structures with optional filters.
 */
exports.getFeeStructures = async (req, res, next) => {
  try {
    const { instituteId, branchId, sessionId, classId, page, limit } = req.query;
    const filters    = { instituteId, branchId, sessionId, classId };
    const pagination = { page, limit };
    const result = await feeService.getFeeStructures(filters, pagination);
    return apiResponse.success(res, result.data, 'Fee structures fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fees/:id
 * Get single fee structure.
 */
exports.getFeeStructureById = async (req, res, next) => {
  try {
    const structure = await feeService.getFeeStructureById(req.params.id);
    return apiResponse.success(res, structure, 'Fee structure fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/fees/:id
 * Update a fee structure.
 */
exports.updateFeeStructure = async (req, res, next) => {
  try {
    const structure = await feeService.updateFeeStructure(req.params.id, req.body, req.user);
    return apiResponse.success(res, structure, 'Fee structure updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/fees/:id
 * Soft-delete a fee structure.
 */
exports.deleteFeeStructure = async (req, res, next) => {
  try {
    const result = await feeService.deleteFeeStructure(req.params.id, req.user);
    return apiResponse.success(res, result, 'Fee structure deleted');
  } catch (err) {
    next(err);
  }
};
