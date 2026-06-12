const express = require('express');
const router = express.Router();

const { createInstitute, getAllInstitutes, getInstituteById, updateInstitute, deleteInstitute } = require('../controllers/institute.controller');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createInstituteValidator, updateInstituteValidator } = require('../validators/institute.validator');

router.use(protect);

router.route('/')
  .post(hasPermission('institutes:create'), createInstituteValidator, validate, createInstitute)
  .get(hasPermission('institutes:read'), getAllInstitutes);

router.route('/:id')
  .get(hasPermission('institutes:read'), getInstituteById)
  .put(hasPermission('institutes:update'), updateInstituteValidator, validate, updateInstitute)
  .delete(hasPermission('institutes:suspend'), deleteInstitute);

module.exports = router;
