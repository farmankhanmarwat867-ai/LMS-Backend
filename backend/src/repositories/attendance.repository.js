const BaseRepository = require('./base.repository');
const Attendance = require('../models/Attendance');

/**
 * Attendance Repository — Phase 12
 * Data Access Layer for Attendance module
 */
class AttendanceRepository extends BaseRepository {
  constructor() {
    super(Attendance);
  }

  // ── Find with Pagination & Rich Population ────────────────────────────────
  async findWithPagination(filter, options = {}) {
    const {
      page      = 1,
      limit     = 10,
      sortBy    = 'date',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('courseId',    'name')
        .populate('recordedBy',  'name email avatar')
        .populate('classId',     'name code')
        .populate('sectionId',   'name')
        .populate('createdBy',   'name')
        .populate('updatedBy',   'name')
        .populate('attendees.studentId', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNext:    Number(page) < Math.ceil(total / limit),
        hasPrev:    Number(page) > 1,
      },
    };
  }

  // ── Find single record fully populated ────────────────────────────────────
  async findByIdPopulated(id, tenantFilter = {}) {
    return this.model
      .findOne({ _id: id, ...tenantFilter, isDeleted: false })
      .populate('courseId',   'name code description')
      .populate('recordedBy', 'name email avatar')
      .populate('classId',    'name code')
      .populate('sectionId',  'name')
      .populate('instituteId','name')
      .populate('branchId',   'name')
      .populate('createdBy',  'name role')
      .populate('updatedBy',  'name role')
      .populate('attendees.studentId', 'name email avatar');
  }

  // ── Find one record by courseId + date (for duplicate check & update) ─────
  async findByCourseAndDate(courseId, date) {
    // Normalise: match any time on the given calendar date
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.model
      .findOne({
        courseId,
        date: { $gte: start, $lte: end },
        isDeleted: false,
      })
      .populate('attendees.studentId', 'name email avatar');
  }

  // ── Student-level attendance history (all records that contain studentId) ──
  async findByStudentId(studentId, tenantFilter = {}, options = {}) {
    const {
      page      = 1,
      limit     = 10,
      sortBy    = 'date',
      sortOrder = 'desc',
      courseId,
    } = options;

    const filter = {
      ...tenantFilter,
      'attendees.studentId': studentId,
      isDeleted: false,
    };
    if (courseId) filter.courseId = courseId;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('courseId',  'name')
        .populate('classId', 'name')
        .populate('recordedBy','name email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.model.countDocuments(filter),
    ]);

    // Project only the matching student's attendee entry
    const projected = data.map(record => ({
      ...record,
      attendees: record.attendees.filter(
        a => a.studentId?.toString() === studentId.toString()
      ),
    }));

    return {
      data: projected,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNext:    Number(page) < Math.ceil(total / limit),
        hasPrev:    Number(page) > 1,
      },
    };
  }

  // ── Attendance summary per student for a course ───────────────────────────
  async getStudentSummary(studentId, courseId) {
    const Types = this.model.base.Types;
    const matchStage = {
      isDeleted: false,
      'attendees.studentId': new Types.ObjectId(studentId),
    };
    if (courseId) {
      matchStage.courseId = new Types.ObjectId(courseId);
    }

    const result = await this.model.aggregate([
      {
        $match: matchStage,
      },
      { $unwind: '$attendees' },
      {
        $match: {
          'attendees.studentId': new Types.ObjectId(studentId),
        },
      },
      {
        $group: {
          _id:     '$attendees.status',
          count:   { $sum: 1 },
        },
      },
    ]);

    const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 };
    result.forEach(r => {
      summary[r._id] = r.count;
      summary.total += r.count;
    });
    summary.attendancePercent =
      summary.total > 0
        ? Math.round(((summary.PRESENT + summary.LATE) / summary.total) * 100)
        : 0;

    return summary;
  }
}

module.exports = new AttendanceRepository();
