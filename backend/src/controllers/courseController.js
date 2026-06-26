const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (TEACHER, INSTITUTE_ADMIN)
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, thumbnail, category, duration } = req.body;
    const course = await Course.create({
      title, description, thumbnail, category, duration,
      instituteId: req.user.instituteId,
      teacherId: req.user._id,
    });
    res.status(201).json({ success: true, data: course });
  } catch (error) { next(error); }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private (All roles)
exports.getAllCourses = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'SUPER_ADMIN') query.instituteId = req.user.instituteId;
    if (req.user.role === 'TEACHER') query.teacherId = req.user._id;

    const courses = await Course.find(query)
      .populate('teacherId', 'name email')
      .populate('instituteId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) { next(error); }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('instituteId', 'name');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(200).json({ success: true, data: course });
  } catch (error) { next(error); }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (TEACHER who owns it, INSTITUTE_ADMIN)
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'TEACHER' && course.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: course });
  } catch (error) { next(error); }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (TEACHER who owns it, INSTITUTE_ADMIN)
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'TEACHER' && course.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) { next(error); }
};

// @desc    Publish/Unpublish course
// @route   PATCH /api/courses/:id/publish
// @access  Private (TEACHER)
exports.togglePublish = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (course.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    course.isPublished = !course.isPublished;
    await course.save();
    res.status(200).json({
      success: true,
      message: `Course ${course.isPublished ? 'published' : 'unpublished'}`,
      data: course,
    });
  } catch (error) { next(error); }
};
