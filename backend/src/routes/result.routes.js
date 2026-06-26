/**
 * Result Routes — Phase 16
 * ═══════════════════════════════════════════════════════════════════════════════
 * Route order matters — specific paths must come BEFORE parameterized :id routes.
 *
 * Endpoints:
 *  GET     /api/results/my                     → Student dashboard (own results)
 *  GET     /api/results/my-child/:studentId    → Parent dashboard (child results)
 *  GET     /api/results                        → Admin/Teacher list view
 *  GET     /api/results/:id                    → Single result detail
 *  GET     /api/results/:id/history            → Marks change history (audit trail)
 *  POST    /api/results/bulk                   → Bulk create/update results
 *  POST    /api/results                        → Create single result
 *  PUT     /api/results/:id                    → Update result
 *  PATCH   /api/results/:id/publish            → Publish (lock) result
 *  PATCH   /api/results/:id/unpublish          → Unpublish (unlock) result
 *  DELETE  /api/results/:id                    → Soft delete result
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router  = express.Router();

const resultService = require('../services/result.service');
const { protect }   = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate }  = require('../middlewares/validate.middleware');
const {
  createResultValidator,
  updateResultValidator,
  bulkResultValidator,
} = require('../validators/result.validator');

// ── GET /api/results/my  (STUDENT only) ────────────────────────────────────────
router.get(
  '/my',
  protect,
  authorize('STUDENT'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const results = await resultService.getMyResults(req.user, {
        page:  parseInt(page),
        limit: parseInt(limit),
      });
      res.status(200).json({ success: true, message: 'Results retrieved successfully', ...results });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/results/my-child/:studentId  (PARENT only) ───────────────────────
router.get(
  '/my-child/:studentId',
  protect,
  authorize('PARENT'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const results = await resultService.getChildResults(
        req.params.studentId,
        req.user,
        { page: parseInt(page), limit: parseInt(limit) }
      );
      res.status(200).json({ success: true, message: 'Child results retrieved successfully', ...results });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/results  (Admin / Teacher) ───────────────────────────────────────
router.get(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const results = await resultService.getResults(
        filters,
        { page: parseInt(page), limit: parseInt(limit) },
        req.user
      );
      res.status(200).json({ success: true, message: 'Results retrieved successfully', ...results });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/results/:id/history  (Admin / Teacher) ───────────────────────────
router.get(
  '/:id/history',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  async (req, res, next) => {
    try {
      const history = await resultService.getResultHistory(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Result history retrieved successfully',
        data:    history,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/results/:id  (All authenticated roles) ───────────────────────────
router.get(
  '/:id',
  protect,
  async (req, res, next) => {
    try {
      const result = await resultService.getResultById(req.params.id, req.user);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/results/bulk  (Admin / Teacher) ─────────────────────────────────
router.post(
  '/bulk',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  bulkResultValidator,
  validate,
  async (req, res, next) => {
    try {
      const outcome = await resultService.bulkUploadResults(
        req.body.examScheduleId,
        req.body.results,
        req.user
      );
      res.status(201).json({
        success: true,
        message: 'Bulk result operation completed',
        data:    outcome,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/results  (Admin / Teacher) ──────────────────────────────────────
router.post(
  '/',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  createResultValidator,
  validate,
  async (req, res, next) => {
    try {
      const result = await resultService.createResult(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Result created successfully',
        data:    result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/results/:id  (Admin / Teacher) ───────────────────────────────────
router.put(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  updateResultValidator,
  validate,
  async (req, res, next) => {
    try {
      const updated = await resultService.updateResult(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Result updated successfully',
        data:    updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/results/:id/publish  (INSTITUTE_ADMIN / BRANCH_ADMIN) ──────────
router.patch(
  '/:id/publish',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER'),
  async (req, res, next) => {
    try {
      const result = await resultService.publishResult(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Result published successfully',
        data:    result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/results/:id/unpublish  (INSTITUTE_ADMIN / BRANCH_ADMIN) ────────
router.patch(
  '/:id/unpublish',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  async (req, res, next) => {
    try {
      const result = await resultService.unpublishResult(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Result unpublished successfully',
        data:    result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/results/:id  (INSTITUTE_ADMIN / BRANCH_ADMIN) ─────────────────
router.delete(
  '/:id',
  protect,
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  async (req, res, next) => {
    try {
      await resultService.deleteResult(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Result soft deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
