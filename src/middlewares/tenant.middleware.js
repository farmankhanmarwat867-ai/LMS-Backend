const { forbidden } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');

/**
 * Tenant Middleware — enforces multi-tenant data isolation
 *
 * Attaches tenantFilter to req for use in controllers/services:
 *   req.tenantFilter = { instituteId, branchId }
 *
 * SUPER_ADMIN gets empty filter (sees everything)
 * INSTITUTE_ADMIN gets instituteId filter
 * BRANCH_ADMIN / TEACHER / STUDENT / PARENT get instituteId + branchId filter
 */
const tenantGuard = (req, res, next) => {
  if (!req.user) return forbidden(res, 'Not authenticated.');

  const { role, instituteId, branchId } = req.user;

  if (role === ROLES.SUPER_ADMIN) {
    req.tenantFilter = {};
    return next();
  }

  if (!instituteId) {
    return forbidden(res, 'Tenant information missing. Contact support.');
  }

  if (role === ROLES.INSTITUTE_ADMIN) {
    req.tenantFilter = { instituteId };
    return next();
  }

  // BRANCH_ADMIN, TEACHER, STUDENT, PARENT
  if (!branchId) {
    return forbidden(res, 'Branch information missing. Contact your institute admin.');
  }

  req.tenantFilter = { instituteId, branchId };
  next();
};

/**
 * Ownership Guard — verifies the resource belongs to the requester's tenant
 * Use in individual controllers for cross-tenant access prevention
 */
const verifyTenantAccess = (resource, req) => {
  if (req.user.role === ROLES.SUPER_ADMIN) return true;

  if (req.user.role === ROLES.INSTITUTE_ADMIN) {
    return resource.instituteId?.toString() === req.user.instituteId?.toString();
  }

  return (
    resource.instituteId?.toString() === req.user.instituteId?.toString() &&
    resource.branchId?.toString() === req.user.branchId?.toString()
  );
};

module.exports = { tenantGuard, verifyTenantAccess };
