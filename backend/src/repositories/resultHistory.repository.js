const BaseRepository = require('./base.repository');
const ResultHistory = require('../models/ResultHistory');

/**
 * ResultHistory Repository — Phase 16
 * Data Access Layer for immutable marks-change audit trail.
 */
class ResultHistoryRepository extends BaseRepository {
  constructor() {
    super(ResultHistory);
  }

  /**
   * Get all history entries for a given Result, newest first.
   * @param {ObjectId|string} resultId
   * @returns {Promise<Array>}
   */
  async findByResultId(resultId) {
    return ResultHistory.find({ resultId })
      .sort({ changedAt: -1 })
      .populate('changedBy', 'name email role')
      .lean();
  }

  /**
   * Get all history entries for an institute (for admin audit view).
   * @param {ObjectId|string} instituteId
   * @param {Object} options - { page, limit }
   * @returns {Promise<Object>}
   */
  async findByInstituteId(instituteId, options = {}) {
    const page  = Math.max(parseInt(options.page)  || 1, 1);
    const limit = Math.min(parseInt(options.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ResultHistory.find({ instituteId })
        .sort({ changedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('resultId', 'studentId examScheduleId')
        .populate('changedBy', 'name email role')
        .lean(),
      ResultHistory.countDocuments({ instituteId }),
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
}

module.exports = new ResultHistoryRepository();
