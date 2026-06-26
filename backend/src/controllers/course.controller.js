const courseService = require('../services/course.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/courses ────────────────────────────────────────────────────────
const createCourse = async (req, res, next) => {
  try {
    if (req.user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Access denied: Teachers cannot create subjects.' });
    }
    const course = await courseService.createCourse(req.body, req.user);
    return created(res, course, 'Subject created successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/courses ─────────────────────────────────────────────────────────
const getAllCourses = async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.user.role === 'TEACHER') {
      query.teacherId = req.user._id.toString();
    }
    const { data, pagination } = await courseService.getAllCourses(query, req.tenantFilter);
    return success(res, data, 'Subjects retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/courses/:id ─────────────────────────────────────────────────────
const getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id, req.tenantFilter);
    const teacherIdStr = course.teacherId?._id
      ? course.teacherId._id.toString()
      : course.teacherId?.toString();

    if (req.user.role === 'TEACHER' && teacherIdStr !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this subject.' });
    }
    return success(res, course, 'Subject retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/courses/:id ─────────────────────────────────────────────────────
const updateCourse = async (req, res, next) => {
  try {
    if (req.user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Access denied: Teachers cannot update subjects.' });
    }
    const course = await courseService.updateCourse(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, course, 'Subject updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/courses/:id/status ────────────────────────────────────────────
const changeCourseStatus = async (req, res, next) => {
  try {
    if (req.user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Access denied: Teachers cannot update subject status.' });
    }
    const { status } = req.body;
    const course = await courseService.changeCourseStatus(req.params.id, status, req.user, req.tenantFilter);
    return success(res, course, `Subject status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/courses/:id ──────────────────────────────────────────────────
const deleteCourse = async (req, res, next) => {
  try {
    if (req.user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Access denied: Teachers cannot delete subjects.' });
    }
    await courseService.deleteCourse(req.params.id, req.user, req.tenantFilter);
    return success(res, null, 'Subject deleted successfully');
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
