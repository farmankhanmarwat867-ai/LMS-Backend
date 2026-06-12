const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const {
  createAssignmentValidator,
  updateAssignmentValidator,
  getAssignmentsValidator,
  idParamValidator,
} = require('../validators/assignment.validator');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');

const router = express.Router();

// Apply global middlewares
router.use(protect);
router.use(tenantGuard);

// Create Assignment
router.post(
  '/',
  hasPermission('assignments:create'),
  createAssignmentValidator,
  assignmentController.createAssignment
);

// Get My Assignments (Teacher)
router.get(
  '/my',
  hasPermission('assignments:read'),
  getAssignmentsValidator,
  assignmentController.getMyAssignments
);

// Get All Assignments (With Filters)
router.get(
  '/',
  hasPermission('assignments:read'),
  getAssignmentsValidator,
  assignmentController.getAssignments
);

// Get Assignment Stats
router.get(
  '/:id/stats',
  hasPermission('assignments:read'),
  idParamValidator,
  assignmentController.getAssignmentStats
);

// Get Single Assignment
router.get(
  '/:id',
  hasPermission('assignments:read'),
  idParamValidator,
  assignmentController.getAssignmentById
);

// Update Assignment (Publish/Close/Edit)
router.patch(
  '/:id',
  hasPermission('assignments:update'),
  updateAssignmentValidator,
  assignmentController.updateAssignment
);

// Delete Assignment
router.delete(
  '/:id',
  hasPermission('assignments:delete'),
  idParamValidator,
  assignmentController.deleteAssignment
);

module.exports = router;
