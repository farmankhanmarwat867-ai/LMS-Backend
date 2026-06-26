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
        .populate('courseId',   'name code status')
        .populate('classId',    'name code')
        .populate('sectionId',  'name')
        .populate('sessionId',  'name startDate endDate isActive')
        .populate('createdBy',  'name role')
        .lean(),
      Enrollment.countDocuments(query),
    ]);

    const mappedData = data.map(enr => {
      if (enr.courseId) {
        enr.courseId = {
          _id: enr.courseId._id,
          code: enr.courseId.code || 'N/A',
          title: enr.courseId.name || enr.courseId.title || 'N/A',
          status: enr.courseId.status || 'ACTIVE'
        };
      } else {
        enr.courseId = {
          _id: null,
          code: 'N/A',
          title: enr.courseTitle || 'N/A',
          status: 'ACTIVE'
        };
      }
      return enr;
    });

    return {
      data: mappedData,
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
    const enrollment = await Enrollment.findOne(query)
      .populate('studentId',  'name email avatar phone')
      .populate('teacherId',  'name email avatar')
      .populate('courseId',   'name code description status maxStudents')
      .populate('classId',    'name code')
      .populate('sectionId',  'name')
      .populate('sessionId',  'name startDate endDate')
      .populate('branchId',   'name code')
      .populate('instituteId','name')
      .populate('createdBy',  'name role')
      .populate('updatedBy',  'name role');

    if (!enrollment) return null;

    const result = enrollment.toObject();
    if (result.courseId) {
      result.courseId = {
        _id: result.courseId._id,
        code: result.courseId.code || 'N/A',
        title: result.courseId.name || result.courseId.title || 'N/A',
        description: result.courseId.description || '',
        status: result.courseId.status || 'ACTIVE',
        maxStudents: result.courseId.maxStudents
      };
    } else {
      result.courseId = {
        _id: null,
        code: 'N/A',
        title: result.courseTitle || 'N/A',
        description: '',
        status: 'ACTIVE'
      };
    }
    return result;
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
    // Only prevent duplicate enrollment if the student is currently ACTIVE
    return Enrollment.findOne({ 
      studentId, 
      courseId, 
      status: 'ACTIVE',
      isDeleted: false 
    });
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
