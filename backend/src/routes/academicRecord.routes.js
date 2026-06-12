/**
 * Academic Record Routes — Phase 18
 * ═══════════════════════════════════════════════════════════════════════════════
 * Routes for CGPA Calculation, Merit List, and Student Analytics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const controller = require('../controllers/academicRecord.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  calculateValidator,
  meritListValidator,
  studentAnalyticsValidator,
} = require('../validators/academicRecord.validator');

// ── POST /api/academic-records/calculate/:sessionId ────────────────────────────
/**
 * Triggers the CGPA and ranking calculation for a session.
 * RBAC: SUPER_ADMIN, INSTITUTE_ADMIN, BRANCH_ADMIN
 */
router.post(
  '/calculate/:sessionId',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  calculateValidator,
  validate,
  controller.calculateSessionRecords
);

// ── GET /api/academic-records/merit-list ───────────────────────────────────────
/**
 * Fetches merit lists (Top performers) filtered by branch/class.
 * RBAC: SUPER_ADMIN, INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER
 */
router.get(
  '/merit-list',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  meritListValidator,
  validate,
  controller.getMeritList
);

// ── GET /api/academic-records/student/:studentId ───────────────────────────────
/**
 * Fetches student's CGPA, GPA History, and Rank Progression.
 * RBAC: All (Student can only see their own, Parent can only see child's)
 */
router.get(
  '/student/:studentId',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  studentAnalyticsValidator,
  validate,
  controller.getStudentAnalytics
);

module.exports = router;
