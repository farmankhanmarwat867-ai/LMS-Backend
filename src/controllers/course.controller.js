const courseService = require('../services/course.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/courses ────────────────────────────────────────────────────────
const createCourse = async (req, res, next) => {
  try {
    const course = await courseService.createCourse(req.body, req.user);
    return created(res, course, 'Course created successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/courses ─────────────────────────────────────────────────────────
const getAllCourses = async (req, res, next) => {
  try {
    const { data, pagination } = await courseService.getAllCourses(req.query, req.tenantFilter);
    return success(res, data, 'Courses retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/courses/:id ─────────────────────────────────────────────────────
const getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id, req.tenantFilter);
    return success(res, course, 'Course retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/courses/:id ─────────────────────────────────────────────────────
const updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, course, 'Course updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/courses/:id/status ────────────────────────────────────────────
const changeCourseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const course = await courseService.changeCourseStatus(req.params.id, status, req.user, req.tenantFilter);
    return success(res, course, `Course status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/courses/:id ──────────────────────────────────────────────────
const deleteCourse = async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Course deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  changeCourseStatus,
  deleteCourse,
};
