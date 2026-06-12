const mongoose = require('mongoose');

/**
 * ReportCard Model — Phase 17
 * ═══════════════════════════════════════════════════════════════════════════════
 * Represents a final, consolidated performance report for a student in a given Exam.
 * Acts as a persistent snapshot so changes in underlying grading logic or deleted 
 * results do not alter historical reports.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const subjectResultSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    marksObtained: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    gradePoint: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
    status: { type: String, default: 'PASS' }, // PASS/FAIL/ABSENT
  },
  { _id: false }
);

const reportCardSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
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

    reportCardNumber: {
      type: String,
      required: true,
      unique: true, // e.g. RC-2026-MID-1234
    },

    // ── Performance Metrics ──────────────────────────────────────────────────
    subjectResults: [subjectResultSchema],

    totalSubjects: { type: Number, required: true },
    totalMarks:    { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    percentage:    { type: Number, required: true },
    overallGrade:  { type: String, required: true },
    overallGPA:    { type: Number, required: true },

    rankInClass:   { type: Number, default: null },
    rankInSection: { type: Number, default: null },

    // ── Attendance ───────────────────────────────────────────────────────────
    attendanceSummary: {
      totalDays: { type: Number, default: 0 },
      present:   { type: Number, default: 0 },
      absent:    { type: Number, default: 0 },
      late:      { type: Number, default: 0 },
    },

    // ── Comments & Promotion ─────────────────────────────────────────────────
    teacherComments: {
      type: String,
      default: '',
    },
    principalComments: {
      type: String,
      default: '',
    },
    promotedToNextClass: {
      type: Boolean,
      default: false,
    },

    // ── Workflow & Locking ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    isLocked: {
      type: Boolean,
      default: false, // Set to true when published
    },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Multi-Tenant Isolation ───────────────────────────────────────────────
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

    // ── Audit ────────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// A student can only have one report card per exam
reportCardSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Dashboard queries
reportCardSchema.index({ studentId: 1, status: 1 });
reportCardSchema.index({ classId: 1, sectionId: 1, examId: 1 });
reportCardSchema.index({ instituteId: 1, branchId: 1 });

module.exports = mongoose.model('ReportCard', reportCardSchema);
