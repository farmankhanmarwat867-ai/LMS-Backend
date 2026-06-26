const AuditLog = require('../models/AuditLog');

/**
 * AuditLogger — singleton utility for writing audit log entries.
 * Usage: await AuditLogger.log({ userId, role, action, resource, resourceId, metadata });
 *   or const { auditLog } = require('../utils/auditLogger');
 *      await auditLog({ ... });
 */
const log = async ({ userId, role, action, resource, resourceId, ipAddress = '', metadata = {} }) => {
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
};

const AuditLogger = {
  log,
  auditLog: log,
};

module.exports = AuditLogger;

