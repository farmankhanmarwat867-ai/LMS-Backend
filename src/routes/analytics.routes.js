const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(protect);

// ── GET /api/analytics/platform ───────────────────────────────────────────────
router.get(
  '/platform',
  authorize('SUPER_ADMIN'),
  analyticsController.getPlatformAnalytics
);

// ── GET /api/analytics/institute ──────────────────────────────────────────────
router.get(
  '/institute',
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN'),
  analyticsController.getInstituteAnalytics
);

// ── GET /api/analytics/branch ─────────────────────────────────────────────────
router.get(
  '/branch',
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  analyticsController.getBranchAnalytics
);

module.exports = router;
