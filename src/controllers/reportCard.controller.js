/**
 * Report Card Controller — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * HTTP request/response layer for Report Card Management.
 * All business logic is delegated to reportCard.service.js.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const reportCardService = require('../services/reportCard.service');

// ══════════════════════════════════════════════════════════════════════════════
//  GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/report-cards/generate
 * Generates DRAFT report cards for all eligible students in an exam.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER
 */
const generateReportCards = async (req, res, next) => {
  try {
    const { examId, classId, sectionId, studentId } = req.body;
    const result = await reportCardService.generateReportCards(
      examId,
      { classId, sectionId, studentId },
      req.user
    );
    res.status(201).json({
      success: true,
      message: `${result.generated} report card(s) generated successfully`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  READ
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/report-cards
 * List all report cards with pagination & filters.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN, TEACHER
 */
const getReportCards = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, examId, classId, sectionId, status } = req.query;
    const result = await reportCardService.getReportCards(
      { examId, classId, sectionId, status },
      { page, limit },
      req.user
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/report-cards/:id
 * Get a single report card by its ID.
 * Roles: All authenticated users (RBAC enforced in service)
 */
const getReportCardById = async (req, res, next) => {
  try {
    const card = await reportCardService.getReportCardById(req.params.id, req.user);
    res.status(200).json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/report-cards/student/:studentId
 * Get all report cards for a specific student.
 * Roles: STUDENT (own only), PARENT (child only), TEACHER, INSTITUTE_ADMIN, BRANCH_ADMIN
 */
const getStudentReportCards = async (req, res, next) => {
  try {
    const cards = await reportCardService.getStudentReportCards(
      req.params.studentId,
      req.user
    );
    res.status(200).json({ success: true, count: cards.length, data: cards });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  COMMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/report-cards/:id/comments
 * Add or update teacher/principal comments on a DRAFT report card.
 * Roles: TEACHER (teacherComments only), INSTITUTE_ADMIN, BRANCH_ADMIN (both)
 */
const addComments = async (req, res, next) => {
  try {
    const card = await reportCardService.addComments(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Comments updated successfully',
      data: card,
    });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  WORKFLOW — PUBLISH / UNPUBLISH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/report-cards/:id/publish
 * Publish a DRAFT report card — sets isLocked=true.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
 */
const publishReportCard = async (req, res, next) => {
  try {
    const card = await reportCardService.publishReportCard(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Report card published successfully',
      data: card,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/report-cards/:id/unpublish
 * Unpublish a PUBLISHED report card — unlocks it for editing.
 * Roles: INSTITUTE_ADMIN, BRANCH_ADMIN
 */
const unpublishReportCard = async (req, res, next) => {
  try {
    const card = await reportCardService.unpublishReportCard(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Report card unpublished and unlocked for editing',
      data: card,
    });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PDF / DOWNLOAD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/report-cards/:id/pdf
 * Generate and return an HTML-based report card payload.
 * In Phase 18 this will become a Puppeteer-generated PDF.
 * Roles: All authenticated users (RBAC enforced in service)
 */
const generatePdf = async (req, res, next) => {
  try {
    const html = await reportCardService.generatePdfStub(req.params.id, req.user);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateReportCards,
  getReportCards,
  getReportCardById,
  getStudentReportCards,
  addComments,
  publishReportCard,
  unpublishReportCard,
  generatePdf,
};
