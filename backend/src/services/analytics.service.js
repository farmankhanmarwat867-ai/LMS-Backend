const User = require('../models/User');
const Institute = require('../models/Institute');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const Plan = require('../models/Plan');

class AnalyticsService {
  /**
   * SUPER_ADMIN Analytics
   * Platform-wide metrics including revenue, institutes, and active users.
   */
  async getPlatformAnalytics() {
    const totalInstitutes = await Institute.countDocuments({ isDeleted: false });
    const totalStudents = await User.countDocuments({ role: 'STUDENT', isDeleted: false });
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', isDeleted: false });

    // Global Revenue from Payments (assuming Platform fees or total processed volume)
    const revenueAggregation = await Payment.aggregate([
      { $match: { paymentStatus: 'COMPLETED', isDeleted: false } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const revenue = revenueAggregation[0]?.totalRevenue || 0;

    // Platform usage by plan (Active Subscriptions mockup)
    // In a real app with subscriptions, we would check a Subscription model.
    // For now, we aggregate by Institute's plan tier if stored on Institute or count Plans.
    const activePlans = await Plan.countDocuments({ isActive: true });

    return {
      totalInstitutes,
      totalStudents,
      totalTeachers,
      revenue,
      activePlans,
      lastUpdated: new Date()
    };
  }

  /**
   * INSTITUTE_ADMIN Analytics
   * Institute-specific metrics (students, attendance, results, fees)
   */
  async getInstituteAnalytics(instituteId) {
    const totalStudents = await User.countDocuments({ role: 'STUDENT', instituteId, isDeleted: false });
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', instituteId, isDeleted: false });

    // Total Fee Collection for Institute
    const feeAggregation = await Payment.aggregate([
      { $match: { instituteId, paymentStatus: 'COMPLETED', isDeleted: false } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
    ]);
    const totalCollected = feeAggregation[0]?.totalCollected || 0;

    // Attendance Rate (Overall average for institute)
    const attendanceAggregation = await Attendance.aggregate([
      { $match: { instituteId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
        }
      }
    ]);
    let attendanceRate = 0;
    if (attendanceAggregation[0] && attendanceAggregation[0].totalRecords > 0) {
      attendanceRate = (attendanceAggregation[0].presentCount / attendanceAggregation[0].totalRecords) * 100;
    }

    // Result Trends (Average Percentage)
    const resultAggregation = await Result.aggregate([
      { $match: { instituteId, isDeleted: false, isPublished: true } },
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } }
    ]);
    const avgPercentage = resultAggregation[0]?.avgPercentage || 0;

    return {
      totalStudents,
      totalTeachers,
      feeCollection: { totalCollected },
      attendance: { averageRate: parseFloat(attendanceRate.toFixed(2)) },
      academics: { averagePercentage: parseFloat(avgPercentage.toFixed(2)) },
      lastUpdated: new Date()
    };
  }

  /**
   * BRANCH_ADMIN Analytics
   * Branch-specific metrics
   */
  async getBranchAnalytics(instituteId, branchId) {
    const totalStudents = await User.countDocuments({ role: 'STUDENT', instituteId, branchId, isDeleted: false });
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', instituteId, branchId, isDeleted: false });

    // Total Fee Collection for Branch
    const feeAggregation = await Payment.aggregate([
      { $match: { instituteId, branchId, paymentStatus: 'COMPLETED', isDeleted: false } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
    ]);
    const totalCollected = feeAggregation[0]?.totalCollected || 0;

    // Attendance Rate (Overall average for branch)
    const attendanceAggregation = await Attendance.aggregate([
      { $match: { instituteId, branchId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }
        }
      }
    ]);
    let attendanceRate = 0;
    if (attendanceAggregation[0] && attendanceAggregation[0].totalRecords > 0) {
      attendanceRate = (attendanceAggregation[0].presentCount / attendanceAggregation[0].totalRecords) * 100;
    }

    // Average GPA/Percentage for Branch
    const resultAggregation = await Result.aggregate([
      { $match: { instituteId, branchId, isDeleted: false, isPublished: true } },
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } }
    ]);
    const avgPercentage = resultAggregation[0]?.avgPercentage || 0;

    return {
      totalStudents,
      totalTeachers,
      feeCollection: { totalCollected },
      attendance: { averageRate: parseFloat(attendanceRate.toFixed(2)) },
      academics: { averagePercentage: parseFloat(avgPercentage.toFixed(2)) },
      lastUpdated: new Date()
    };
  }
}

module.exports = new AnalyticsService();
