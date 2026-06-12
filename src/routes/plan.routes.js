const express = require('express');
const router = express.Router();

const { createPlan, getAllPlans, getPlanById, updatePlan, deletePlan } = require('../controllers/plan.controller');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { planValidator } = require('../validators/plan.validator');

// All plan routes require authentication
router.use(protect);

router.route('/')
  .post(hasPermission('plans:create'), planValidator, validate, createPlan)
  .get(hasPermission('plans:read'), getAllPlans);

router.route('/:id')
  .get(hasPermission('plans:read'), getPlanById)
  .put(hasPermission('plans:update'), planValidator, validate, updatePlan)
  .delete(hasPermission('plans:delete'), deletePlan);

module.exports = router;
