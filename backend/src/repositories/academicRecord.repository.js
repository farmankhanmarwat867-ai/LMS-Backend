/**
 * Academic Record Repository — Phase 18
 * ═══════════════════════════════════════════════════════════════════════════════
 * Data Access Layer for AcademicRecord model.
 * Extends BaseRepository for common CRUD operations.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BaseRepository = require('./base.repository');
const AcademicRecord = require('../models/AcademicRecord');

class AcademicRecordRepository extends BaseRepository {
  constructor() {
    super(AcademicRecord);
  }

  /**
   * bulkWrite
   * Executes a bulk write operation for upserts during CGPA calculation.
   *
   * @param {Array} operations - Mongoose BulkWrite operations array
   * @returns {Promise<BulkWriteResult>}
   */
  async bulkWrite(operations) {
    if (!operations || operations.length === 0) return { nUpserted: 0, nModified: 0 };
    return this.model.bulkWrite(operations, { ordered: false });
  }

  /**
   * getPaginatedRecords
   * Returns paginated, populated academic records for Merit Lists & Analytics.
   *
   * @param {Object} query      - MongoDB filter
   * @param {Object} options    - { page, limit, sort }
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  async getPaginatedRecords(query, options = {}) {
    const page  = Math.max(parseInt(options.page)  || 1, 1);
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip  = (page - 1) * limit;
    const sort  = options.sort || { cgpa: -1 }; // default sort by CGPA desc

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('studentId',   'name email avatar rollNumber')
        .populate('sessionId',   'name code')
        .populate('classId',     'name code')
        .populate('sectionId',   'name')
        .populate('branchId',    'name')
        .populate('instituteId', 'name')
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
   * getStudentAnalytics
   * Fetches a student's record and populates their GPA history with exam details.
   */
  async getStudentAnalytics(query) {
    return this.model.findOne(query)
      .populate('studentId', 'name email avatar rollNumber')
      .populate('sessionId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('gpaHistory.examId', 'title examCode examType startDate endDate')
      .lean();
  }
}

module.exports = new AcademicRecordRepository();
