const parentPortalService = require('../services/parentPortal.service');
const apiResponse = require('../utils/apiResponse');

class ParentPortalController {
  getDashboard = async (req, res, next) => {
    try {
      const data = await parentPortalService.getDashboard(req.user.id);
      return apiResponse.success(res, data, 'Dashboard data retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getChildren = async (req, res, next) => {
    try {
      const children = await parentPortalService.getChildren(req.user.id);
      return apiResponse.success(res, children, 'Children retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getChildAttendance = async (req, res, next) => {
    try {
      const data = await parentPortalService.getChildAttendance(req.user.id, req.params.childId);
      return apiResponse.success(res, data, 'Child attendance retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getChildAssignments = async (req, res, next) => {
    try {
      const assignments = await parentPortalService.getChildAssignments(req.user.id, req.params.childId);
      return apiResponse.success(res, assignments, 'Child assignments retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getChildResults = async (req, res, next) => {
    try {
      const results = await parentPortalService.getChildResults(req.user.id, req.params.childId);
      return apiResponse.success(res, results, 'Child results retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getChildFees = async (req, res, next) => {
    try {
      const fees = await parentPortalService.getChildFees(req.user.id, req.params.childId);
      return apiResponse.success(res, fees, 'Child fees retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  getFees = async (req, res, next) => {
    try {
      const fees = await parentPortalService.getFees(req.user.id);
      return apiResponse.success(res, fees, 'Fees retrieved successfully');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new ParentPortalController();
