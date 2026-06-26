const mongoose = require('mongoose');

/**
 * ACADEMIC SESSION MODEL
 *
 * Represents an academic year / term / semester.
 * Belongs to an Institute (not Branch-level).
 * All subsequent academic entities (Class, Section, Course, Exam, etc.)
 * must reference a valid, ACTIVE session.
 *
 * Examples: "2025-2026", "Spring 2026", "Fall 2026", "Semester 1 – 2026"
 */
const academicSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Session code is required'],
      uppercase: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },

    // ── Multi-Tenant Fields ──────────────────────────────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: [true, 'Institute ID is required'],
    },
    // branchId is intentionally null — sessions are institute-level
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },

    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING',
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Audit Fields ─────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Soft Delete ──────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Compound Indexes ────────────────────────────────────────────────────
// Unique code per institute (different institutes can reuse codes)
academicSessionSchema.index({ code: 1, instituteId: 1 }, { unique: true });
academicSessionSchema.index({ instituteId: 1, status: 1 });
academicSessionSchema.index({ startDate: 1, endDate: 1 });

// ── Soft Delete Query Middleware ────────────────────────────────────────
academicSessionSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// ── Virtual: Duration (days) ────────────────────────────────────────────
academicSessionSchema.virtual('durationDays').get(function () {
  if (this.startDate && this.endDate) {
    return Math.ceil(
      (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  return null;
});

academicSessionSchema.virtual('isCurrent').get(function () {
  return this.status === 'ACTIVE';
});

academicSessionSchema.set('toJSON', { virtuals: true });
academicSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
