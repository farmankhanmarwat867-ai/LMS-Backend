const mongoose = require('mongoose');

/**
 * Exam Model — Phase 14
 * ═══════════════════════════════════════════════════════════════════════════════
 * This acts as a container for exams.
 * Example: "Mid Term 2026" for Class 10 Section A.
 * 
 * Later (Phase 15/16), this will connect to `ExamSchedule` and `Results`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    examCode: {
      type: String,
      required: [true, 'Exam code is required'],
      trim: true,
      unique: true, // e.g. MID-2026, QUIZ-001
    },
    examType: {
      type: String,
      required: [true, 'Exam type is required'],
      enum: [
        'QUIZ',
        'MONTHLY',
        'MID_TERM',
        'FINAL',
        'MOCK',
        'PRACTICAL',
        'CUSTOM',
      ],
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SCHEDULED',
        'ONGOING',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'DRAFT',
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
examSchema.index({ instituteId: 1, branchId: 1 });
examSchema.index({ sessionId: 1, classId: 1, sectionId: 1 });
examSchema.index({ status: 1 });

// Soft-Delete Query Filter
examSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Exam', examSchema);
