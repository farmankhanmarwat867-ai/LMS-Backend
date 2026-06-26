const express = require('express');
const examScheduleController = require('../controllers/examSchedule.controller');
const {
  createExamScheduleValidator,
  updateExamScheduleValidator,
  updateExamScheduleStatusValidator,
  getExamSchedulesValidator,
  idParamValidator,
} = require('../validators/examSchedule.validator');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');

const router = express.Router();

// ── Global guards for every route ──────────────────────────────────────────
router.use(protect);
router.use(tenantGuard);

// ══════════════════════════════════════════════════════════════════════════
// POST   /api/exam-schedules
// Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
// ══════════════════════════════════════════════════════════════════════════
router.post(
  '/',
  hasPermission('exam-schedules:create'),
  createExamScheduleValidator,
  examScheduleController.createSchedule
);

// ══════════════════════════════════════════════════════════════════════════
// GET    /api/exam-schedules
// Filters: ?examId=&subjectId=&courseId=&classId=&sectionId=&teacherId=&status=
// Roles: ALL
// ══════════════════════════════════════════════════════════════════════════
router.get(
  '/',
  hasPermission('exam-schedules:read'),
  getExamSchedulesValidator,
  examScheduleController.getSchedules
);

// ══════════════════════════════════════════════════════════════════════════
// GET    /api/exam-schedules/:id
// Roles: ALL
// ══════════════════════════════════════════════════════════════════════════
router.get(
  '/:id',
  hasPermission('exam-schedules:read'),
  idParamValidator,
  examScheduleController.getScheduleById
);

// ══════════════════════════════════════════════════════════════════════════
// PUT    /api/exam-schedules/:id
// Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
// ══════════════════════════════════════════════════════════════════════════
router.put(
  '/:id',
  hasPermission('exam-schedules:update'),
  updateExamScheduleValidator,
  examScheduleController.updateSchedule
);

// ══════════════════════════════════════════════════════════════════════════
// PATCH  /api/exam-schedules/:id/status
// Body:  { "status": "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED" }
// Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
// ══════════════════════════════════════════════════════════════════════════
router.patch(
  '/:id/status',
  hasPermission('exam-schedules:update'),
  updateExamScheduleStatusValidator,
  examScheduleController.updateScheduleStatus
);

// ══════════════════════════════════════════════════════════════════════════
// DELETE /api/exam-schedules/:id
// Soft delete only — sets isDeleted: true
// Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
// ══════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id',
  hasPermission('exam-schedules:delete'),
  idParamValidator,
  examScheduleController.deleteSchedule
);

module.exports = router;
