const examService = require('../services/exam.service');
const { success, created } = require('../utils/apiResponse');

const createExam = async (req, res, next) => {
  try {
    const exam = await examService.createExam(req.body, req.user, req.tenantFilter);
    return created(res, exam, 'Exam created successfully');
  } catch (err) {
    next(err);
  }
};

const getExams = async (req, res, next) => {
  try {
    const { data, pagination } = await examService.getExams(req.query, req.user, req.tenantFilter);
    return success(res, data, 'Exams retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

const getExamById = async (req, res, next) => {
  try {
    const exam = await examService.getExamById(req.params.id, req.user, req.tenantFilter);
    return success(res, exam, 'Exam retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateExam = async (req, res, next) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body, req.user, req.tenantFilter);
    return success(res, exam, 'Exam updated successfully');
  } catch (err) {
    next(err);
  }
};

const updateExamStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const exam = await examService.updateExamStatus(req.params.id, status, req.user, req.tenantFilter);
    return success(res, exam, 'Exam status updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const result = await examService.deleteExam(req.params.id, req.user, req.tenantFilter);
    return success(res, result, 'Exam deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  updateExamStatus,
  deleteExam,
};
