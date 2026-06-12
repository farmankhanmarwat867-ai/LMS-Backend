const express = require('express');
const router = express.Router();

const {
  createSession,
  getAllSessions,
  getActiveSession,
  getSessionById,
  updateSession,
  changeSessionStatus,
  deleteSession,
} = require('../controllers/academicSession.controller');

const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createSessionValidator,
  updateSessionValidator,
  changeStatusValidator,
  sessionIdValidator,
} = require('../validators/academicSession.validator');

// ── All session routes require authentication + tenant context ────────
router.use(protect);
router.use(tenantGuard);

// ── Special route: GET /api/sessions/active ───────────────────────────
// Must be declared BEFORE /:id to avoid 'active' being parsed as an ID
router.get(
  '/active',
  hasPermission('sessions:read'),
  getActiveSession
);

// ── Collection routes ─────────────────────────────────────────────────
router
  .route('/')
  .get(hasPermission('sessions:read'), getAllSessions)
  .post(hasPermission('sessions:create'), createSessionValidator, validate, createSession);

// ── Document routes ───────────────────────────────────────────────────
router
  .route('/:id')
  .get(hasPermission('sessions:read'), sessionIdValidator, validate, getSessionById)
  .put(hasPermission('sessions:update'), sessionIdValidator, validate, updateSessionValidator, validate, updateSession)
  .delete(hasPermission('sessions:delete'), sessionIdValidator, validate, deleteSession);

// ── Status transition ─────────────────────────────────────────────────
router.patch(
  '/:id/status',
  hasPermission('sessions:status'),
  sessionIdValidator,
  validate,
  changeStatusValidator,
  validate,
  changeSessionStatus
);

module.exports = router;
