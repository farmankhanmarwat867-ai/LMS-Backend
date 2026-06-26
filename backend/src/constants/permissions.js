const { ROLES } = require('./roles');

/**
 * Permission Map — what each role can do
 * Used by the RBAC & Permission middleware
 */
const PERMISSIONS = {
  // ─── Auth ───────────────────────────────────────────
  'auth:login': Object.values(ROLES),
  'auth:register': [ROLES.SUPER_ADMIN],
  'auth:change-password': Object.values(ROLES),
  'auth:logout': Object.values(ROLES),
  'auth:refresh-token': Object.values(ROLES),
  'auth:me': Object.values(ROLES),

  // ─── Plans ──────────────────────────────────────────
  'plans:create': [ROLES.SUPER_ADMIN],
  'plans:read': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN],
  'plans:update': [ROLES.SUPER_ADMIN],
  'plans:delete': [ROLES.SUPER_ADMIN],

  // ─── Institutes ─────────────────────────────────────
  'institutes:create': [ROLES.SUPER_ADMIN],
  'institutes:read': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  'institutes:update': [ROLES.SUPER_ADMIN],
  'institutes:suspend': [ROLES.SUPER_ADMIN],
  'institutes:activate': [ROLES.SUPER_ADMIN],

  // ─── Branches ───────────────────────────────────────
  'branches:create': [ROLES.INSTITUTE_ADMIN],
  'branches:read': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'branches:update': [ROLES.INSTITUTE_ADMIN],
  'branches:delete': [ROLES.INSTITUTE_ADMIN],
  'branches:status': [ROLES.INSTITUTE_ADMIN],

  // ─── Sessions (Phase 4) ─────────────────────────────
  'sessions:create': [ROLES.INSTITUTE_ADMIN],
  'sessions:read': Object.values(ROLES),
  'sessions:update': [ROLES.INSTITUTE_ADMIN],
  'sessions:delete': [ROLES.INSTITUTE_ADMIN],
  'sessions:status': [ROLES.INSTITUTE_ADMIN],

  // ─── Classes (Phase 5) ──────────────────────────────
  'classes:create': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'classes:read': Object.values(ROLES),
  'classes:update': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'classes:delete': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],

  // ─── Sections (Phase 6) ─────────────────────────────
  'sections:create': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'sections:read': Object.values(ROLES),
  'sections:update': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'sections:delete': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],

  // ─── Subjects (Phase 7) ─────────────────────────────
  'subjects:create': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'subjects:read': Object.values(ROLES),
  'subjects:update': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'subjects:delete': [ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],

  // ─── Users ──────────────────────────────────────────
  'users:create': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'users:read': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER],
  'users:update': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'users:delete': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN],
  'users:status': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],

  // ─── Courses ────────────────────────────────────────
  'courses:create': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],
  'courses:read': Object.values(ROLES),
  'courses:update': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],
  'courses:delete': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],
  'courses:publish': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],

  // ─── Assignments ────────────────────────────────────
  'assignments:create': [ROLES.TEACHER],
  'assignments:read': [ROLES.TEACHER, ROLES.STUDENT, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.PARENT, ROLES.SUPER_ADMIN],
  'assignments:update': [ROLES.TEACHER],
  'assignments:delete': [ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'submissions:create': [ROLES.STUDENT],
  'submissions:read': [ROLES.STUDENT, ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.PARENT, ROLES.SUPER_ADMIN],
  'submissions:update': [ROLES.STUDENT],
  'submissions:grade': [ROLES.TEACHER],

  // ─── Attendance (Phase 12) ───────────────────────────────
  'attendance:create': [ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'attendance:read':   [ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.STUDENT, ROLES.PARENT, ROLES.SUPER_ADMIN],
  'attendance:update': [ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'attendance:delete': [ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'attendance:qr-generate': [ROLES.TEACHER],
  'attendance:qr-scan':     [ROLES.STUDENT],

  // ─── Exams & Results ────────────────────────────────
  'exams:create': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'exams:read': Object.values(ROLES),
  'exams:update': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'exams:delete': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'exam-schedules:create': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'exam-schedules:read': Object.values(ROLES),
  'exam-schedules:update': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'exam-schedules:delete': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],
  'results:create': [ROLES.TEACHER, ROLES.SUPER_ADMIN],
  'results:read': [ROLES.TEACHER, ROLES.BRANCH_ADMIN, ROLES.STUDENT, ROLES.PARENT, ROLES.SUPER_ADMIN],
  'results:update': [ROLES.TEACHER, ROLES.SUPER_ADMIN],

  // ─── Fees ───────────────────────────────────────────
  'fees:create': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],
  'fees:read': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.STUDENT, ROLES.PARENT],
  'fees:update': [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN],

  // ─── Announcements ──────────────────────────────────
  'announcements:create': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER],
  'announcements:read': Object.values(ROLES),
  'announcements:delete': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER],

  // ─── Audit Logs ─────────────────────────────────────
  'audit-logs:read': [ROLES.SUPER_ADMIN],

  // ─── Enrollments (Phase 10) ──────────────────────────────────────────────────
  // STUDENT = Read Only (no self-enrollment allowed in School ERP)
  'enrollments:create': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER],
  'enrollments:read':   Object.values(ROLES),
  'enrollments:update': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEACHER],
  'enrollments:delete': [ROLES.SUPER_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.BRANCH_ADMIN],

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  'dashboard:super': [ROLES.SUPER_ADMIN],
  'dashboard:institute': [ROLES.INSTITUTE_ADMIN],
  'dashboard:branch': [ROLES.BRANCH_ADMIN],
  'dashboard:teacher': [ROLES.TEACHER],
  'dashboard:student': [ROLES.STUDENT],
  'dashboard:parent': [ROLES.PARENT],

  // ─── Parent Portal ──────────────────────────────────────────────────────────
  'parent-portal:read': [ROLES.PARENT],

  // ─── Communications ─────────────────────────────────────────────────────────
  'communications:create': [ROLES.TEACHER, ROLES.PARENT, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'communications:read': Object.values(ROLES),
  'communications:update': [ROLES.TEACHER, ROLES.PARENT, ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
  'communications:delete': [ROLES.BRANCH_ADMIN, ROLES.INSTITUTE_ADMIN, ROLES.SUPER_ADMIN],
};

module.exports = { PERMISSIONS };
