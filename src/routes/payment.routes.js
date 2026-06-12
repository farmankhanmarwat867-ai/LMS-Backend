/**
 * Payment Routes — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * POST   /api/payments        – Record a payment
 * GET    /api/payments        – List payments (payment history)
 * GET    /api/payments/:id    – Get single payment / receipt
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router  = express.Router();

const controller    = require('../controllers/payment.controller');
const { protect }   = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate }  = require('../middlewares/validate.middleware');
const { recordPaymentValidator } = require('../validators/fee.validator');

// ── POST /api/payments ────────────────────────────────────────────────────────
/**
 * Record a new payment against a fee invoice.
 * Supports partial payments.
 * RBAC: SUPER_ADMIN, INSTITUTE_ADMIN, BRANCH_ADMIN
 */
router.post(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  recordPaymentValidator,
  validate,
  controller.recordPayment
);

// ── GET /api/payments ─────────────────────────────────────────────────────────
/**
 * List payment history.
 * Students and parents see their own payments only.
 * Staff can filter by studentId, invoiceId, branchId, etc.
 */
router.get(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getPayments
);

// ── GET /api/payments/:id ─────────────────────────────────────────────────────
/**
 * Get a single payment record (receipt).
 * Students and parents can view their own receipts.
 */
router.get(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getPaymentById
);

module.exports = router;
