const BaseRepository = require('./base.repository');
const Assignment = require('../models/Assignment');

class AssignmentRepository extends BaseRepository {
  constructor() {
    super(Assignment);
  }

  // ── Find with Pagination & Filters ──────────────────────────────────────────
  async findWithPagination(filter, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const data = await this.model
      .find(filter)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await this.model.countDocuments(filter);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Find by ID Populated ──────────────────────────────────────────────────
  async findByIdPopulated(id, tenantFilter = {}) {
    const query = { _id: id, ...tenantFilter, isDeleted: false };
    return this.model.findOne(query)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name email avatar')
      .populate('instituteId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
  }

  // ── Assignment Statistics ─────────────────────────────────────────────────
  // Note: Statistics calculation combines data from Course enrollments and Submissions.
  // It's handled mostly in the service layer, but we can have specific DB aggregates here if needed.
}

module.exports = new AssignmentRepository();
