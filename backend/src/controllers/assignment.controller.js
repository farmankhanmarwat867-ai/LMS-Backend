const assignmentService = require('../services/assignment.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/assignments ───────────────────────────────────────────────────
const createAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body, req.user, req.tenantFilter);
    return created(res, assignment, 'Assignment created successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assignments ────────────────────────────────────────────────────
const getAssignments = async (req, res, next) => {
  try {
    const { data, pagination } = await assignmentService.getAssignments(req.query, req.user, req.tenantFilter);
    return success(res, data, 'Assignments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assignments/my ─────────────────────────────────────────────────
const getMyAssignments = async (req, res, next) => {
  try {
    // Treat as getting assignments where teacherId = me
    req.query.teacherId = req.user._id;
    const { data, pagination } = await assignmentService.getAssignments(req.query, req.user, req.tenantFilter);
    return success(res, data, 'My assignments retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assignments/:id ────────────────────────────────────────────────
const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id, req.user, req.tenantFilter);
    return success(res, assignment, 'Assignment retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assignments/:id/stats ──────────────────────────────────────────
const getAssignmentStats = async (req, res, next) => {
  try {
    const stats = await assignmentService.getAssignmentStats(req.params.id, req.user, req.tenantFilter);
    return success(res, stats, 'Assignment statistics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── PUT/PATCH /api/assignments/:id ──────────────────────────────────────────
const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, assignment, 'Assignment updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/assignments/:id ─────────────────────────────────────────────
const deleteAssignment = async (req, res, next) => {
  try {
    await assignmentService.deleteAssignment(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Assignment deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getMyAssignments,
  getAssignmentById,
  getAssignmentStats,
  updateAssignment,
  deleteAssignment,
};
