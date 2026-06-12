/**
 * Base Repository — Generic CRUD operations
 * All feature repositories extend this class
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  // ── Fetch by primary key ─────────────────────────────────────────────────────
  async findById(id, populate = '') {
    return this.model.findById(id).populate(populate);
  }

  // ── Fetch single document matching query ─────────────────────────────────────
  async findOne(query, populate = '') {
    return this.model.findOne(query).populate(populate);
  }

  /**
   * find() — returns an array of documents matching the query.
   * Mirrors Mongoose's model.find() for service-layer convenience.
   * Options:
   *   sort    — e.g. { createdAt: -1 }
   *   populate — field or array to populate
   *   select  — field projection string
   *   lean    — return plain JS objects (default: true for performance)
   */
  async find(query = {}, options = {}) {
    const {
      sort = { createdAt: -1 },
      populate = '',
      select = '',
      lean = true,
    } = options;

    let q = this.model.find(query).sort(sort);
    if (populate) q = q.populate(populate);
    if (select)   q = q.select(select);
    if (lean)     q = q.lean();
    return q;
  }

  // ── Fetch all documents (alias with explicit options object) ─────────────────
  async findAll(query = {}, options = {}) {
    const { sort = { createdAt: -1 }, populate = '', select = '' } = options;
    return this.model.find(query).sort(sort).populate(populate).select(select);
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  async create(data) {
    return this.model.create(data);
  }

  /**
   * updateById — returns the UPDATED document.
   * Uses `new: true` (works in every Mongoose version).
   * `runValidators: true` ensures schema validators run on update.
   */
  async updateById(id, data, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, data, options);
  }

  // ── Soft Delete ──────────────────────────────────────────────────────────────
  async softDelete(id, userId) {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
      { new: true }
    );
  }

  // ── Hard Delete (use sparingly) ──────────────────────────────────────────────
  async hardDelete(id) {
    return this.model.findByIdAndDelete(id);
  }

  // ── Count ────────────────────────────────────────────────────────────────────
  async count(query = {}) {
    return this.model.countDocuments(query);
  }

  // ── Exists check ─────────────────────────────────────────────────────────────
  async exists(query) {
    return this.model.exists(query);
  }
}

module.exports = BaseRepository;
