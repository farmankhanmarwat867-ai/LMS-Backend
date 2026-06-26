const BaseRepository = require('./base.repository');
const ExamSchedule = require('../models/ExamSchedule');

class ExamScheduleRepository extends BaseRepository {
  constructor() {
    super(ExamSchedule);
  }

  async searchSchedules(tenantFilter, filters = {}, options = {}) {
    const query = { ...tenantFilter, isDeleted: false };

    if (filters.examId) query.examId = filters.examId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.courseId) query.courseId = filters.courseId;
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.status) query.status = filters.status;

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ExamSchedule.find(query)
        .sort({ examDate: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'examId',
          select: 'title examCode examType status startDate endDate sessionId',
          populate: {
            path: 'sessionId',
            select: 'name'
          }
        })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email avatar')
        .populate('classId', 'name code')
        .populate('sectionId', 'name')
        .populate('instituteId', 'name logo email phone address')
        .populate('branchId', 'name email phone address')
        .populate('createdBy', 'name role')
        .populate('updatedBy', 'name role'),
      ExamSchedule.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findByIdPopulated(id, tenantFilter) {
    return this.model.findOne({ _id: id, ...tenantFilter, isDeleted: false })
      .populate({
        path: 'examId',
        select: 'title examCode examType status startDate endDate sessionId',
        populate: {
          path: 'sessionId',
          select: 'name'
        }
      })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name email avatar')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('instituteId', 'name logo email phone address')
      .populate('branchId', 'name email phone address')
      .populate('createdBy', 'name role')
      .populate('updatedBy', 'name role');
  }

  async findDuplicate(examId, subjectId, classId, sectionId, tenantFilter) {
    return this.model.findOne({
      examId,
      subjectId,
      classId,
      sectionId,
      ...tenantFilter,
      isDeleted: false,
    });
  }
}

module.exports = new ExamScheduleRepository();
