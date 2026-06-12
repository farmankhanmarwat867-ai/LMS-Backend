const express = require('express');
const router = express.Router();

const { createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch } = require('../controllers/branch.controller');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createBranchValidator, updateBranchValidator } = require('../validators/branch.validator');

// All branch routes require authentication and tenant context
router.use(protect);
router.use(tenantGuard);

router.route('/')
  .post(hasPermission('branches:create'), createBranchValidator, validate, createBranch)
  .get(hasPermission('branches:read'), getAllBranches);

router.route('/:id')
  .get(hasPermission('branches:read'), getBranchById)
  .put(hasPermission('branches:update'), updateBranchValidator, validate, updateBranch)
  .delete(hasPermission('branches:delete'), deleteBranch);

module.exports = router;
