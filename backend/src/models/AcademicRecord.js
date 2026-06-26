const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },

    // ── Aggregated Performance ───────────────────────────────────────────────
    totalExamsTaken: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    obtainedMarks: {
      type: Number,
      default: 0,
    },
    overallPercentage: {
      type: Number,
      default: 0,
    },
    cgpa: {
      type: Number,
      default: 0,
    },

    // ── GPA History (Snapshot per Exam) ──────────────────────────────────────
    gpaHistory: [
      {
        examId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exam',
          required: true,
        },
        reportCardId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ReportCard',
        },
        percentage: { type: Number, required: true },
        gpa: { type: Number, required: true },
        grade: { type: String, required: true },
        dateRecorded: { type: Date, default: Date.now },
      },
    ],

    // ── Dense Rankings ────────────────────────────────────────────────────────
    ranking: {
      classRank: { type: Number, default: null },
      sectionRank: { type: Number, default: null },
      branchRank: { type: Number, default: null },
      instituteRank: { type: Number, default: null },
    },

    // ── Academic Standing ────────────────────────────────────────────────────
    academicStanding: {
      type: String,
      enum: ['HONORS', 'GOOD_STANDING', 'ACADEMIC_WARNING', 'PROBATION'],
      default: 'GOOD_STANDING',
    },

    // ── Status & Locking ──────────────────────────────────────────────────────
    isLocked: {
      type: Boolean,
      default: false,
    },
    lastCalculatedAt: {
      type: Date,
    },

    // ── Standard Fields ──────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Unique record per student per session
academicRecordSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

// Tenant and filtering indexes
academicRecordSchema.index({ instituteId: 1, branchId: 1 });
academicRecordSchema.index({ classId: 1, sectionId: 1 });
academicRecordSchema.index({ cgpa: -1 }); // Fast merit list sorting
academicRecordSchema.index({ 'ranking.instituteRank': 1 });
academicRecordSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
