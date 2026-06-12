const BaseRepository = require('./base.repository');
const Exam = require('../models/Exam');

class ExamRepository extends BaseRepository {
  constructor() {
    super(Exam);
  }

  async searchExams(tenantFilter, filters = {}, options = {}) {
    const query = { ...tenantFilter, isDeleted: false };

    if (filters.sessionId) query.sessionId = filters.sessionId;
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.examType) query.examType = filters.examType;
    if (filters.status) query.status = filters.status;
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { examCode: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Exam.find(query)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sessionId', 'name startDate endDate')
        .populate('classId', 'name code')
        .populate('sectionId', 'name')
        .populate('createdBy', 'name role')
        .populate('updatedBy', 'name role'),
      Exam.countDocuments(query),
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

  async findByExamCode(examCode, tenantFilter) {
    return this.model.findOne({ examCode, ...tenantFilter, isDeleted: false });
  }

  async findByIdPopulated(id, tenantFilter) {
    return this.model.findOne({ _id: id, ...tenantFilter, isDeleted: false })
      .populate('sessionId', 'name startDate endDate')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('instituteId', 'name')
      .populate('branchId', 'name code')
      .populate('createdBy', 'name role')
      .populate('updatedBy', 'name role');
  }
}

module.exports = new ExamRepository();
