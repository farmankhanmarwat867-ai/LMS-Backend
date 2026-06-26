const dailyAttendanceService = require('../services/dailyAttendance.service');

const scanGateAttendance = async (req, res, next) => {
  try {
    const tenantFilter = {
      instituteId: req.user.instituteId,
      branchId: req.user.role === 'BRANCH_ADMIN' || req.user.role === 'TEACHER' ? req.user.branchId : undefined
    };
    
    // Clean up undefined
    Object.keys(tenantFilter).forEach(key => tenantFilter[key] === undefined && delete tenantFilter[key]);

    const result = await dailyAttendanceService.scanGateAttendance(req.body, req.user, tenantFilter);
    res.status(200).json({ success: true, message: 'Attendance Marked Successfully', data: result });
  } catch (err) {
    next(err);
  }
};

const getDailyReports = async (req, res, next) => {
  try {
    const tenantFilter = {
      instituteId: req.user.instituteId,
      branchId: req.user.role === 'BRANCH_ADMIN' || req.user.role === 'TEACHER' ? req.user.branchId : undefined
    };

    Object.keys(tenantFilter).forEach(key => tenantFilter[key] === undefined && delete tenantFilter[key]);

    const reports = await dailyAttendanceService.getDailyReports(req.query, tenantFilter);
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  scanGateAttendance,
  getDailyReports
};
