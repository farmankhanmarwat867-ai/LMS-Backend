const notificationService = require('../services/notification.service');
const apiResponse = require('../utils/apiResponse');

class NotificationController {
  /**
   * POST /api/notifications
   * Trigger a new notification manually (Admin/System).
   */
  createNotification = async (req, res, next) => {
    try {
      const { instituteId, branchId } = req.user;
      
      const result = await notificationService.sendNotification(
        req.body, // { userId, type, title, message, channels, actionLink }
        { instituteId, branchId }
      );

      return apiResponse.created(res, result, 'Notification dispatched successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/notifications
   * Fetch in-app notifications for the logged-in user.
   */
  getMyNotifications = async (req, res, next) => {
    try {
      const result = await notificationService.getMyNotifications(req.user.id, req.query);
      return apiResponse.success(
        res,
        result.data,
        'Notifications retrieved successfully',
        200,
        result.pagination
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/notifications/:id/read
   * Mark a specific notification as read.
   */
  markAsRead = async (req, res, next) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user.id);
      return apiResponse.success(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new NotificationController();
