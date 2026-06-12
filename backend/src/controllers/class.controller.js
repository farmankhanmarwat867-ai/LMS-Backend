const classService = require('../services/class.service');
const { success, created } = require('../utils/apiResponse');

/**
 * CLASS CONTROLLER
 * Thin layer — delegates to service, formats response
 */

// POST /api/classes
const createClass = async (req, res, next) => {
  try {
    const newClass = await classService.createClass(req.body, req.user, req.tenantFilter);
    return created(res, newClass, 'Class created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/classes
const getAllClasses = async (req, res, next) => {
  try {
    const result = await classService.getAllClasses(req.query, req.tenantFilter);
    return success(res, result.data, 'Classes fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// GET /api/classes/:id
const getClassById = async (req, res, next) => {
  try {
    const classObj = await classService.getClassById(req.params.id, req.tenantFilter);
    return success(res, classObj, 'Class fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/classes/:id
const updateClass = async (req, res, next) => {
  try {
    const classObj = await classService.updateClass(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, classObj, 'Class updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    await classService.deleteClass(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Class deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
