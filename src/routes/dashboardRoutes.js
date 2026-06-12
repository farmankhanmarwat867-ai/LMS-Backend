const express = require('express');
const { getSuperAdminStats, getInstituteStats, getStudentStats } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.get('/super', authorize('SUPER_ADMIN'), getSuperAdminStats);
router.get('/institute', authorize('INSTITUTE_ADMIN'), getInstituteStats);
router.get('/student', authorize('STUDENT'), getStudentStats);

module.exports = router;
