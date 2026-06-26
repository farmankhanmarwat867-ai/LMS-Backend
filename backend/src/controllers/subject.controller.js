const subjectService = require('../services/subject.service');
const { success, created } = require('../utils/apiResponse');

/**
 * SUBJECT CONTROLLER
 * Thin layer — delegates to service, formats response
 */

// POST /api/subjects
const createSubject = async (req, res, next) => {
  try {
    const newSubject = await subjectService.createSubject(req.body, req.user, req.tenantFilter);
    return created(res, newSubject, 'Subject created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/subjects
const getAllSubjects = async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.user.role === 'TEACHER') {
      query.teacherId = req.user._id.toString();
    }
    const result = await subjectService.getAllSubjects(query, req.tenantFilter);
    return success(res, result.data, 'Subjects fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// GET /api/subjects/:id
const getSubjectById = async (req, res, next) => {
  try {
    const subjectObj = await subjectService.getSubjectById(req.params.id, req.tenantFilter);
    return success(res, subjectObj, 'Subject fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/subjects/:id
const updateSubject = async (req, res, next) => {
  try {
    const subjectObj = await subjectService.updateSubject(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, subjectObj, 'Subject updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/subjects/:id
const deleteSubject = async (req, res, next) => {
  try {
    await subjectService.deleteSubject(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Subject deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
