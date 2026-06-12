const BaseRepository = require('./base.repository');
const AcademicSession = require('../models/AcademicSession');

/**
 * ACADEMIC SESSION REPOSITORY
 * Extends BaseRepository with session-specific queries
 */
class AcademicSessionRepository extends BaseRepository {
  constructor() {
    super(AcademicSession);
  }

  /**
   * Find session by code within an institute
   * @param {string} code
   * @param {ObjectId} instituteId
   */
  async findByCode(code, instituteId) {
    return this.model.findOne({ code: code.toUpperCase(), instituteId });
  }

  /**
   * Find the currently ACTIVE session for an institute
   * @param {ObjectId} instituteId
   */
  async findActiveSession(instituteId) {
    return this.model.findOne({ instituteId, status: 'ACTIVE' });
  }

  /**
   * Count sessions by institute
   * @param {ObjectId} instituteId
   */
  async countByInstituteId(instituteId) {
    return this.model.countDocuments({ instituteId });
  }

  /**
   * Find all sessions for an institute with optional status filter
   * @param {ObjectId} instituteId
   * @param {string|null} status
   */
  async findByInstituteId(instituteId, status = null) {
    const query = { instituteId };
    if (status) query.status = status;
    return this.model
      .find(query)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ startDate: -1 });
  }

  /**
   * Find all sessions overlapping with a given date range for an institute
   * Used for overlap validation before creating a new session
   * @param {ObjectId} instituteId
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {ObjectId|null} excludeId — exclude self when updating
   */
  async findOverlapping(instituteId, startDate, endDate, excludeId = null) {
    const query = {
      instituteId,
      isDeleted: { $ne: true },
      status: { $in: ['UPCOMING', 'ACTIVE'] },
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return this.model.find(query);
  }
}

module.exports = new AcademicSessionRepository();
