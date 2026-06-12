const communicationService = require('../services/communication.service');
const apiResponse = require('../utils/apiResponse');

class CommunicationController {
  // ─── Messages ───────────────────────────────────────────────────────────────

  sendMessage = async (req, res) => {
    try {
      const { receiverId, subject, body, relatedStudentId } = req.body;
      const senderId = req.user.id;
      const instituteId = req.user.instituteId;
      const branchId = req.user.branchId;

      if (!receiverId || !subject || !body) {
        return res.status(400).json(error('receiverId, subject, and body are required'));
      }

      const message = await communicationService.sendMessage({
        senderId,
        receiverId,
        subject,
        body,
        relatedStudentId,
        instituteId,
        branchId,
      });

      return apiResponse.created(res, message, 'Message sent successfully');
    } catch (err) {
      next(err);
    }
  };

  getMessages = async (req, res, next) => {
    try {
      const type = req.query.type || 'inbox'; // inbox, sent, all
      const messages = await communicationService.getMessages(req.user.id, type);
      return apiResponse.success(res, messages, 'Messages retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  markMessageRead = async (req, res, next) => {
    try {
      const message = await communicationService.markMessageRead(req.params.id, req.user.id);
      return apiResponse.success(res, message, 'Message marked as read');
    } catch (err) {
      next(err);
    }
  };

  // ─── Notifications ──────────────────────────────────────────────────────────

  getNotifications = async (req, res, next) => {
    try {
      const notifications = await communicationService.getNotifications(req.user.id);
      return apiResponse.success(res, notifications, 'Notifications retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  markNotificationRead = async (req, res, next) => {
    try {
      const notification = await communicationService.markNotificationRead(req.params.id, req.user.id);
      return apiResponse.success(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  };

  // ─── Announcements ──────────────────────────────────────────────────────────

  getAnnouncements = async (req, res, next) => {
    try {
      const { instituteId, branchId, role } = req.user;
      const announcements = await communicationService.getAnnouncements({ instituteId, branchId, role });
      return apiResponse.success(res, announcements, 'Announcements retrieved successfully');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CommunicationController();
