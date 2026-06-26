/**
 * Report Card Repository — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * Data Access Layer for ReportCard model.
 * Extends BaseRepository for common CRUD operations.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BaseRepository = require('./base.repository');
const ReportCard     = require('../models/ReportCard');

class ReportCardRepository extends BaseRepository {
  constructor() {
    super(ReportCard);
  }

  /**
   * findByStudentAndExam
   * Returns the report card for a specific student + exam combination.
   *
   * @param {ObjectId} studentId
   * @param {ObjectId} examId
   * @returns {Promise<Document|null>}
   */
  async findByStudentAndExam(studentId, examId) {
    return this.model.findOne({ studentId, examId, isDeleted: false });
  }

  /**
   * findByExam
   * Returns all report cards for an exam (optionally filtered by status).
   *
   * @param {ObjectId} examId
   * @param {String}   status  - Optional: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
   * @returns {Promise<Array>}
   */
  async findByExam(examId, status = null) {
    const query = { examId, isDeleted: false };
    if (status) query.status = status;
    return this.model.find(query).lean();
  }

  /**
   * countByExam
   * Returns count of report cards grouped by status for an exam.
   *
   * @param {ObjectId} examId
   * @returns {Promise<Object>} e.g. { DRAFT: 5, PUBLISHED: 3 }
   */
  async countByExam(examId) {
    const pipeline = [
      { $match: { examId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ];
    const results = await this.model.aggregate(pipeline);
    return results.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});
  }

  /**
   * bulkWrite
   * Executes a bulk write operation for upserts during generation.
   * Uses ordered=false so individual failures don't stop the batch.
   *
   * @param {Array} operations - Mongoose BulkWrite operations array
   * @returns {Promise<BulkWriteResult>}
   */
  async bulkWrite(operations) {
    if (!operations || operations.length === 0) return { nUpserted: 0, nModified: 0 };
    return this.model.bulkWrite(operations, { ordered: false });
  }

  /**
   * getPaginatedReportCards
   * Returns paginated, populated report cards matching the given query.
   *
   * @param {Object} query      - MongoDB filter
   * @param {Object} options    - { page, limit }
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  async getPaginatedReportCards(query, options = {}) {
    const page  = Math.max(parseInt(options.page)  || 1, 1);
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId',   'name email avatar rollNumber')
        .populate('examId',      'title examCode examType')
        .populate('sessionId',   'name code')
        .populate('classId',     'name code')
        .populate('sectionId',   'name')
        .populate('publishedBy', 'name')
        .lean(),
      this.model.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * softDelete
   * Soft-deletes a report card by setting isDeleted=true.
   *
   * @param {ObjectId} id
   * @param {ObjectId} userId
   * @returns {Promise<Document|null>}
   */
  async softDelete(id, userId) {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
      { new: true }
    );
  }
}

module.exports = new ReportCardRepository();
