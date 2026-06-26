const attendanceRepository = require('../repositories/attendance.repository');
const subjectRepository     = require('../repositories/subject.repository');
const enrollmentRepository = require('../repositories/enrollment.repository');
const AuditLogger          = require('../utils/auditLogger');
const { ROLES }            = require('../constants/roles');

// ── POST /api/attendance  ─────────────────────────────────────────────────────
/**
 * Mark attendance for a course on a specific date.
 *
 * Body:
 *   courseId   — required
 *   date       — required  (ISO date string, e.g. "2026-06-07")
 *   topic      — optional  (lecture topic / session note)
 *   attendees  — required  array of { studentId, status, remarks? }
 *
 * Rules:
 *   1. Course must exist and belong to caller's tenant
 *   2. TEACHER must own the course
 *   3. Each studentId in attendees must be actively enrolled
 *   4. Only one attendance record allowed per course per date (409 if duplicate)
 */
const markAttendance = async (data, user, tenantFilter) => {
  const { courseId, date, topic = '', attendees = [] } = data;

  // ── 1. Validate course ───────────────────────────────────────────────────
  const course = await subjectRepository.findById(courseId);
  if (!course || course.isDeleted) {
    throw { status: 404, message: 'Course not found' };
  }

  if (
    tenantFilter.instituteId &&
    course.tenantId?.toString() !== tenantFilter.instituteId?.toString() &&
    course.instituteId?.toString() !== tenantFilter.instituteId?.toString()
  ) {
    throw { status: 404, message: 'Subject not found' };
  }

  if (
    tenantFilter.branchId &&
    course.branchId &&
    course.branchId?.toString() !== tenantFilter.branchId?.toString()
  ) {
    throw { status: 404, message: 'Subject not found' };
  }

  // ── 2. Teacher must own the course ────────────────────────────────────────
  if (
    user.role === ROLES.TEACHER &&
    course.teacherId?.toString() !== user._id.toString()
  ) {
    throw { status: 403, message: 'You can only mark attendance for your own subjects' };
  }

  // ── 3. Validate attendees — must be enrolled in this course ───────────────
  if (!attendees || attendees.length === 0) {
    throw { status: 400, message: 'attendees array cannot be empty' };
  }

  const enrollments = await enrollmentRepository.find({
    courseId,
    status:    'ACTIVE',
    isDeleted: false,
  });
  const enrolledStudentIds = new Set(enrollments.map(e => e.studentId?.toString()));

  for (const entry of attendees) {
    if (!enrolledStudentIds.has(entry.studentId?.toString())) {
      throw {
        status: 400,
        message: `Student ${entry.studentId} is not actively enrolled in this subject`,
      };
    }
  }

  // ── 4. Duplicate check — one record per course per date ───────────────────
  const existing = await attendanceRepository.findByCourseAndDate(courseId, date);
  if (existing) {
    throw {
      status: 409,
      message: 'Attendance has already been marked for this subject on this date. Use PUT to update.',
    };
  }

  // ── 5. Create ─────────────────────────────────────────────────────────────
  const record = await attendanceRepository.create({
    courseId,
    date:        new Date(date),
    topic,
    attendees,
    recordedBy:  user._id,
    classId:     course.classId   || null,
    sectionId:   course.sectionId || null,
    instituteId: course.instituteId,
    branchId:    course.branchId  || null,
    createdBy:   user._id,
  });

  // ── 6. Audit ──────────────────────────────────────────────────────────────
  const presentCount = attendees.filter(a => a.status === 'PRESENT').length;
  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'ATTENDANCE_CREATED',
    resource:   'Attendance',
    resourceId: record._id,
    metadata: {
      courseId,
      date,
      totalStudents: attendees.length,
      presentCount,
    },
  });

  return record;
};

// ── GET /api/attendance  ──────────────────────────────────────────────────────
/**
 * List attendance records with filters & pagination.
 *
 * Query params: page, limit, sortBy, sortOrder, courseId, date, classId, sectionId
 *
 * Role behaviour:
 *   SUPER_ADMIN     — sees all
 *   INSTITUTE_ADMIN — sees institute records
 *   BRANCH_ADMIN    — sees branch records
 *   TEACHER         — sees only their own courses' attendance
 *   STUDENT         — not allowed on this endpoint (use GET /student/:id)
 */
const getAttendance = async (query, user, tenantFilter) => {
  const { page, limit, sortBy, sortOrder, courseId, date, classId, sectionId } = query;

  const filter = { ...tenantFilter, isDeleted: false };

  if (courseId)  filter.courseId  = courseId;
  if (classId)   filter.classId   = classId;
  if (sectionId) filter.sectionId = sectionId;

  // Date filter — match any attendance on that calendar day
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  // TEACHER: only their courses
  if (user.role === ROLES.TEACHER) {
    const myCourses = await subjectRepository.model.find({ teacherId: user._id, isDeleted: false });
    const myCourseIds = myCourses.map(c => c._id);
    filter.courseId = courseId
      ? courseId   // if courseId already specified, keep it (ownership checked below)
      : { $in: myCourseIds };

    // If teacher specifies a specific courseId, verify ownership
    if (courseId) {
      const isMine = myCourseIds.some(id => id.toString() === courseId.toString());
      if (!isMine) {
        throw { status: 403, message: 'You can only view attendance for your own subjects' };
      }
    }
  }

  return attendanceRepository.findWithPagination(filter, { page, limit, sortBy, sortOrder });
};

// ── GET /api/attendance/student/:studentId  ───────────────────────────────────
/**
 * Get all attendance records that include a specific student.
 *
 * Role behaviour:
 *   STUDENT  — can only view their own attendance
 *   PARENT   — can view attendance of their children (parentOf check done outside)
 *   TEACHER  — can view for students in their courses
 *   ADMIN    — unrestricted within tenant
 */
const getStudentAttendance = async (studentId, query, user, tenantFilter) => {
  const { page, limit, sortBy, sortOrder, courseId } = query;

  // Students can only view their own data
  if (user.role === ROLES.STUDENT && user._id.toString() !== studentId.toString()) {
    throw { status: 403, message: 'You can only view your own attendance' };
  }

  const options = { page, limit, sortBy, sortOrder, courseId };
  const { data, pagination } = await attendanceRepository.findByStudentId(
    studentId,
    tenantFilter,
    options
  );

  // Augment with summary statistics
  const summary = await attendanceRepository.getStudentSummary(studentId, courseId);

  return { data, pagination, summary };
};

// ── PUT /api/attendance/:id  ──────────────────────────────────────────────────
/**
 * Update an existing attendance record.
 * Teacher can update attendees list, topic.
 * Cannot change courseId or date after creation.
 */
const updateAttendance = async (id, data, user, tenantFilter) => {
  const record = await attendanceRepository.findById(id);
  if (!record || record.isDeleted) {
    throw { status: 404, message: 'Attendance record not found' };
  }

  // Tenant check
  if (
    tenantFilter.instituteId &&
    record.instituteId?.toString() !== tenantFilter.instituteId?.toString()
  ) {
    throw { status: 404, message: 'Attendance record not found' };
  }

  // Teacher can only update attendance they recorded
  if (
    user.role === ROLES.TEACHER &&
    record.recordedBy?.toString() !== user._id.toString()
  ) {
    throw { status: 403, message: 'You can only update attendance records you created' };
  }

  // Validate updated attendees enrollment (if attendees being changed)
  if (data.attendees && data.attendees.length > 0) {
    const enrollments = await enrollmentRepository.find({
      courseId:  record.courseId,
      status:    'ACTIVE',
      isDeleted: false,
    });
    const enrolledStudentIds = new Set(enrollments.map(e => e.studentId?.toString()));

    for (const entry of data.attendees) {
      if (!enrolledStudentIds.has(entry.studentId?.toString())) {
        throw {
          status: 400,
          message: `Student ${entry.studentId} is not actively enrolled in this subject`,
        };
      }
    }
  }

  const payload = {
    updatedBy: user._id,
  };
  if (data.topic    !== undefined) payload.topic    = data.topic;
  if (data.attendees !== undefined) payload.attendees = data.attendees;

  const updated = await attendanceRepository.updateById(id, payload);

  await AuditLogger.log({
    userId:     user._id,
    role:       user.role,
    action:     'ATTENDANCE_UPDATED',
    resource:   'Attendance',
    resourceId: record._id,
    metadata: {
      courseId: record.courseId,
      date:     record.date,
    },
  });

  return updated;
};

// ── GET /api/attendance/:id  ──────────────────────────────────────────────────
/**
 * Get a single attendance record fully populated.
 */
const getAttendanceById = async (id, user, tenantFilter) => {
  const record = await attendanceRepository.findByIdPopulated(id, tenantFilter);
  if (!record) {
    throw { status: 404, message: 'Attendance record not found' };
  }

  // Teacher: only their own course's attendance
  if (user.role === ROLES.TEACHER) {
    const course = await subjectRepository.findById(record.courseId);
    if (!course || course.teacherId?.toString() !== user._id.toString()) {
      throw { status: 403, message: 'Not authorized to view this record' };
    }
  }

  return record;
};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  getAttendanceById,
};
