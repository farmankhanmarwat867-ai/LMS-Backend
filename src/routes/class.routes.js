const express = require('express');
const router = express.Router();

const {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} = require('../controllers/class.controller');

const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createClassValidator,
  updateClassValidator,
  classIdValidator,
} = require('../validators/class.validator');

// All class routes require authentication and tenant context
router.use(protect);
router.use(tenantGuard);

router
  .route('/')
  .get(hasPermission('classes:read'), getAllClasses)
  .post(hasPermission('classes:create'), createClassValidator, validate, createClass);

router
  .route('/:id')
  .get(hasPermission('classes:read'), classIdValidator, validate, getClassById)
  .put(hasPermission('classes:update'), classIdValidator, validate, updateClassValidator, validate, updateClass)
  .delete(hasPermission('classes:delete'), classIdValidator, validate, deleteClass);

module.exports = router;
