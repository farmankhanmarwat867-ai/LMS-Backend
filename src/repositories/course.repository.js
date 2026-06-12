const BaseRepository = require('./base.repository');
const Course = require('../models/Course');

class CourseRepository extends BaseRepository {
  constructor() {
    super(Course);
  }

  async searchCourses(tenantFilter, filters = {}, options = {}) {
    const query = { ...tenantFilter };

    if (filters.status)    query.status    = filters.status;
    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.classId)   query.classId   = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    
    if (filters.search) {
      query.title = { $regex: filters.search, $options: 'i' };
    }

    const page  = parseInt(options.page)  || 1;
    const limit = parseInt(options.limit) || 10;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Course.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teacherId', 'name email avatar')
        .populate('subjectId', 'name code')
        .populate('classId',   'name code')
        .populate('sectionId', 'name')
        .populate('sessionId', 'name startDate endDate')
        .populate('branchId',  'name code')
        .populate('createdBy', 'name role'),
      Course.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page, limit, total,
        pages:   Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async countByTeacherId(teacherId) {
    return Course.countDocuments({ teacherId, isDeleted: false });
  }
}

module.exports = new CourseRepository();
