const express = require('express');
const router = express.Router();
const dailyAttendanceController = require('../controllers/dailyAttendance.controller');
const { scanValidator } = require('../validators/dailyAttendance.validator');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Scan QR Code (Gate Attendance)
router.post(
  '/scan',
  authorize(ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER),
  scanValidator,
  dailyAttendanceController.scanGateAttendance
);

// Get Daily Reports
router.get(
  '/reports',
  authorize(ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER, ROLES.PARENT, ROLES.STUDENT),
  dailyAttendanceController.getDailyReports
);

module.exports = router;
