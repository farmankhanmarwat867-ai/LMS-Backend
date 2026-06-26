const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const {
  markAttendanceValidator,
  updateAttendanceValidator,
  getAttendanceValidator,
  studentAttendanceValidator,
  idParamValidator,
} = require('../validators/attendance.validator');
const { protect }       = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard }   = require('../middlewares/tenant.middleware');

const router = express.Router();

// Apply auth + tenant guard to all attendance routes
router.use(protect);
router.use(tenantGuard);

const attendanceSessionController = require('../controllers/attendanceSession.controller');
const {
  createSessionValidator,
  idParamValidator: sessionIdParamValidator,
  scanQrValidator,
} = require('../validators/attendanceSession.validator');


// ── POST /api/attendance/session ──────────────────────────────────────────────
// Create a new QR attendance session (TEACHER)
router.post(
  '/session',
  hasPermission('attendance:qr-generate'),
  createSessionValidator,
  attendanceSessionController.createSession
);

// ── GET /api/attendance/session/:id ───────────────────────────────────────────
// Get details of a specific QR session
router.get(
  '/session/:id',
  hasPermission('attendance:read'),
  sessionIdParamValidator,
  attendanceSessionController.getSession
);

// ── PATCH /api/attendance/session/:id/close ───────────────────────────────────
// Close session and generate final Attendance record
router.patch(
  '/session/:id/close',
  hasPermission('attendance:qr-generate'),
  sessionIdParamValidator,
  attendanceSessionController.closeSession
);

// ── POST /api/attendance/scan ─────────────────────────────────────────────────
// Scan QR code to mark attendance (STUDENT)
router.post(
  '/scan',
  hasPermission('attendance:qr-scan'),
  scanQrValidator,
  attendanceSessionController.scanQr
);

// ── POST /api/attendance ──────────────────────────────────────────────────────
// Mark attendance for a course session (TEACHER / BRANCH_ADMIN)
router.post(
  '/',
  hasPermission('attendance:create'),
  markAttendanceValidator,
  attendanceController.markAttendance
);

// ── GET /api/attendance/student/:studentId ────────────────────────────────────
// MUST be before /:id to avoid Express matching "student" as an ObjectId
router.get(
  '/student/:studentId',
  hasPermission('attendance:read'),
  studentAttendanceValidator,
  attendanceController.getStudentAttendance
);

// ── GET /api/attendance ───────────────────────────────────────────────────────
// List attendance records (with filters & pagination)
router.get(
  '/',
  hasPermission('attendance:read'),
  getAttendanceValidator,
  attendanceController.getAttendance
);

// ── GET /api/attendance/:id ───────────────────────────────────────────────────
// Get a single attendance record fully populated
router.get(
  '/:id',
  hasPermission('attendance:read'),
  idParamValidator,
  attendanceController.getAttendanceById
);

// ── PUT /api/attendance/:id ───────────────────────────────────────────────────
// Update attendees list / topic for an existing session
router.put(
  '/:id',
  hasPermission('attendance:update'),
  updateAttendanceValidator,
  attendanceController.updateAttendance
);

module.exports = router;
