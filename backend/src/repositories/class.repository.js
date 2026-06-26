const BaseRepository = require('./base.repository');
const Class = require('../models/Class');

/**
 * CLASS REPOSITORY
 * Extends BaseRepository with class-specific queries
 */
class ClassRepository extends BaseRepository {
  constructor() {
    super(Class);
  }

  /**
   * Find a class by code within a specific branch and session
   */
  async findByCode(code, branchId, sessionId) {
    return this.model.findOne({ code: code.toUpperCase(), branchId, sessionId });
  }

  /**
   * Find all classes with pagination and populated references
   */
  async findAllPaginated(query, options) {
    const populate = 'sessionId:name code status,branchId:name code,createdBy:name email,updatedBy:name email';
    return this.model.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate([{ path: 'sessionId', select: 'name code status' }, { path: 'branchId', select: 'name code' }]);
  }
}

module.exports = new ClassRepository();
