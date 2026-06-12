const AuditLog = require('../models/AuditLog');

/**
 * AuditLogger — singleton utility for writing audit log entries.
 * Usage: await AuditLogger.log({ userId, role, action, resource, resourceId, metadata });
 *
 * All services import this as:
 *   const AuditLogger = require('../utils/auditLogger');
 *   await AuditLogger.log({ ... });
 */
const AuditLogger = {
  /**
   * Write a single audit log entry.
   * Errors are swallowed so a failed audit log never crashes a real request.
   *
   * @param {Object} params
   * @param {ObjectId} params.userId
   * @param {string}   params.role
   * @param {string}   params.action  — must match AuditLog enum
   * @param {string}   params.resource
   * @param {ObjectId} params.resourceId
   * @param {string}   [params.ipAddress]
   * @param {Object}   [params.metadata]
   */
  log: async ({ userId, role, action, resource, resourceId, ipAddress = '', metadata = {} }) => {
    try {
      await AuditLog.create({
        userId,
        role,
        action,
        resource,
        resourceId,
        ipAddress,
        metadata,
      });
    } catch (err) {
      // Never crash the main request because of a logging failure
      console.error('[AuditLog Error]', err.message);
    }
  },
};

module.exports = AuditLogger;
