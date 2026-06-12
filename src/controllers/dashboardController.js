const User = require('../models/User');
const Institute = require('../models/Institute');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// @desc    Super Admin dashboard stats
// @route   GET /api/dashboard/super
// @access  Private (SUPER_ADMIN)
exports.getSuperAdminStats = async (req, res, next) => {
  try {
    const [totalInstitutes, totalUsers, totalCourses, activeInstitutes] = await Promise.all([
      Institute.countDocuments(),
      User.countDocuments(),
      Course.countDocuments(),
      Institute.countDocuments({ isActive: true }),
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const recentInstitutes = await Institute.find().sort({ createdAt: -1 }).limit(5).select('name email isActive createdAt');

    res.status(200).json({
      success: true,
      data: { totalInstitutes, totalUsers, totalCourses, activeInstitutes, usersByRole, recentInstitutes },
    });
  } catch (error) { next(error); }
};

// @desc    Institute Admin dashboard stats
// @route   GET /api/dashboard/institute
// @access  Private (INSTITUTE_ADMIN)
exports.getInstituteStats = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;

    const [totalTeachers, totalStudents, totalCourses, totalEnrollments] = await Promise.all([
      User.countDocuments({ instituteId, role: 'TEACHER' }),
      User.countDocuments({ instituteId, role: 'STUDENT' }),
      Course.countDocuments({ instituteId }),
      Enrollment.countDocuments({ instituteId }),
    ]);

    const recentCourses = await Course.find({ instituteId })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title isPublished enrollmentCount createdAt');

    res.status(200).json({
      success: true,
      data: { totalTeachers, totalStudents, totalCourses, totalEnrollments, recentCourses },
    });
  } catch (error) { next(error); }
};

// @desc    Student dashboard stats
// @route   GET /api/dashboard/student
// @access  Private (STUDENT)
exports.getStudentStats = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const enrollments = await Enrollment.find({ studentId }).populate('courseId', 'title');
    const courseIds = enrollments.map(e => e.courseId?._id);

    const [totalAssignments, totalSubmissions] = await Promise.all([
      Assignment.countDocuments({ courseId: { $in: courseIds } }),
      Submission.countDocuments({ studentId }),
    ]);

    const pendingAssignments = totalAssignments - totalSubmissions;

    const recentSubmissions = await Submission.find({ studentId })
      .populate('assignmentId', 'title totalMarks dueDate')
      .sort({ submittedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        enrolledCourses: enrollments.length,
        totalAssignments,
        totalSubmissions,
        pendingAssignments: pendingAssignments < 0 ? 0 : pendingAssignments,
        recentSubmissions,
        enrollments,
      },
    });
  } catch (error) { next(error); }
};
