const mongoose = require('mongoose');

/**
 * SECTION MODEL (Phase 6)
 *
 * Represents a Section within a Class.
 * Belongs to an Institute, Branch, and Class.
 *
 * Examples: "A", "B", "C", "Morning", "Evening"
 */
const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      uppercase: true, // Standardize section names like "A", "B"
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
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
// A section name must be unique within a specific class
sectionSchema.index({ name: 1, classId: 1 }, { unique: true });

// ── Soft Delete Query Middleware ────────────────────────────────────────
sectionSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Section', sectionSchema);
