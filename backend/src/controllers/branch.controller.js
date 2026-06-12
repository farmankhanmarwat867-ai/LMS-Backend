const branchService = require('../services/branch.service');
const { success, created } = require('../utils/apiResponse');

/**
 * BRANCH CONTROLLER
 */

const createBranch = async (req, res, next) => {
  try {
    const result = await branchService.createBranch(req.body, req.user);
    return created(res, result, 'Branch and Admin User created successfully');
  } catch (err) {
    next(err);
  }
};

const getAllBranches = async (req, res, next) => {
  try {
    const result = await branchService.getAllBranches(req.query, req.tenantFilter);
    return success(res, result.data, 'Branches fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getBranchById = async (req, res, next) => {
  try {
    const branch = await branchService.getBranchById(req.params.id, req.tenantFilter);
    return success(res, branch, 'Branch fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, branch, 'Branch updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteBranch = async (req, res, next) => {
  try {
    await branchService.deleteBranch(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Branch suspended successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch };
