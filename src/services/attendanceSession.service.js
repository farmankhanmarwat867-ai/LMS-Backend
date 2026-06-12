const attendanceSessionRepository = require('../repositories/attendanceSession.repository');
const courseRepository = require('../repositories/course.repository');
const enrollmentRepository = require('../repositories/enrollment.repository');
const attendanceRepository = require('../repositories/attendance.repository');
const AuditLogger = require('../utils/auditLogger');
const { ROLES } = require('../constants/roles');

// ── POST /api/attendance/session ──────────────────────────────────────────────
const createSession = async (data, user, tenantFilter) => {
  const { courseId, validForMinutes = 15, date, topic = '' } = data;

  const course = await courseRepository.findById(courseId);
  if (!course || course.isDeleted) {
    throw { status: 404, message: 'Course not found' };
  }

  if (tenantFilter.instituteId && course.instituteId?.toString() !== tenantFilter.instituteId?.toString()) {
    throw { status: 404, message: 'Course not found' };
  }

  if (user.role === ROLES.TEACHER && course.teacherId?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only create attendance sessions for your own courses' };
  }

  const existingActive = await attendanceSessionRepository.findActiveByCourse(courseId);
  if (existingActive) {
    throw { status: 409, message: 'An active attendance session already exists for this course' };
  }

  // Check if attendance already marked for today
  const attendanceDate = date ? new Date(date) : new Date();
  const existingAttendance = await attendanceRepository.findByCourseAndDate(courseId, attendanceDate);
  if (existingAttendance) {
    throw { status: 409, message: 'Attendance has already been marked for this course on this date' };
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + validForMinutes);

  const session = await attendanceSessionRepository.create({
    courseId,
    teacherId: user._id,
    expiresAt,
    date: attendanceDate,
    topic,
    classId: course.classId,
    sectionId: course.sectionId,
    instituteId: course.instituteId,
    branchId: course.branchId,
    createdBy: user._id,
  });

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ATTENDANCE_SESSION_CREATED',
    resource: 'AttendanceSession',
    resourceId: session._id,
    metadata: { courseId, expiresAt },
  });

  return session;
};

// ── GET /api/attendance/session/:id ───────────────────────────────────────────
const getSession = async (id, user, tenantFilter) => {
  const session = await attendanceSessionRepository.findByIdPopulated(id, tenantFilter);
  if (!session) {
    throw { status: 404, message: 'Attendance session not found' };
  }

  if (user.role === ROLES.TEACHER && session.teacherId._id?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only view attendance sessions for your own courses' };
  }

  return session;
};

// ── PATCH /api/attendance/session/:id/close ───────────────────────────────────
const closeSession = async (id, user, tenantFilter) => {
  const session = await attendanceSessionRepository.findByIdPopulated(id, tenantFilter);
  if (!session) {
    throw { status: 404, message: 'Attendance session not found' };
  }

  if (user.role === ROLES.TEACHER && session.teacherId._id?.toString() !== user._id.toString()) {
    throw { status: 403, message: 'You can only close attendance sessions for your own courses' };
  }

  if (session.status !== 'ACTIVE') {
    throw { status: 400, message: `Session is already ${session.status}` };
  }

  // 1. Get all active enrollments for this course
  const enrollments = await enrollmentRepository.find({
    courseId: session.courseId._id,
    status: 'ACTIVE',
    isDeleted: false,
  });

  const enrolledStudentIds = enrollments.map(e => e.studentId?.toString());
  const scannedStudentIds = new Set(session.scannedStudents.map(s => s._id?.toString()));

  // 2. Build attendees list
  const attendees = enrolledStudentIds.map(studentId => {
    return {
      studentId,
      status: scannedStudentIds.has(studentId) ? 'PRESENT' : 'ABSENT',
      remarks: scannedStudentIds.has(studentId) ? 'QR Scanned' : 'Did not scan QR',
    };
  });

  // 3. Create actual Attendance record
  const attendanceRecord = await attendanceRepository.create({
    courseId: session.courseId._id,
    date: session.date,
    topic: session.topic,
    attendees,
    recordedBy: user._id,
    classId: session.classId,
    sectionId: session.sectionId,
    instituteId: session.instituteId,
    branchId: session.branchId,
    createdBy: user._id,
  });

  // 4. Update session
  const updatedSession = await attendanceSessionRepository.updateById(id, {
    status: 'CLOSED',
    attendanceId: attendanceRecord._id,
    updatedBy: user._id,
  });

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ATTENDANCE_SESSION_CLOSED',
    resource: 'AttendanceSession',
    resourceId: session._id,
    metadata: { courseId: session.courseId._id, attendanceId: attendanceRecord._id },
  });

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ATTENDANCE_CREATED',
    resource: 'Attendance',
    resourceId: attendanceRecord._id,
    metadata: { courseId: session.courseId._id, source: 'QR_SESSION' },
  });

  return updatedSession;
};

// ── POST /api/attendance/scan ─────────────────────────────────────────────────
const scanQr = async (data, user, tenantFilter) => {
  const { qrToken } = data;

  if (user.role !== ROLES.STUDENT) {
    throw { status: 403, message: 'Only students can scan QR codes for attendance' };
  }

  const session = await attendanceSessionRepository.findByToken(qrToken);
  if (!session) {
    throw { status: 404, message: 'Invalid or inactive QR code' };
  }

  // Check Expiry
  if (new Date() > new Date(session.expiresAt)) {
    await attendanceSessionRepository.updateById(session._id, { status: 'EXPIRED' });
    throw { status: 400, message: 'QR code has expired' };
  }

  // Check branch
  if (tenantFilter.branchId && session.branchId?.toString() !== tenantFilter.branchId?.toString()) {
    throw { status: 403, message: 'You cannot scan attendance for a different branch' };
  }

  // Check Enrollment
  const isEnrolled = await enrollmentRepository.findOne({
    studentId: user._id,
    courseId: session.courseId,
    status: 'ACTIVE',
    isDeleted: false,
  });

  if (!isEnrolled) {
    throw { status: 403, message: 'You are not actively enrolled in this course' };
  }

  // Check if already scanned
  const alreadyScanned = session.scannedStudents.some(
    studentId => studentId.toString() === user._id.toString()
  );

  if (alreadyScanned) {
    throw { status: 409, message: 'You have already marked your attendance for this session' };
  }

  // Add student to scanned list
  const updatedSession = await attendanceSessionRepository.addScannedStudent(session._id, user._id);

  await AuditLogger.log({
    userId: user._id,
    role: user.role,
    action: 'ATTENDANCE_QR_SCANNED',
    resource: 'AttendanceSession',
    resourceId: session._id,
    metadata: { courseId: session.courseId },
  });

  return updatedSession;
};

module.exports = {
  createSession,
  getSession,
  closeSession,
  scanQr,
};
