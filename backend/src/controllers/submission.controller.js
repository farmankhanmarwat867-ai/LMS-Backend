const submissionService = require('../services/submission.service');
const { success, created } = require('../utils/apiResponse');

// ── POST /api/submissions/:assignmentId ─────────────────────────────────────
const submitAssignment = async (req, res, next) => {
  try {
    const submission = await submissionService.submitAssignment(
      req.params.assignmentId,
      req.body,
      req.user,
      req.tenantFilter
    );
    return created(res, submission, 'Assignment submitted successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/submissions/assignment/:assignmentId ───────────────────────────
const getSubmissionsByAssignment = async (req, res, next) => {
  try {
    const { data, pagination } = await submissionService.getSubmissionsByAssignment(
      req.params.assignmentId,
      req.query,
      req.user,
      req.tenantFilter
    );
    return success(res, data, 'Submissions retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/submissions/my ─────────────────────────────────────────────────
const getMySubmissions = async (req, res, next) => {
  try {
    const { data, pagination } = await submissionService.getMySubmissions(req.query, req.user);
    return success(res, data, 'My submissions retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/submissions/student/:studentId ─────────────────────────────────
const getStudentSubmissions = async (req, res, next) => {
  try {
    const { data, pagination } = await submissionService.getStudentSubmissions(
      req.params.studentId,
      req.query,
      req.user,
      req.tenantFilter
    );
    return success(res, data, 'Student submissions retrieved successfully', 200, pagination);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/submissions/:id/grade ────────────────────────────────────────
const gradeSubmission = async (req, res, next) => {
  try {
    const submission = await submissionService.gradeSubmission(
      req.params.id,
      req.body,
      req.user,
      req.tenantFilter
    );
    return success(res, submission, 'Submission graded successfully');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/submissions/:id ──────────────────────────────────────────────
const unsubmitAssignment = async (req, res, next) => {
  try {
    await submissionService.unsubmitAssignment(req.params.id, req.user);
    return success(res, null, 'Submission removed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmissions,
  getStudentSubmissions,
  gradeSubmission,
  unsubmitAssignment,
};
