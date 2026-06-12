const mongoose = require('mongoose');

/**
 * ExamSchedule Model — Phase 15
 * ═══════════════════════════════════════════════════════════════════════════════
 * Links a specific Subject/Course to an Exam container.
 * This holds the exact date, time, marks, and room for a test.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const examScheduleSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'examId is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'subjectId is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'courseId is required'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'teacherId is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'classId is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'sectionId is required'],
    },

    // ── Schedule ────────────────────────────────────────────────────────────
    examDate: {
      type: Date,
      required: [true, 'examDate is required'],
    },
    startTime: {
      type: String, // e.g. "09:00 AM"
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: String, // e.g. "12:00 PM"
      required: [true, 'endTime is required'],
    },

    // ── Grading Criteria ────────────────────────────────────────────────────
    totalMarks: {
      type: Number,
      required: [true, 'totalMarks is required'],
      min: [1, 'totalMarks must be at least 1'],
    },
    passingMarks: {
      type: Number,
      required: [true, 'passingMarks is required'],
      min: [0, 'passingMarks cannot be negative'],
    },

    // ── Location & Info ─────────────────────────────────────────────────────
    roomNumber: {
      type: String,
      default: '',
      trim: true,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
    },

    status: {
      type: String,
      enum: ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },

    // ── Multi-Tenant Isolation ──────────────────────────────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },

    // ── Audit & Soft Delete ────────────────────────────────────────────────
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
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
examScheduleSchema.index({ instituteId: 1, branchId: 1 });
examScheduleSchema.index(
  { examId: 1, subjectId: 1, classId: 1, sectionId: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Soft-Delete Query Filter
examScheduleSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
