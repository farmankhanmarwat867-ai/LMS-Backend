const planRepository = require('../repositories/plan.repository');
const { auditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

/**
 * PLAN SERVICE — Business logic for subscription plans
 */

// ── Create Plan ───────────────────────────────────────────────────────
const createPlan = async (data, user) => {
  const existing = await planRepository.findByName(data.name);
  if (existing) throw { status: 409, message: 'Plan name already exists' };

  const plan = await planRepository.create({ ...data, createdBy: user._id });

  await auditLog({
    userId: user._id, role: user.role,
    action: 'CREATE', resource: 'Plan', resourceId: plan._id,
  });

  return plan;
};

// ── Get All Plans ─────────────────────────────────────────────────────
const getAllPlans = async (queryOptions) => {
  const query = {}; // Excludes deleted via model hook
  if (queryOptions.status) query.status = queryOptions.status;

  return paginate(planRepository.model, query, queryOptions);
};

// ── Get Plan by ID ────────────────────────────────────────────────────
const getPlanById = async (id) => {
  const plan = await planRepository.findById(id);
  if (!plan) throw { status: 404, message: 'Plan not found' };
  return plan;
};

// ── Update Plan ───────────────────────────────────────────────────────
const updatePlan = async (id, data, user) => {
  const plan = await planRepository.findById(id);
  if (!plan) throw { status: 404, message: 'Plan not found' };

  if (data.name && data.name !== plan.name) {
    const existing = await planRepository.findByName(data.name);
    if (existing) throw { status: 409, message: 'Plan name already exists' };
  }

  const updatedPlan = await planRepository.updateById(id, { ...data, updatedBy: user._id });

  await auditLog({
    userId: user._id, role: user.role,
    action: 'UPDATE', resource: 'Plan', resourceId: id,
    metadata: { changed: Object.keys(data) }
  });

  return updatedPlan;
};

// ── Delete Plan (Soft) ────────────────────────────────────────────────
const deletePlan = async (id, user) => {
  const plan = await planRepository.findById(id);
  if (!plan) throw { status: 404, message: 'Plan not found' };

  await planRepository.softDelete(id, user._id);

  await auditLog({
    userId: user._id, role: user.role,
    action: 'SOFT_DELETE', resource: 'Plan', resourceId: id,
  });
};

module.exports = { createPlan, getAllPlans, getPlanById, updatePlan, deletePlan };
