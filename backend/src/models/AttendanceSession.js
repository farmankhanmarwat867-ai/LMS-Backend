const mongoose = require('mongoose');
const crypto   = require('crypto');

/**
 * AttendanceSession Model — Phase 13 (QR Attendance)
 * ═══════════════════════════════════════════════════════════════════════════════
 * One document = one QR session opened by a teacher for a course.
 *
 * Lifecycle:  ACTIVE → CLOSED | EXPIRED
 *
 * Security design:
 *   • qrToken  — cryptographically secure 64-char hex (crypto.randomBytes(32))
 *   • expiresAt — enforced at scan time (default 15 min, configurable)
 *   • scannedStudents — prevents the same student scanning twice (unique array)
 *   • branchId  — student's branch must match session's branch
 *   • Enrollment check done in service layer
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const attendanceSessionSchema = new mongoose.Schema(
  {
    // ── Which course & who opened the session ──────────────────────────────
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Course',
      required: [true, 'courseId is required'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: [true, 'teacherId is required'],
    },

    // ── QR Token (secure random hex, 64 chars) ─────────────────────────────
    qrToken: {
      type:     String,
      required: true,
      unique:   true,
      default:  () => crypto.randomBytes(32).toString('hex'),
    },

    // ── Timing ─────────────────────────────────────────────────────────────
    generatedAt: {
      type:    Date,
      default: Date.now,
    },
    expiresAt: {
      type:     Date,
      required: true,
    },

    // ── Session State ──────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['ACTIVE', 'CLOSED', 'EXPIRED'],
      default: 'ACTIVE',
    },

    // ── Class context ──────────────────────────────────────────────────────
    date: {
      type:     Date,
      required: true,
    },
    topic: {
      type:    String,
      default: '',
      trim:    true,
    },

    // ── One-scan-per-student enforcement ───────────────────────────────────
    scannedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
      },
    ],

    // ── Link to the Attendance record this session populates ───────────────
    attendanceId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Attendance',
      default: null,
    },

    // ── Academic hierarchy (denormalized from Course) ──────────────────────
    classId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Class',
      default: null,
    },
    sectionId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Section',
      default: null,
    },

    // ── Multi-Tenant Isolation ─────────────────────────────────────────────
    instituteId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Institute',
      required: true,
    },
    branchId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Branch',
      default: null,
    },

    // ── Audit ──────────────────────────────────────────────────────────────
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    updatedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Soft Delete ────────────────────────────────────────────────────────
    isActive:  { type: Boolean, default: true  },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null  },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
attendanceSessionSchema.index({ courseId: 1, status: 1 });       // active session check
attendanceSessionSchema.index({ teacherId: 1, status: 1 });      // teacher dashboard
attendanceSessionSchema.index({ instituteId: 1, branchId: 1 });  // tenant queries
attendanceSessionSchema.index({ expiresAt: 1 });                 // TTL expiry queries

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
