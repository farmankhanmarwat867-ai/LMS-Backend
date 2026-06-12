const express = require('express');
const router = express.Router();
const parentPortalController = require('../controllers/parentPortal.controller');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');

router.use(protect);
router.use(hasPermission('parent-portal:read'));

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard', parentPortalController.getDashboard);

// ─── Children ────────────────────────────────────────────────────────────────
router.get('/children', parentPortalController.getChildren);
router.get('/children/:childId/attendance', parentPortalController.getChildAttendance);
router.get('/children/:childId/assignments', parentPortalController.getChildAssignments);
router.get('/children/:childId/results', parentPortalController.getChildResults);

// ─── Fees ────────────────────────────────────────────────────────────────────
router.get('/fees', parentPortalController.getFees);

module.exports = router;
