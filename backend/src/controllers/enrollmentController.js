const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Enroll student in a course
// @route   POST /api/enrollments
// @access  Private (STUDENT)
exports.enrollStudent = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!course.isPublished) return res.status(400).json({ message: 'Course is not published yet' });

    const enrollment = await Enrollment.create({
      studentId: req.user._id,
      courseId,
      instituteId: req.user.instituteId,
    });

    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Already enrolled in this course' });
    next(error);
  }
};

// @desc    Get my enrollments (student)
// @route   GET /api/enrollments/me
// @access  Private (STUDENT)
exports.getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate('courseId', 'title description thumbnail category teacherId isPublished')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
  } catch (error) { next(error); }
};

// @desc    Get students enrolled in a course
// @route   GET /api/enrollments/course/:id
// @access  Private (TEACHER, INSTITUTE_ADMIN)
exports.getCourseStudents = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ courseId: req.params.id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
  } catch (error) { next(error); }
};

// @desc    Unenroll from a course
// @route   DELETE /api/enrollments/:id
// @access  Private (STUDENT, INSTITUTE_ADMIN)
exports.unenroll = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    if (req.user.role === 'STUDENT' && enrollment.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Enrollment.findByIdAndDelete(req.params.id);
    await Course.findByIdAndUpdate(enrollment.courseId, { $inc: { enrollmentCount: -1 } });

    res.status(200).json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) { next(error); }
};
