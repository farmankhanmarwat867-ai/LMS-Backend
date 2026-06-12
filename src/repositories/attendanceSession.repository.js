const BaseRepository = require('./base.repository');
const AttendanceSession = require('../models/AttendanceSession');

class AttendanceSessionRepository extends BaseRepository {
  constructor() {
    super(AttendanceSession);
  }

  async findActiveByCourse(courseId) {
    return this.model.findOne({
      courseId,
      status: 'ACTIVE',
      isDeleted: false,
    });
  }

  async findByToken(qrToken) {
    return this.model.findOne({
      qrToken,
      status: 'ACTIVE',
      isDeleted: false,
    });
  }

  async findByIdPopulated(id, tenantFilter = {}) {
    return this.model.findOne({ _id: id, ...tenantFilter, isDeleted: false })
      .populate('courseId', 'title')
      .populate('teacherId', 'name email')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('scannedStudents', 'name email avatar')
      .populate('attendanceId');
  }

  async addScannedStudent(sessionId, studentId) {
    return this.model.findByIdAndUpdate(
      sessionId,
      { $addToSet: { scannedStudents: studentId } },
      { new: true }
    );
  }
}

module.exports = new AttendanceSessionRepository();
