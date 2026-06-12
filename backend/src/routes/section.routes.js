const express = require('express');
const router = express.Router();

const {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
} = require('../controllers/section.controller');

const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createSectionValidator,
  updateSectionValidator,
  sectionIdValidator,
} = require('../validators/section.validator');

// All section routes require authentication and tenant context
router.use(protect);
router.use(tenantGuard);

router
  .route('/')
  .get(hasPermission('sections:read'), getAllSections)
  .post(hasPermission('sections:create'), createSectionValidator, validate, createSection);

router
  .route('/:id')
  .get(hasPermission('sections:read'), sectionIdValidator, validate, getSectionById)
  .put(hasPermission('sections:update'), sectionIdValidator, validate, updateSectionValidator, validate, updateSection)
  .delete(hasPermission('sections:delete'), sectionIdValidator, validate, deleteSection);

module.exports = router;
