const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: { type: String, default: '' },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN', 'LOGOUT', 'REGISTER',
        'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE',
        'STATUS_CHANGE', 'ROLE_CHANGE',
        'PASSWORD_CHANGE', 'TOKEN_REFRESH',
        'PLAN_CHANGE', 'BILLING_EVENT',
        'SUSPEND', 'ACTIVATE',
        'ENROLLMENT_CREATED', 'ENROLLMENT_DROPPED',
        'ENROLLMENT_COMPLETED', 'ENROLLMENT_REACTIVATED',
        'ENROLLMENT_DELETED',
        'ASSIGNMENT_CREATED', 'ASSIGNMENT_PUBLISHED', 'ASSIGNMENT_CLOSED',
        'SUBMISSION_CREATED', 'SUBMISSION_UPDATED', 'SUBMISSION_GRADED',
        // ── Phase 12: Attendance ─────────────────────────────────────────
        'ATTENDANCE_CREATED',   // Teacher marks attendance for a session
        'ATTENDANCE_UPDATED',   // Teacher edits an existing attendance record
        'ATTENDANCE_DELETED',   // Soft-deleted by admin
        // ── Phase 13: QR Attendance ──────────────────────────────────────
        'ATTENDANCE_SESSION_CREATED',
        'ATTENDANCE_SESSION_CLOSED',
        'ATTENDANCE_QR_SCANNED',
        // ── Phase 14: Exams ──────────────────────────────────────────────
        'EXAM_CREATED',
        'EXAM_UPDATED',
        'EXAM_SCHEDULED',
        'EXAM_CANCELLED',
        'EXAM_COMPLETED',
        // ── Phase 15: ExamSchedules ──────────────────────────────────────
        'EXAM_SCHEDULE_CREATED',
        'EXAM_SCHEDULE_UPDATED',
        'EXAM_SCHEDULE_DELETED',
        'EXAM_SCHEDULE_CANCELLED',
        'EXAM_SCHEDULE_COMPLETED',
        // ── Phase 16: Results ────────────────────────────────────────────
        'RESULT_CREATED',         // Single result created
        'RESULT_UPDATED',         // Result marks/remarks updated
        'RESULT_DELETED',         // Result soft-deleted
        'RESULT_BULK_CREATED',    // Bulk upload completed
        'RESULT_STATUS_CHANGED',  // Status changed (PASS→FAIL, etc.)
        'RESULT_PUBLISHED',       // Result locked/published by admin
        'RESULT_UNPUBLISHED',     // Result unlocked/unpublished by admin
        // ── Phase 17: Report Cards ───────────────────────────────────────
        'REPORT_CARD_GENERATED',
        'REPORT_CARD_UPDATED',
        'REPORT_CARD_COMMENT_ADDED',
        'REPORT_CARD_PUBLISHED',
        'REPORT_CARD_UNPUBLISHED',
        'REPORT_CARD_DOWNLOADED',
        'ACADEMIC_RECORDS_CALCULATED',
      ],
    },
    resource: { type: String, default: '' },
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    ipAddress: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
