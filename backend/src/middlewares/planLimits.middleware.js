const instituteRepository = require('../repositories/institute.repository');
const planRepository      = require('../repositories/plan.repository');
const userRepository      = require('../repositories/user.repository');
const branchRepository    = require('../repositories/branch.repository');
const { ROLES }           = require('../constants/roles');
const { forbidden }       = require('../utils/apiResponse');

/**
 * PLAN LIMITS MIDDLEWARE — Phase 8
 *
 * Factory function: checkPlanLimits(resourceType)
 *   resourceType: 'student' | 'teacher' | 'branch'
 *
 * Usage in routes:
 *   router.post('/', protect, tenantGuard, checkPlanLimits('student'), createUser);
 *
 * SUPER_ADMIN bypasses all limit checks.
 */
const checkPlanLimits = (resourceType) => async (req, res, next) => {
  try {
    // SUPER_ADMIN bypasses all limits
    if (req.user.role === ROLES.SUPER_ADMIN) return next();

    const instituteId = req.user.instituteId;
    if (!instituteId) return next(); // no institute yet — skip

    // Fetch institute & its plan
    const institute = await instituteRepository.findById(instituteId);
    if (!institute) return forbidden(res, 'Institute not found. Contact support.');

    if (!institute.planId) return next(); // no plan attached — no enforcement

    const plan = await planRepository.findById(institute.planId);
    if (!plan) return next(); // plan not found — skip enforcement

    // ── Check resource-specific limit ──────────────────────────────────
    if (resourceType === 'student') {
      const count = await userRepository.countByInstituteAndRole(instituteId, ROLES.STUDENT);
      if (count >= plan.studentLimit) {
        return res.status(403).json({
          success: false,
          message: `Plan limit exceeded. Your plan allows up to ${plan.studentLimit} students. Current: ${count}.`,
          limit:   plan.studentLimit,
          current: count,
          upgrade: true,
        });
      }
    }

    if (resourceType === 'teacher') {
      const count = await userRepository.countByInstituteAndRole(instituteId, ROLES.TEACHER);
      if (count >= plan.teacherLimit) {
        return res.status(403).json({
          success: false,
          message: `Plan limit exceeded. Your plan allows up to ${plan.teacherLimit} teachers. Current: ${count}.`,
          limit:   plan.teacherLimit,
          current: count,
          upgrade: true,
        });
      }
    }

    if (resourceType === 'branch') {
      const count = await branchRepository.countByInstituteId(instituteId);
      if (count >= plan.branchLimit) {
        return res.status(403).json({
          success: false,
          message: `Plan limit exceeded. Your plan allows up to ${plan.branchLimit} branches. Current: ${count}.`,
          limit:   plan.branchLimit,
          current: count,
          upgrade: true,
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * storageLimit check — used before file uploads
 * Returns remaining storage in MB
 */
const checkStorageLimit = async (req, res, next) => {
  try {
    if (req.user.role === ROLES.SUPER_ADMIN) return next();

    const instituteId = req.user.instituteId;
    if (!instituteId) return next();

    const institute = await instituteRepository.findById(instituteId);
    if (!institute || !institute.planId) return next();

    const plan = await planRepository.findById(institute.planId);
    if (!plan) return next();

    // storageUsed is tracked in MB on the institute document
    const used = institute.storageUsedMB || 0;
    if (used >= plan.storageLimit) {
      return res.status(403).json({
        success: false,
        message: `Storage limit exceeded. Your plan allows ${plan.storageLimit} MB. Used: ${used} MB.`,
        limit:   plan.storageLimit,
        used,
        upgrade: true,
      });
    }

    // Attach remaining storage to request for downstream use
    req.storageRemainingMB = plan.storageLimit - used;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkPlanLimits, checkStorageLimit };
