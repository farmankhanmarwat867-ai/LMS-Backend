const mongoose = require('mongoose');

/**
 * CLASS MODEL (Phase 5)
 *
 * Represents an academic Class / Grade / Semester Program.
 * Belongs to an Institute, Branch, and Academic Session.
 *
 * Examples: "Grade 1", "Grade 10", "BSCS Semester 1"
 */
const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Class code is required'],
      uppercase: true,
      trim: true,
    },

    // ── Multi-Tenant & Relational Fields ─────────────────────────────────
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic Session ID is required'],
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
// A class code must be unique within a specific branch and session
classSchema.index({ code: 1, branchId: 1, sessionId: 1 }, { unique: true });

// ── Soft Delete Query Middleware ────────────────────────────────────────
classSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Class', classSchema);
