const examScheduleService = require('../services/examSchedule.service');
const { success, created } = require('../utils/apiResponse');

const createSchedule = async (req, res, next) => {
  try {
    const schedule = await examScheduleService.createSchedule(req.body, req.user, req.tenantFilter);
    return created(res, schedule, 'Exam schedule created successfully');
  } catch (err) {
    next(err);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const { data, pagination } = await examScheduleService.getSchedules(req.query, req.user, req.tenantFilter);
    return success(res, data, 'Exam schedules retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await examScheduleService.getScheduleById(req.params.id, req.user, req.tenantFilter);
    return success(res, schedule, 'Exam schedule retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await examScheduleService.updateSchedule(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, schedule, 'Exam schedule updated successfully');
  } catch (err) {
    next(err);
  }
};

const updateScheduleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const schedule = await examScheduleService.updateScheduleStatus(req.params.id, status, req.user, req.tenantFilter);
    return success(res, schedule, 'Exam schedule status updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const result = await examScheduleService.deleteSchedule(req.params.id, req.user, req.tenantFilter);
    return success(res, result, 'Exam schedule deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
};
