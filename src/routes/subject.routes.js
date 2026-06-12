const express = require('express');
const router = express.Router();

const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../controllers/subject.controller');

const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createSubjectValidator,
  updateSubjectValidator,
  subjectIdValidator,
} = require('../validators/subject.validator');

// All subject routes require authentication and tenant context
router.use(protect);
router.use(tenantGuard);

router
  .route('/')
  .get(hasPermission('subjects:read'), getAllSubjects)
  .post(hasPermission('subjects:create'), createSubjectValidator, validate, createSubject);

router
  .route('/:id')
  .get(hasPermission('subjects:read'), subjectIdValidator, validate, getSubjectById)
  .put(hasPermission('subjects:update'), subjectIdValidator, validate, updateSubjectValidator, validate, updateSubject)
  .delete(hasPermission('subjects:delete'), subjectIdValidator, validate, deleteSubject);

module.exports = router;
