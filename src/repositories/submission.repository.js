const BaseRepository = require('./base.repository');
const Submission = require('../models/Submission');

class SubmissionRepository extends BaseRepository {
  constructor() {
    super(Submission);
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
      .populate('assignmentId', 'title dueDate maxMarks')
      .populate('studentId', 'name email avatar')
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

  // ── Find Single Submission ────────────────────────────────────────────────
  async findSubmission(assignmentId, studentId, tenantFilter = {}) {
    return this.model.findOne({
      assignmentId,
      studentId,
      ...tenantFilter,
      isDeleted: false
    }).populate('studentId', 'name email avatar')
      .populate('assignmentId', 'title maxMarks dueDate');
  }
  
  async findByIdPopulated(id, tenantFilter = {}) {
    return this.model.findOne({ _id: id, ...tenantFilter, isDeleted: false })
      .populate('studentId', 'name email avatar')
      .populate('assignmentId', 'title maxMarks dueDate');
  }

  // ── Count submissions for an assignment ───────────────────────────────────
  async countSubmissionsByAssignment(assignmentId) {
    return this.model.countDocuments({ assignmentId, isDeleted: false });
  }

  async countGradedSubmissions(assignmentId) {
    return this.model.countDocuments({ assignmentId, status: 'GRADED', isDeleted: false });
  }
}

module.exports = new SubmissionRepository();
