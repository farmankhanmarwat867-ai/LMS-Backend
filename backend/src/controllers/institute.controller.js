const instituteService = require('../services/institute.service');
const { success, created } = require('../utils/apiResponse');

/**
 * INSTITUTE CONTROLLER
 */

const createInstitute = async (req, res, next) => {
  try {
    const result = await instituteService.createInstitute(req.body, req.user);
    return created(res, result, 'Institute and Admin User created successfully');
  } catch (err) {
    next(err);
  }
};

const getAllInstitutes = async (req, res, next) => {
  try {
    const result = await instituteService.getAllInstitutes(req.query);
    return success(res, result.data, 'Institutes fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getInstituteById = async (req, res, next) => {
  try {
    const institute = await instituteService.getInstituteById(req.params.id, req.user);
    return success(res, institute, 'Institute fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateInstitute = async (req, res, next) => {
  try {
    const institute = await instituteService.updateInstitute(req.params.id, req.body, req.user);
    return success(res, institute, 'Institute updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteInstitute = async (req, res, next) => {
  try {
    await instituteService.deleteInstitute(req.params.id, req.user);
    return success(res, null, 'Institute suspended successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { createInstitute, getAllInstitutes, getInstituteById, updateInstitute, deleteInstitute };
