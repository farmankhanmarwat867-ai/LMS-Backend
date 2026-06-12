const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcript.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(protect);

// ── GET /api/transcripts/:studentId ───────────────────────────────────────────
// Students/Parents viewing their own, or Staff viewing any
// Note: In a robust RBAC, we'd add an ownership check middleware here.
// For now, checking general roles.
router.get(
  '/:studentId',
  authorize('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'),
  transcriptController.getStudentTranscript
);

module.exports = router;
