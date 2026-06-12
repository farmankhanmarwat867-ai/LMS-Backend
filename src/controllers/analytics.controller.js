const analyticsService = require('../services/analytics.service');
const apiResponse = require('../utils/apiResponse');

class AnalyticsController {
  /**
   * GET /api/analytics/platform
   * Super Admin Analytics Dashboard
   */
  getPlatformAnalytics = async (req, res, next) => {
    try {
      const data = await analyticsService.getPlatformAnalytics();
      return apiResponse.success(res, data, 'Platform analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/analytics/institute
   * Institute Admin Analytics Dashboard
   */
  getInstituteAnalytics = async (req, res, next) => {
    try {
      const { instituteId } = req.user;
      const data = await analyticsService.getInstituteAnalytics(instituteId);
      return apiResponse.success(res, data, 'Institute analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/analytics/branch
   * Branch Admin Analytics Dashboard
   */
  getBranchAnalytics = async (req, res, next) => {
    try {
      const { instituteId, branchId } = req.user;
      const data = await analyticsService.getBranchAnalytics(instituteId, branchId);
      return apiResponse.success(res, data, 'Branch analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AnalyticsController();
