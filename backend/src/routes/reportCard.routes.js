/**
 * Report Card Routes — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * All routes follow the pattern:
 *   protect → authorize (RBAC) → validate → controller
 *
 * Route Map:
 *   POST   /api/report-cards/generate            → generateReportCards
 *   GET    /api/report-cards                     → getReportCards
 *   GET    /api/report-cards/student/:studentId  → getStudentReportCards
 *   GET    /api/report-cards/:id                 → getReportCardById
 *   GET    /api/report-cards/:id/pdf             → generatePdf
 *   PATCH  /api/report-cards/:id/comments        → addComments
 *   PATCH  /api/report-cards/:id/publish         → publishReportCard
 *   PATCH  /api/report-cards/:id/unpublish       → unpublishReportCard
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express    = require('express');
const router     = express.Router();

const controller = require('../controllers/reportCard.controller');
const { protect }    = require('../middlewares/auth.middleware');
const { authorize }  = require('../middlewares/rbac.middleware');
const { validate }   = require('../middlewares/validate.middleware');
const {
  generateValidator,
  commentsValidator,
  listValidator,
  idParamValidator,
  studentIdParamValidator,
} = require('../validators/reportCard.validator');

// ── POST /api/report-cards/generate ──────────────────────────────────────────
/**
 * Generate DRAFT report cards for all students in an exam.
 * RBAC: INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER
 */
router.post(
  '/generate',
  protect,
  authorize('INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  generateValidator,
  validate,
  controller.generateReportCards
);

// ── GET /api/report-cards ─────────────────────────────────────────────────────
/**
 * List all report cards with pagination & optional filters.
 * Query params: examId, classId, sectionId, status, page, limit
 * RBAC: SUPER_ADMIN, INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER
 */
router.get(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  listValidator,
  validate,
  controller.getReportCards
);

// ── GET /api/report-cards/student/:studentId ──────────────────────────────────
/**
 * Get all report cards for a specific student.
 * NOTE: This MUST come before /:id to avoid route conflicts.
 * RBAC: All roles (service enforces STUDENT=own, PARENT=child only)
 */
router.get(
  '/student/:studentId',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  studentIdParamValidator,
  validate,
  controller.getStudentReportCards
);

// ── GET /api/report-cards/:id ─────────────────────────────────────────────────
/**
 * Get a single report card by ID.
 * RBAC: All roles (service enforces visibility rules)
 */
router.get(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  idParamValidator,
  validate,
  controller.getReportCardById
);

// ── GET /api/report-cards/:id/pdf ─────────────────────────────────────────────
/**
 * Generate HTML report card (Phase 17 PDF stub).
 * In Phase 18 this will return a real downloadable PDF.
 * RBAC: All roles (service enforces STUDENT/PARENT only see PUBLISHED)
 */
router.get(
  '/:id/pdf',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  idParamValidator,
  validate,
  controller.generatePdf
);

// ── PATCH /api/report-cards/:id/comments ─────────────────────────────────────
/**
 * Add or update comments on a DRAFT report card.
 * TEACHER: teacherComments only
 * INSTITUTE_ADMIN / BRANCH_ADMIN: both teacherComments + principalComments
 */
router.patch(
  '/:id/comments',
  protect,
  authorize('INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  commentsValidator,
  validate,
  controller.addComments
);

// ── PATCH /api/report-cards/:id/publish ──────────────────────────────────────
/**
 * Publish a DRAFT report card → sets isLocked=true.
 * Students and Parents gain visibility after this.
 * RBAC: INSTITUTE_ADMIN, BRANCH_ADMIN
 */
router.patch(
  '/:id/publish',
  protect,
  authorize('INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  idParamValidator,
  validate,
  controller.publishReportCard
);

// ── PATCH /api/report-cards/:id/unpublish ────────────────────────────────────
/**
 * Unpublish a report card → sets isLocked=false, allows edits again.
 * RBAC: INSTITUTE_ADMIN, BRANCH_ADMIN
 */
router.patch(
  '/:id/unpublish',
  protect,
  authorize('INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  idParamValidator,
  validate,
  controller.unpublishReportCard
);

module.exports = router;
