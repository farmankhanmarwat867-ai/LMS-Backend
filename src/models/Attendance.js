const mongoose = require('mongoose');

/**
 * Attendance Model — Phase 12
 * ═══════════════════════════════════════════════════════════════════════════════
 * One record = one attendance session (a teacher taking roll for a course on a date).
 * Each record contains an `attendees` array — one entry per enrolled student.
 *
 * Design decisions:
 *  - One document per course per date (avoids thousands of single-student docs)
 *  - Embedded attendees array keeps reads fast (load one doc, get all students)
 *  - `recordedBy` is always the teacher/admin who marked attendance
 *  - Tenant isolation via instituteId + branchId (required)
 *  - Soft delete (isDeleted / deletedAt) for audit compliance
 *  - Unique index on { courseId, date } prevents duplicate roll-calls
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Embedded sub-schema: one entry per student ───────────────────────────────
const attendeeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
      default: 'ABSENT',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }   // sub-docs don't need their own _id
);

// ── Main Attendance schema ────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema(
  {
    // ── What class & when ──────────────────────────────────────────────────
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },

    // ── Topic / session note (optional context for the class) ──────────────
    topic: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Embedded roll-call list ────────────────────────────────────────────
    attendees: {
      type: [attendeeSchema],
      default: [],
    },

    // ── Who recorded it ───────────────────────────────────────────────────
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Academic hierarchy (denormalized for fast queries) ─────────────────
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },

    // ── Multi-Tenant Isolation ─────────────────────────────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },

    // ── Audit ──────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Soft Delete ────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Prevent duplicate attendance for the same course on the same date
attendanceSchema.index({ courseId: 1, date: 1 }, { unique: true });

// Fast per-tenant queries
attendanceSchema.index({ instituteId: 1, branchId: 1, date: -1 });

// Fast lookup by who recorded it
attendanceSchema.index({ recordedBy: 1 });

// Fast student-level queries (sparse, because attendees is embedded)
attendanceSchema.index({ 'attendees.studentId': 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
