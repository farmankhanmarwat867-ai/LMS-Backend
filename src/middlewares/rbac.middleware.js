const { forbidden } = require('../utils/apiResponse');
const { PERMISSIONS } = require('../constants/permissions');

/**
 * RBAC Middleware — checks if user's role is in the allowed roles list
 * Usage: authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return forbidden(res, 'Not authenticated.');
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role '${req.user.role}' is not authorized to access this route.`);
    }
    next();
  };
};

/**
 * Permission Middleware — checks granular permissions map
 * Usage: hasPermission('courses:create')
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return forbidden(res, 'Not authenticated.');

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return forbidden(res, `Unknown permission: ${permission}`);

    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(res, `You do not have permission to perform this action.`);
    }
    next();
  };
};

module.exports = { authorize, hasPermission };
