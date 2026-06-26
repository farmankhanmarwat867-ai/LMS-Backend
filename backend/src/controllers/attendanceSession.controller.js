const attendanceSessionService = require('../services/attendanceSession.service');
const { success, created } = require('../utils/apiResponse');

const createSession = async (req, res, next) => {
  try {
    const session = await attendanceSessionService.createSession(
      req.body,
      req.user,
      req.tenantFilter
    );
    return created(res, session, 'QR Attendance session created successfully');
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const session = await attendanceSessionService.getSession(
      req.params.id,
      req.user,
      req.tenantFilter
    );
    return success(res, session, 'Attendance session retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const closeSession = async (req, res, next) => {
  try {
    const session = await attendanceSessionService.closeSession(
      req.params.id,
      req.user,
      req.tenantFilter
    );
    return success(res, session, 'Attendance session closed and records generated successfully');
  } catch (err) {
    next(err);
  }
};

const scanQr = async (req, res, next) => {
  try {
    const session = await attendanceSessionService.scanQr(
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, session, 'Attendance marked successfully via QR scan');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  getSession,
  closeSession,
  scanQr,
};
