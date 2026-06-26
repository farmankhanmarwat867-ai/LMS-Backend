/**
 * Fee Structure Routes — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * POST   /api/fees          – Create fee structure
 * GET    /api/fees          – List fee structures
 * GET    /api/fees/:id      – Get single fee structure
 * PUT    /api/fees/:id      – Update fee structure
 * DELETE /api/fees/:id      – Soft-delete fee structure
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router  = express.Router();

const controller = require('../controllers/fee.controller');
const { protect }   = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate }  = require('../middlewares/validate.middleware');
const {
  createFeeStructureValidator,
  updateFeeStructureValidator,
} = require('../validators/fee.validator');

// ── POST /api/fees ────────────────────────────────────────────────────────────
/**
 * Create a new fee structure.
 * RBAC: INSTITUTE_ADMIN, BRANCH_ADMIN, SUPER_ADMIN
 */
router.post(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  createFeeStructureValidator,
  validate,
  controller.createFeeStructure
);

// ── GET /api/fees ─────────────────────────────────────────────────────────────
/**
 * List all fee structures (filtered by branchId, sessionId, classId).
 * RBAC: All authenticated staff + Student + Parent (read-only)
 */
router.get(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getFeeStructures
);

// ── GET /api/fees/:id ─────────────────────────────────────────────────────────
router.get(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getFeeStructureById
);

// ── PUT /api/fees/:id ─────────────────────────────────────────────────────────
router.put(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  updateFeeStructureValidator,
  validate,
  controller.updateFeeStructure
);

// ── DELETE /api/fees/:id ──────────────────────────────────────────────────────
router.delete(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  controller.deleteFeeStructure
);

module.exports = router;
