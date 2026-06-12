const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');

class CommunicationService {
  // ─── Messages ──────────────────────────────────────────────────────────

  /**
   * Send a direct message
   */
  async sendMessage({ senderId, receiverId, subject, body, relatedStudentId, instituteId, branchId }) {
    return await Message.create({
      senderId,
      receiverId,
      subject,
      body,
      relatedStudentId,
      instituteId,
      branchId,
    });
  }

  /**
   * Get messages for a user (Inbox & Sent)
   */
  async getMessages(userId, type = 'inbox') {
    const query = { isDeleted: false };
    if (type === 'inbox') {
      query.receiverId = userId;
    } else if (type === 'sent') {
      query.senderId = userId;
    } else {
      query.$or = [{ receiverId: userId }, { senderId: userId }];
    }

    return await Message.find(query)
      .populate('senderId', 'name email role avatar')
      .populate('receiverId', 'name email role avatar')
      .populate('relatedStudentId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Mark message as read
   */
  async markMessageRead(messageId, userId) {
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, receiverId: userId },
      { isRead: true },
      { new: true }
    );
    if (!msg) throw new Error('Message not found or unauthorized');
    return msg;
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  /**
   * Get notifications for a user
   */
  async getNotifications(userId) {
    return await Notification.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId, userId) {
    const notif = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notif) throw new Error('Notification not found or unauthorized');
    return notif;
  }

  /**
   * Create a system notification
   */
  async createNotification(data) {
    return await Notification.create(data);
  }

  // ─── Announcements ──────────────────────────────────────────────────────────

  /**
   * Get applicable announcements for a user's branch/institute
   */
  async getAnnouncements({ instituteId, branchId, role }) {
    // Basic filter: active announcements in the same institute
    const query = {
      instituteId,
      status: 'ACTIVE',
      isDeleted: false,
    };

    // If branchId is provided, show branch-specific and global announcements
    if (branchId) {
      query.$or = [
        { branchId },
        { branchId: null }
      ];
    } else {
      query.branchId = null;
    }

    // Role-based filtering if needed (some announcements might be role-specific)
    // The Announcement model doesn't have a specific `targetRoles` array by default in Phase 11,
    // but we can just return all applicable ones.

    return await Announcement.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }
}

module.exports = new CommunicationService();
