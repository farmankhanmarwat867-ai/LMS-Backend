const BaseRepository = require('./base.repository');
const Enrollment = require('../models/Enrollment');

/**
 * Enrollment Repository — Phase 10
 * Data Access Layer for Enrollment module
 */
class EnrollmentRepository extends BaseRepository {
  constructor() {
    super(Enrollment);
  }

  // ── Rich search with pagination ─────────────────────────────────────────────
  async searchEnrollments(tenantFilter = {}, filters = {}, options = {}) {
    const query = { ...tenantFilter };

    if (filters.status)    query.status    = filters.status;
    if (filters.courseId)  query.courseId  = filters.courseId;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.classId)   query.classId   = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.sessionId) query.sessionId = filters.sessionId;

    const page  = Math.max(parseInt(options.page)  || 1, 1);
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Enrollment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId',  'name email avatar role')
        .populate('teacherId',  'name email avatar')
        .populate('courseId',   'title status')
        .populate('classId',    'name code')
        .populate('sectionId',  'name')
        .populate('sessionId',  'name startDate endDate isActive')
        .populate('createdBy',  'name role')
        .lean(),
      Enrollment.countDocuments(query),
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

  // ── Find single enrollment by id with full population ──────────────────────
  async findByIdPopulated(id, extraFilter = {}) {
    const query = { _id: id, ...extraFilter };
    return Enrollment.findOne(query)
      .populate('studentId',  'name email avatar phone')
      .populate('teacherId',  'name email avatar')
      .populate('courseId',   'title description status maxStudents')
      .populate('classId',    'name code')
      .populate('sectionId',  'name')
      .populate('sessionId',  'name startDate endDate')
      .populate('branchId',   'name code')
      .populate('instituteId','name')
      .populate('createdBy',  'name role')
      .populate('updatedBy',  'name role');
  }

  // ── Count active enrollments in a course (for capacity check) ──────────────
  async countActiveByCourseId(courseId) {
    return Enrollment.countDocuments({
      courseId,
      isDeleted: false,
      status: { $ne: 'DROPPED' },   // ACTIVE + COMPLETED count against capacity
    });
  }

  // ── Duplicate check ─────────────────────────────────────────────────────────
  async checkDuplicate(studentId, courseId) {
    return Enrollment.findOne({ studentId, courseId, isDeleted: false });
  }

  // ── Soft-delete all enrollments for a given course (used when course deleted)
  async dropAllByCourseId(courseId, deletedBy) {
    return Enrollment.updateMany(
      { courseId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), updatedBy: deletedBy }
    );
  }
}

module.exports = new EnrollmentRepository();
