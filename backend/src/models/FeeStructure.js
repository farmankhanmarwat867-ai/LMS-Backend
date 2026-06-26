/**
 * FeeStructure Model — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * Defines a named fee plan with line items (fee heads).
 * A structure is assigned to a class/section/session combo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ── Fee Item Sub-Schema ────────────────────────────────────────────────────────
const feeItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'TUITION',
        'ADMISSION',
        'EXAM',
        'LIBRARY',
        'TRANSPORT',
        'CUSTOM',
      ],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Monthly Tuition", "Annual Exam Fee", "Bus Route A – Transport Fee"
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    isOptional: {
      // Transport / custom items can be optionally assigned per student
      type: Boolean,
      default: false,
    },
    description: { type: String, default: '' },
  },
  { _id: true }
);

// ── Fee Structure Schema ───────────────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee structure name is required'],
      trim: true,
    },
    description: { type: String, default: '' },

    // ── Scope ─────────────────────────────────────────────────────────────────
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,   // null = applies to entire branch for this session
    },

    // ── Fee Items ─────────────────────────────────────────────────────────────
    items: {
      type: [feeItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one fee item is required',
      },
    },

    // ── Frequency ─────────────────────────────────────────────────────────────
    frequency: {
      type: String,
      enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'],
      default: 'MONTHLY',
    },

    // ── Status ────────────────────────────────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null },

    // ── Audit ─────────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// ── Virtual: totalAmount ───────────────────────────────────────────────────────
feeStructureSchema.virtual('totalAmount').get(function () {
  if (!this.items) return 0;
  return this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
});

feeStructureSchema.set('toJSON', { virtuals: true });
feeStructureSchema.set('toObject', { virtuals: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
feeStructureSchema.index({ instituteId: 1, branchId: 1, sessionId: 1 });
feeStructureSchema.index({ classId: 1, sessionId: 1 });
feeStructureSchema.index({ isDeleted: 1 });

// ── Soft-Delete Query Filter ───────────────────────────────────────────────────
feeStructureSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
