const mongoose = require('mongoose');

/**
 * ResultHistory Model — Phase 16
 * ═══════════════════════════════════════════════════════════════════════════════
 * Immutable audit trail of every marks/grade/status change on a Result.
 *
 * Created automatically by result.service.js on every updateResult() call
 * that modifies marksObtained, grade, or status.
 *
 * Required for:
 *  - Schools, Colleges, Universities (regulatory compliance)
 *  - Phase 17 Report Cards
 *  - Phase 18 GPA / Ranking System
 *
 * Design:
 *  - No soft delete — history records are permanent by design
 *  - No updatedAt — changedAt is the immutable timestamp
 *  - Index on resultId for fast lookup per result
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const resultHistorySchema = new mongoose.Schema(
  {
    // ── Reference to parent Result ───────────────────────────────────────────
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result',
      required: [true, 'resultId is required'],
      index: true,
    },

    // ── Marks Before / After ─────────────────────────────────────────────────
    oldMarks: {
      type: Number,
      required: [true, 'oldMarks is required'],
    },
    newMarks: {
      type: Number,
      required: [true, 'newMarks is required'],
    },

    // ── Percentage Before / After ────────────────────────────────────────────
    oldPercentage: {
      type: Number,
      default: 0,
    },
    newPercentage: {
      type: Number,
      default: 0,
    },

    // ── Grade Before / After ─────────────────────────────────────────────────
    oldGrade: {
      type: String,
      required: [true, 'oldGrade is required'],
    },
    newGrade: {
      type: String,
      required: [true, 'newGrade is required'],
    },

    // ── Grade Point Before / After ───────────────────────────────────────────
    oldGradePoint: {
      type: Number,
      default: 0,
    },
    newGradePoint: {
      type: Number,
      default: 0,
    },

    // ── Status Before / After ────────────────────────────────────────────────
    oldStatus: {
      type: String,
      enum: ['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE'],
      required: [true, 'oldStatus is required'],
    },
    newStatus: {
      type: String,
      enum: ['PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE'],
      required: [true, 'newStatus is required'],
    },

    // ── Remarks (optional note on why marks changed) ─────────────────────────
    changeReason: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Who Made the Change ──────────────────────────────────────────────────
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'changedBy is required'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    // ── Multi-Tenant Reference (for fast scoped queries) ─────────────────────
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
  },
  {
    timestamps: false, // changedAt is our explicit immutable timestamp
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
resultHistorySchema.index({ resultId: 1, changedAt: -1 }); // query history by result, newest first
resultHistorySchema.index({ changedBy: 1 });

const ResultHistory = mongoose.model('ResultHistory', resultHistorySchema);
module.exports = ResultHistory;
