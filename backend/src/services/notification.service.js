/**
 * Notification Service — Phase 22
 * ═══════════════════════════════════════════════════════════════════════════════
 * Handles multi-channel event notifications.
 * Channels: IN_APP, EMAIL, SMS, PUSH
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./email.service');

class NotificationService {
  /**
   * Dispatch a notification to multiple channels.
   * @param {Object} payload
   * @param {string} payload.userId - Recipient user ID
   * @param {string} payload.type - Event type (e.g., ASSIGNMENT_CREATED)
   * @param {string} payload.title - Notification title
   * @param {string} payload.message - Notification message
   * @param {string} [payload.actionLink] - Optional URL or deep link
   * @param {Array<string>} [payload.channels] - e.g. ['IN_APP', 'EMAIL']
   * @param {Object} context
   * @param {string} context.instituteId
   * @param {string} [context.branchId]
   */
  async sendNotification(payload, context) {
    const { userId, type, title, message, actionLink, channels = ['IN_APP'] } = payload;
    const { instituteId, branchId } = context;

    // 1. Validate user exists
    const user = await User.findById(userId);
    if (!user) throw new Error('Recipient user not found');

    const results = {
      inApp: null,
      email: null,
      sms: null,
      push: null,
    };

    // 2. Process channels (IN_APP is synchronous for db consistency, others can be async/mocked)
    if (channels.includes('IN_APP')) {
      const notif = new Notification({
        userId,
        type: type || 'GENERAL',
        title,
        message,
        actionLink,
        channels,
        instituteId: instituteId || user.instituteId,
        branchId: branchId || user.branchId,
      });
      await notif.save();
      results.inApp = notif;
    }

    if (channels.includes('EMAIL')) {
      const htmlBody = `
        <p>Hello ${user.firstName},</p>
        <p>${message}</p>
        ${actionLink ? `<a href="${actionLink}" class="btn">View Details</a>` : ''}
      `;
      results.email = await emailService.sendEmail(user.email, title, htmlBody);
    }

    if (channels.includes('SMS')) {
      results.sms = await this._sendSMSMock(user.phone, message);
    }

    if (channels.includes('PUSH')) {
      results.push = await this._sendPushMock(userId, title, message);
    }

    return results;
  }

  /**
   * Get In-App Notifications for a user
   */
  async getMyNotifications(userId, query = {}) {
    const { isRead, limit = 20, page = 1 } = query;
    const filter = { userId, isDeleted: false };
    
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true' || isRead === true;
    }

    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    return {
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId, isDeleted: false },
      { isRead: true },
      { new: true, returnDocument: 'after' }
    );
    if (!notification) throw new Error('Notification not found or access denied');
    return notification;
  }

  // ─── Adapters (Mocks for SMS/PUSH) ──────────────────────────────────────────

  async _sendSMSMock(phone, message) {
    if (!phone) return { status: 'failed', reason: 'No phone number' };
    console.log(`[SMS] To: ${phone} | Msg: ${message}`);
    return new Promise(resolve => setTimeout(() => resolve({ status: 'sent', phone }), 50));
  }

  async _sendPushMock(userId, title, message) {
    // Requires a device token lookup in a real scenario
    console.log(`[PUSH] To User: ${userId} | Title: ${title}`);
    return new Promise(resolve => setTimeout(() => resolve({ status: 'sent', userId }), 50));
  }
}

module.exports = new NotificationService();
