const userService  = require('../services/user.service');
const { success, created, error, notFound } = require('../utils/apiResponse');

/**
 * USER CONTROLLER — Phase 8
 * Thin controller: delegates all business logic to userService
 */

// ── POST /api/users ────────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    return created(res, user, 'User created successfully');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/bulk-import ────────────────────────────────────────────────
const bulkImportStudents = async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'students array is required and must not be empty' });
    }
    if (students.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 students per import batch' });
    }
    const results = await userService.bulkImportStudents(students, req.user);
    return success(res, results, `Bulk import complete: ${results.created.length} created, ${results.failed.length} failed`);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users ─────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { data, pagination } = await userService.getAllUsers(req.query, req.tenantFilter);
    return success(res, data, 'Users retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ─────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.tenantFilter, req.user._id);
    return success(res, user, 'User retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ─────────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/status ────────────────────────────────────────────────
const changeUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.changeUserStatus(
      req.params.id,
      isActive,
      req.user,
      req.tenantFilter
    );
    return success(res, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id ──────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/parents/:parentId/children ─────────────────────────────────
const getChildrenOfParent = async (req, res, next) => {
  try {
    const children = await userService.getChildrenOfParent(req.params.parentId, req.tenantFilter);
    return success(res, children, 'Children retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/parents/:parentId/link/:studentId ─────────────────────────
const linkStudentToParent = async (req, res, next) => {
  try {
    const { parentId, studentId } = req.params;
    const result = await userService.linkStudentToParent(parentId, studentId, req.user, req.tenantFilter);
    return success(res, result, 'Student linked to parent successfully');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/parents/:parentId/unlink/:studentId ─────────────────────
const unlinkStudentFromParent = async (req, res, next) => {
  try {
    const { parentId, studentId } = req.params;
    const result = await userService.unlinkStudentFromParent(parentId, studentId, req.user, req.tenantFilter);
    return success(res, result, 'Student unlinked from parent successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  bulkImportStudents,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  deleteUser,
  getChildrenOfParent,
  linkStudentToParent,
  unlinkStudentFromParent,
};
