const planService = require('../services/plan.service');
const { success, created } = require('../utils/apiResponse');

/**
 * PLAN CONTROLLER — Thin HTTP layer
 */

// POST /api/plans
const createPlan = async (req, res, next) => {
  try {
    const plan = await planService.createPlan(req.body, req.user);
    return created(res, plan, 'Subscription plan created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/plans
const getAllPlans = async (req, res, next) => {
  try {
    const result = await planService.getAllPlans(req.query);
    return success(res, result.data, 'Plans fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// GET /api/plans/:id
const getPlanById = async (req, res, next) => {
  try {
    const plan = await planService.getPlanById(req.params.id);
    return success(res, plan, 'Plan fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/plans/:id
const updatePlan = async (req, res, next) => {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body, req.user);
    return success(res, plan, 'Plan updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/plans/:id
const deletePlan = async (req, res, next) => {
  try {
    await planService.deletePlan(req.params.id, req.user);
    return success(res, null, 'Plan deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { createPlan, getAllPlans, getPlanById, updatePlan, deletePlan };
