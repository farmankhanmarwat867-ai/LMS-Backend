const academicSessionService = require('../services/academicSession.service');
const { success, created } = require('../utils/apiResponse');

/**
 * ACADEMIC SESSION CONTROLLER
 * Thin layer — delegates to service, formats response
 */

// POST /api/sessions
const createSession = async (req, res, next) => {
  try {
    const session = await academicSessionService.createSession(req.body, req.user);
    return created(res, session, 'Academic session created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions
const getAllSessions = async (req, res, next) => {
  try {
    const result = await academicSessionService.getAllSessions(req.query, req.tenantFilter);
    return success(res, result.data, 'Academic sessions fetched successfully', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/active
const getActiveSession = async (req, res, next) => {
  try {
    const session = await academicSessionService.getActiveSession(req.tenantFilter);
    return success(res, session, 'Active academic session fetched successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:id
const getSessionById = async (req, res, next) => {
  try {
    const session = await academicSessionService.getSessionById(req.params.id, req.tenantFilter);
    return success(res, session, 'Academic session fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/sessions/:id
const updateSession = async (req, res, next) => {
  try {
    const session = await academicSessionService.updateSession(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, session, 'Academic session updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/sessions/:id/status
const changeSessionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const session = await academicSessionService.changeSessionStatus(
      req.params.id,
      status,
      req.user,
      req.tenantFilter
    );
    return success(res, session, `Academic session status changed to '${status}' successfully`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sessions/:id
const deleteSession = async (req, res, next) => {
  try {
    await academicSessionService.deleteSession(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Academic session deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getActiveSession,
  getSessionById,
  updateSession,
  changeSessionStatus,
  deleteSession,
};
