const express = require('express');
const submissionController = require('../controllers/submission.controller');
const {
  submitAssignmentValidator,
  gradeSubmissionValidator,
  getSubmissionsValidator,
  assignmentIdParamValidator,
  studentIdParamValidator,
} = require('../validators/submission.validator');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Submit or Update an Assignment (Student)
router.post(
  '/assignment/:assignmentId',
  hasPermission('submissions:create'),
  submitAssignmentValidator,
  submissionController.submitAssignment
);

// Get My Submissions (Student)
router.get(
  '/my',
  hasPermission('submissions:read'),
  getSubmissionsValidator,
  submissionController.getMySubmissions
);

// Get Submissions for an Assignment (Teacher/Admin)
router.get(
  '/assignment/:assignmentId',
  hasPermission('submissions:read'),
  assignmentIdParamValidator,
  getSubmissionsValidator,
  submissionController.getSubmissionsByAssignment
);

// Get Submissions by Student ID (Teacher/Admin)
router.get(
  '/student/:studentId',
  hasPermission('submissions:read'),
  studentIdParamValidator,
  getSubmissionsValidator,
  submissionController.getStudentSubmissions
);

// Grade a Submission (Teacher)
router.patch(
  '/:id/grade',
  hasPermission('submissions:grade'),
  gradeSubmissionValidator,
  submissionController.gradeSubmission
);

module.exports = router;
