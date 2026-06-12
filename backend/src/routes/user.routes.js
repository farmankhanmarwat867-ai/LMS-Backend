const express  = require('express');
const router   = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  deleteUser,
  getChildrenOfParent,
  linkStudentToParent,
  unlinkStudentFromParent,
} = require('../controllers/user.controller');

const { protect }        = require('../middlewares/auth.middleware');
const { hasPermission }  = require('../middlewares/rbac.middleware');
const { tenantGuard }    = require('../middlewares/tenant.middleware');
const { validate }       = require('../middlewares/validate.middleware');

const {
  createUserValidator,
  updateUserValidator,
  changeUserStatusValidator,
  listUsersValidator,
} = require('../validators/user.validator');

// ── All routes require authentication + tenant scope ───────────────────────────
router.use(protect);
router.use(tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST   /api/users          — Create user  (SA, IA, BA)
// GET    /api/users          — List users   (SA, IA, BA)
router
  .route('/')
  .post(
    hasPermission('users:create'),
    createUserValidator,
    validate,
    createUser
  )
  .get(
    hasPermission('users:read'),
    listUsersValidator,
    validate,
    getAllUsers
  );

// ─────────────────────────────────────────────────────────────────────────────
// PARENT-STUDENT RELATIONSHIP ROUTES  (must come BEFORE /:id routes)
// ─────────────────────────────────────────────────────────────────────────────

// GET    /api/users/parents/:parentId/children
router.get(
  '/parents/:parentId/children',
  hasPermission('users:read'),
  getChildrenOfParent
);

// POST   /api/users/parents/:parentId/link/:studentId
router.post(
  '/parents/:parentId/link/:studentId',
  hasPermission('users:update'),
  linkStudentToParent
);

// DELETE /api/users/parents/:parentId/unlink/:studentId
router.delete(
  '/parents/:parentId/unlink/:studentId',
  hasPermission('users:update'),
  unlinkStudentFromParent
);

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL RESOURCE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET    /api/users/:id      — Get user by ID   (SA, IA, BA)
// PUT    /api/users/:id      — Update user       (SA, IA, BA)
// DELETE /api/users/:id      — Soft-delete user  (SA, IA)
router
  .route('/:id')
  .get(
    hasPermission('users:read'),
    getUserById
  )
  .put(
    hasPermission('users:update'),
    updateUserValidator,
    validate,
    updateUser
  )
  .delete(
    hasPermission('users:delete'),
    deleteUser
  );

// PATCH  /api/users/:id/status  — Activate / Deactivate user (SA, IA, BA)
router.patch(
  '/:id/status',
  hasPermission('users:status'),
  changeUserStatusValidator,
  validate,
  changeUserStatus
);

module.exports = router;
