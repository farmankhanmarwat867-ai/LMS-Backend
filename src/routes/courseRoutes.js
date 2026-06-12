const express = require('express');
const { createCourse, getAllCourses, getCourse, updateCourse, deleteCourse, togglePublish } = require('../controllers/courseController');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllCourses)
  .post(authorize('TEACHER', 'INSTITUTE_ADMIN'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(authorize('TEACHER', 'INSTITUTE_ADMIN'), updateCourse)
  .delete(authorize('TEACHER', 'INSTITUTE_ADMIN'), deleteCourse);

router.patch('/:id/publish', authorize('TEACHER'), togglePublish);

module.exports = router;
