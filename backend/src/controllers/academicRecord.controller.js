/**
 * Academic Record Controller — Phase 18
 * ═══════════════════════════════════════════════════════════════════════════════
 * HTTP Controller for AcademicRecord endpoints.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const academicRecordService = require('../services/academicRecord.service');

/**
 * calculateSessionRecords
 * POST /api/academic-records/calculate/:sessionId
 * Admin triggers recalculation of CGPA and rankings for a session.
 */
exports.calculateSessionRecords = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await academicRecordService.calculateSessionRecords(sessionId, req.user);

    res.status(200).json({
      success: true,
      message: `Successfully calculated ${result.generated} academic record(s).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getMeritList
 * GET /api/academic-records/merit-list
 * Query filters: sessionId (required), classId, sectionId, branchId
 * Pagination: page, limit
 */
exports.getMeritList = async (req, res, next) => {
  try {
    const { sessionId, classId, sectionId, branchId, academicStanding, page, limit } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required for merit list' });
    }

    const filters = { classId, sectionId, branchId, academicStanding };
    const pagination = { page, limit };

    const result = await academicRecordService.getMeritList(sessionId, filters, pagination, req.user);

    res.status(200).json({
      success: true,
      message: 'Merit list fetched successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getStudentAnalytics
 * GET /api/academic-records/student/:studentId?sessionId=...
 * Fetch CGPA, GPA history, and ranks for a student.
 */
exports.getStudentAnalytics = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required in query params' });
    }

    const record = await academicRecordService.getStudentAnalytics(studentId, sessionId, req.user);

    res.status(200).json({
      success: true,
      message: 'Student analytics fetched successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
