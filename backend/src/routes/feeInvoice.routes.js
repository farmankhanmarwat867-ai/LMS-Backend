/**
 * Fee Invoice Routes — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * POST   /api/fee-invoices                      – Create invoice
 * GET    /api/fee-invoices                      – List invoices
 * GET    /api/fee-invoices/parent-portal        – Parent portal fee status
 * GET    /api/fee-invoices/:id                  – Get single invoice
 * POST   /api/fee-invoices/:id/discounts        – Add discount/scholarship
 * POST   /api/fee-invoices/:id/fines            – Add fine
 * POST   /api/fee-invoices/:id/cancel           – Cancel invoice
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router  = express.Router();

const controller    = require('../controllers/feeInvoice.controller');
const { protect }   = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate }  = require('../middlewares/validate.middleware');
const {
  createInvoiceValidator,
  addDiscountValidator,
  addFineValidator,
} = require('../validators/fee.validator');

// ── POST /api/fee-invoices ────────────────────────────────────────────────────
/**
 * Generate an invoice for a student.
 * RBAC: SUPER_ADMIN, INSTITUTE_ADMIN, BRANCH_ADMIN
 */
router.post(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  createInvoiceValidator,
  validate,
  controller.createInvoice
);

// ── GET /api/fee-invoices/parent-portal ───────────────────────────────────────
/**
 * Parent portal — returns fee summary for all children.
 * Must be above /:id to avoid route collision.
 * RBAC: PARENT only
 */
router.get(
  '/parent-portal',
  protect,
  authorize('PARENT'),
  controller.getParentPortalFeeStatus
);

// ── GET /api/fee-invoices ─────────────────────────────────────────────────────
/**
 * List invoices (role-aware: students/parents see their own).
 */
router.get(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getInvoices
);

// ── GET /api/fee-invoices/:id ─────────────────────────────────────────────────
router.get(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getInvoiceById
);

// ── POST /api/fee-invoices/:id/discounts ──────────────────────────────────────
/**
 * Add a discount or scholarship to an invoice.
 * RBAC: Admins only
 */
router.post(
  '/:id/discounts',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  addDiscountValidator,
  validate,
  controller.addDiscount
);

// ── POST /api/fee-invoices/:id/fines ─────────────────────────────────────────
/**
 * Add a late-payment fine to an invoice.
 * RBAC: Admins only
 */
router.post(
  '/:id/fines',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  addFineValidator,
  validate,
  controller.addFine
);

// ── POST /api/fee-invoices/:id/cancel ─────────────────────────────────────────
/**
 * Cancel an invoice.
 * RBAC: Admins only
 */
router.post(
  '/:id/cancel',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  controller.cancelInvoice
);

module.exports = router;
