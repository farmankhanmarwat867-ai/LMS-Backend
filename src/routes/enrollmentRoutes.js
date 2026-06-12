const express = require('express');
const { enrollStudent, getMyEnrollments, getCourseStudents, unenroll } = require('../controllers/enrollmentController');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('STUDENT'), enrollStudent);
router.get('/me', authorize('STUDENT'), getMyEnrollments);
router.get('/course/:id', authorize('TEACHER', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'), getCourseStudents);
router.delete('/:id', authorize('STUDENT', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'), unenroll);

module.exports = router;
