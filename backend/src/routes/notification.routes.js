const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(protect);

// ── GET /api/notifications ────────────────────────────────────────────────────
// All authenticated users can fetch their own notifications
router.get('/', notificationController.getMyNotifications);

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
// All authenticated users can mark their own notifications as read
router.patch('/:id/read', notificationController.markAsRead);

// ── POST /api/notifications ───────────────────────────────────────────────────
// Only Admins (for now) can manually dispatch a notification
router.post(
  '/',
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'),
  notificationController.createNotification
);

module.exports = router;
