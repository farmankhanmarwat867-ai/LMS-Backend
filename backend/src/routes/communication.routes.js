const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communication.controller');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');

router.use(protect);

// ─── Messages ───────────────────────────────────────────────────────────────
router.post(
  '/messages',
  hasPermission('communications:create'),
  communicationController.sendMessage
);

router.get(
  '/messages',
  hasPermission('communications:read'),
  communicationController.getMessages
);

router.patch(
  '/messages/:id/read',
  hasPermission('communications:read'),
  communicationController.markMessageRead
);

// ─── Notifications ──────────────────────────────────────────────────────────
router.get(
  '/notifications',
  hasPermission('communications:read'),
  communicationController.getNotifications
);

router.patch(
  '/notifications/:id/read',
  hasPermission('communications:read'),
  communicationController.markNotificationRead
);

// ─── Announcements ──────────────────────────────────────────────────────────
// Different from /api/announcements as this is tailored for the current user's scope
router.get(
  '/announcements',
  hasPermission('communications:read'),
  communicationController.getAnnouncements
);

module.exports = router;
