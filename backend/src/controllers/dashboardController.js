const User = require('../models/User');
const Institute = require('../models/Institute');
const Subject = require('../models/Subject');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Branch = require('../models/Branch');
const Class = require('../models/Class');

// @desc    Super Admin dashboard stats
// @route   GET /api/dashboard/super
// @access  Private (SUPER_ADMIN)
exports.getSuperAdminStats = async (req, res, next) => {
  try {
    const [totalInstitutes, totalUsers, totalCourses, activeInstitutes] = await Promise.all([
      Institute.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false }),
      Subject.countDocuments({ isDeleted: false }),
      Institute.countDocuments({ status: 'ACTIVE', isDeleted: false }),
    ]);

    const usersByRole = await User.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const recentInstitutes = await Institute.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status createdAt');

    // Map recentInstitutes to include isActive for backward compatibility
    const recentInstitutesMapped = recentInstitutes.map(inst => ({
      _id: inst._id,
      name: inst.name,
      email: inst.email,
      status: inst.status,
      isActive: inst.status === 'ACTIVE',
      createdAt: inst.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        totalInstitutes,
        totalUsers,
        totalCourses,
        activeInstitutes,
        usersByRole,
        recentInstitutes: recentInstitutesMapped
      },
    });
  } catch (error) { next(error); }
};

// @desc    Institute Admin dashboard stats
// @route   GET /api/dashboard/institute
// @access  Private (INSTITUTE_ADMIN)
exports.getInstituteStats = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;

    const [totalTeachers, totalStudents, totalCourses, totalEnrollments, totalBranches] = await Promise.all([
      User.countDocuments({ instituteId, role: 'TEACHER' }),
      User.countDocuments({ instituteId, role: 'STUDENT' }),
      Subject.countDocuments({ instituteId, isDeleted: false }),
      Enrollment.countDocuments({ instituteId }),
      Branch.countDocuments({ instituteId, isDeleted: false }),
    ]);

    const recentSubjects = await Subject.find({ instituteId, isDeleted: false })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt code');

    const recentCourses = recentSubjects.map(s => ({
      ...s.toObject(),
      title: s.name,
      isPublished: s.status === 'ACTIVE' || s.status === 'PUBLISHED',
      enrollmentCount: 0 // If needed, we could fetch from enrollments, but leaving 0 for now to match UI expectation safely
    }));

    res.status(200).json({
      success: true,
      data: { totalTeachers, totalStudents, totalCourses, totalEnrollments, totalBranches, recentCourses },
    });
  } catch (error) { next(error); }
};

// @desc    Student dashboard stats
// @route   GET /api/dashboard/student
// @access  Private (STUDENT)
exports.getStudentStats = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const enrollmentsRaw = await Enrollment.find({ studentId }).populate('courseId', 'name title code status maxStudents');
    
    // Map Subject's 'name' to 'title' for frontend compatibility
    const enrollments = enrollmentsRaw.map(enr => {
      const enrObj = enr.toObject();
      if (enrObj.courseId) {
        enrObj.courseId.title = enrObj.courseId.name || enrObj.courseId.title || 'N/A';
      }
      return enrObj;
    });

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

// @desc    Branch Admin dashboard stats
// @route   GET /api/dashboard/branch
// @access  Private (BRANCH_ADMIN)
exports.getBranchAdminStats = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;
    const branchId = req.user.branchId;

    const [totalTeachers, totalStudents, totalCourses, totalEnrollments, totalClasses] = await Promise.all([
      User.countDocuments({ instituteId, branchId, role: 'TEACHER' }),
      User.countDocuments({ instituteId, branchId, role: 'STUDENT' }),
      Subject.countDocuments({ instituteId, branchId, isDeleted: false }),
      Enrollment.countDocuments({ instituteId, branchId }),
      Class.countDocuments({ instituteId, branchId, isDeleted: false }),
    ]);

    const recentSubjects = await Subject.find({ instituteId, branchId, isDeleted: false })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt code');

    const recentCourses = recentSubjects.map(s => ({
      ...s.toObject(),
      title: s.name,
      isPublished: s.status === 'ACTIVE' || s.status === 'PUBLISHED'
    }));

    res.status(200).json({
      success: true,
      data: { totalTeachers, totalStudents, totalClasses, totalCourses, totalEnrollments, recentCourses },
    });
  } catch (error) { next(error); }
};

