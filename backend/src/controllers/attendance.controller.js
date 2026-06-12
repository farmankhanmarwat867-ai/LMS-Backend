const attendanceService = require('../services/attendance.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/attendance ──────────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const record = await attendanceService.markAttendance(
      req.body,
      req.user,
      req.tenantFilter
    );
    return created(res, record, 'Attendance marked successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/attendance ───────────────────────────────────────────────────────
const getAttendance = async (req, res, next) => {
  try {
    const { data, pagination } = await attendanceService.getAttendance(
      req.query,
      req.user,
      req.tenantFilter
    );
    return success(res, data, 'Attendance records retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/attendance/student/:studentId ────────────────────────────────────
const getStudentAttendance = async (req, res, next) => {
  try {
    const { data, pagination, summary } = await attendanceService.getStudentAttendance(
      req.params.studentId,
      req.query,
      req.user,
      req.tenantFilter
    );
    return success(
      res,
      { records: data, summary },
      'Student attendance retrieved successfully',
      200,
      pagination
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/attendance/:id ───────────────────────────────────────────────────
const getAttendanceById = async (req, res, next) => {
  try {
    const record = await attendanceService.getAttendanceById(
      req.params.id,
      req.user,
      req.tenantFilter
    );
    return success(res, record, 'Attendance record retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/attendance/:id ───────────────────────────────────────────────────
const updateAttendance = async (req, res, next) => {
  try {
    const record = await attendanceService.updateAttendance(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, record, 'Attendance updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  getAttendanceById,
  updateAttendance,
};
