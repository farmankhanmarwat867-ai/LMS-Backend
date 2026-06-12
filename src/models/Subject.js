const mongoose = require('mongoose');

/**
 * SUBJECT MODEL (Phase 7)
 *
 * Represents an Academic Subject / Course Subject.
 * Belongs to an Institute and Branch.
 *
 * Examples: "Mathematics", "Physics", "Chemistry", "English"
 */
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      uppercase: true,
      trim: true,
    },

    // ── Multi-Tenant Fields ──────────────────────────────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: [true, 'Institute ID is required'],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
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
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Compound Indexes ────────────────────────────────────────────────────
// A subject code must be unique within a specific branch
subjectSchema.index({ code: 1, branchId: 1 }, { unique: true });

// ── Soft Delete Query Middleware ────────────────────────────────────────
subjectSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Subject', subjectSchema);
