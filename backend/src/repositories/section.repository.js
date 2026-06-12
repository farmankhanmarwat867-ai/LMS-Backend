const BaseRepository = require('./base.repository');
const Section = require('../models/Section');

/**
 * SECTION REPOSITORY
 * Extends BaseRepository with section-specific queries
 */
class SectionRepository extends BaseRepository {
  constructor() {
    super(Section);
  }

  /**
   * Find a section by name within a specific class
   */
  async findByNameAndClass(name, classId) {
    return this.model.findOne({ name: name.toUpperCase(), classId });
  }

  /**
   * Find all sections with pagination and populated references
   */
  async findAllPaginated(query, options) {
    return this.model.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate([
        { path: 'classId', select: 'name code' },
        { path: 'branchId', select: 'name code' }
      ]);
  }
}

module.exports = new SectionRepository();
