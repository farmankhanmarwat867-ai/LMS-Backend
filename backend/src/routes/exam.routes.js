const express = require('express');
const examController = require('../controllers/exam.controller');
const {
  createExamValidator,
  updateExamValidator,
  updateExamStatusValidator,
  getExamsValidator,
  idParamValidator,
} = require('../validators/exam.validator');
const { protect } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { tenantGuard } = require('../middlewares/tenant.middleware');

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

router.post(
  '/',
  hasPermission('exams:create'),
  createExamValidator,
  examController.createExam
);

router.get(
  '/',
  hasPermission('exams:read'),
  getExamsValidator,
  examController.getExams
);

router.get(
  '/:id',
  hasPermission('exams:read'),
  idParamValidator,
  examController.getExamById
);

router.put(
  '/:id',
  hasPermission('exams:update'),
  updateExamValidator,
  examController.updateExam
);

router.patch(
  '/:id/status',
  hasPermission('exams:update'),
  updateExamStatusValidator,
  examController.updateExamStatus
);

router.delete(
  '/:id',
  hasPermission('exams:delete'),
  idParamValidator,
  examController.deleteExam
);

module.exports = router;
