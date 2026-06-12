const sectionService = require('../services/section.service');
const { success, created } = require('../utils/apiResponse');

/**
 * SECTION CONTROLLER
 * Thin layer — delegates to service, formats response
 */

// POST /api/sections
const createSection = async (req, res, next) => {
  try {
    const newSection = await sectionService.createSection(req.body, req.user, req.tenantFilter);
    return created(res, newSection, 'Section created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/sections
const getAllSections = async (req, res, next) => {
  try {
    const result = await sectionService.getAllSections(req.query, req.tenantFilter);
    return success(res, result.data, 'Sections fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// GET /api/sections/:id
const getSectionById = async (req, res, next) => {
  try {
    const sectionObj = await sectionService.getSectionById(req.params.id, req.tenantFilter);
    return success(res, sectionObj, 'Section fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/sections/:id
const updateSection = async (req, res, next) => {
  try {
    const sectionObj = await sectionService.updateSection(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, sectionObj, 'Section updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sections/:id
const deleteSection = async (req, res, next) => {
  try {
    await sectionService.deleteSection(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Section deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
};
