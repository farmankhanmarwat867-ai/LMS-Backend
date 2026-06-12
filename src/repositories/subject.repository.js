const BaseRepository = require('./base.repository');
const Subject = require('../models/Subject');

/**
 * SUBJECT REPOSITORY
 * Extends BaseRepository with subject-specific queries
 */
class SubjectRepository extends BaseRepository {
  constructor() {
    super(Subject);
  }

  /**
   * Find a subject by code within a specific branch
   */
  async findByCodeAndBranch(code, branchId) {
    return this.model.findOne({ code: code.toUpperCase(), branchId });
  }

  /**
   * Find all subjects with pagination and populated references
   */
  async findAllPaginated(query, options) {
    return this.model.find(query)
      .sort(options.sort || { name: 1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate([
        { path: 'branchId', select: 'name code' },
        { path: 'createdBy', select: 'name email' }
      ]);
  }
}

module.exports = new SubjectRepository();
