const BaseRepository = require('./base.repository');
const Result = require('../models/Result');

/**
 * Result Repository — Phase 16
 * Data Access Layer for the Result module.
 * Extends BaseRepository (findOne, findById, create, updateById, softDelete, findWithPagination).
 */
class ResultRepository extends BaseRepository {
  constructor() {
    super(Result);
  }

  /**
   * Bulk write operations for Results (used by bulkUploadResults).
   * @param {Array} operations - Array of mongoose bulkWrite operations
   * @returns {Promise<Object>} BulkWriteResult
   */
  async bulkWrite(operations) {
    return this.model.bulkWrite(operations, { ordered: false });
  }

  /**
   * Find all results for a given student (used by /my and /my-child endpoints).
   * @param {ObjectId|string} studentId
   * @param {Object} extraFilter - Additional filter conditions
   * @param {Object} options - { page, limit }
   * @returns {Promise<Object>} Paginated results
   */
  async findByStudentId(studentId, extraFilter = {}, options = {}) {
    const query = { studentId, isDeleted: false, ...extraFilter };
    const page  = Math.max(parseInt(options.page)  || 1, 1);
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Result.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'examScheduleId',
          select: 'examDate totalMarks passingMarks startTime endTime subjectId examId',
          populate: [
            { path: 'subjectId', select: 'name code' },
            { path: 'examId',    select: 'title examCode' },
          ],
        })
        .populate('classId',   'name code')
        .populate('sectionId', 'name')
        .lean(),
      Result.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Soft delete a result by ID (sets isDeleted=true, deletedAt=now, updatedBy=userId).
   * @param {ObjectId|string} id
   * @param {ObjectId|string} userId
   * @returns {Promise<Object>}
   */
  async softDelete(id, userId) {
    return Result.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        isActive:  false,
        deletedAt: new Date(),
        updatedBy: userId,
      },
      { new: true }
    );
  }
}

module.exports = new ResultRepository();
