const mongoose = require('mongoose');

/**
 * Result Model — Phase 16
 * ═══════════════════════════════════════════════════════════════════════════════
 * Stores a student's result for a specific ExamSchedule.
 *
 * Architecture: Exam → ExamSchedule → Result → ReportCard → GPA
 *
 * Key Design Decisions:
 *  - References ExamSchedule only (NOT Exam or Subject directly)
 *  - marksObtained validated at service layer (0 <= marks <= totalMarks)
 *  - percentage, grade, gradePoint, status are auto-calculated at service layer
 *  - isPublished lock prevents teacher edits/deletes after admin publishes
 *  - ResultHistory is created on every update for full audit trail
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const resultSchema = new mongoose.Schema(
  {
    // ── Core References ─────────────────────────────────────────────────────
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'studentId is required'],
      index: true,
    },
    examScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      required: [true, 'examScheduleId is required'],
    },

    // ── Academic Placement (denormalized from ExamSchedule for fast queries) ─
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },

    // ── Marks & Calculations ────────────────────────────────────────────────
    marksObtained: {
      type: Number,
      required: [true, 'marksObtained is required'],
      min: [0, 'Marks obtained cannot be less than 0'],
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: 'F',
    },
    /**
     * gradePoint — Phase 17/18 Report Card & GPA ready
     * Scale: A+=4.0, A=3.7, B=3.0, C=2.0, D=1.0, E=0.5, F=0.0
     */
    gradePoint: {
      type: Number,
      default: 0.0,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE'],
      required: [true, 'status is required'],
    },

    // ── Result Locking ──────────────────────────────────────────────────────
    /**
     * Once isPublished=true:
     *  - TEACHER cannot modify marks or delete the result
     *  - Only INSTITUTE_ADMIN or BRANCH_ADMIN can unpublish to unlock
     */
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Multi-Tenant Isolation ──────────────────────────────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // ── Audit Fields ────────────────────────────────────────────────────────
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

    // ── Soft Delete ─────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * Unique compound index — prevents duplicate result for same student + schedule.
 * partialFilterExpression ensures soft-deleted records don't count toward uniqueness.
 */
resultSchema.index(
  { examScheduleId: 1, studentId: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Fast filtering indexes
resultSchema.index({ studentId: 1, isDeleted: 1 });
resultSchema.index({ classId: 1, sectionId: 1, isDeleted: 1 });
resultSchema.index({ instituteId: 1, branchId: 1, isDeleted: 1 });
resultSchema.index({ isPublished: 1 });

// ── Soft-Delete Query Filter ──────────────────────────────────────────────────
resultSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;
