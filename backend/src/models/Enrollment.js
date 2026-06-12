const mongoose = require('mongoose');

// ── Auto-incrementing Enrollment Counter ──────────────────────────────────────
// Uses a separate counter collection to generate sequential IDs per year
const counterSchema = new mongoose.Schema({
  _id:  { type: String, required: true },
  seq:  { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const generateEnrollmentNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `enrollment_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  // Zero-pad to 4 digits: ENR-2026-0001
  return `ENR-${year}-${String(counter.seq).padStart(4, '0')}`;
};

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    // ── Snapshot Fields (stored at enrollment time for fast reporting) ──────
    courseTitle: { type: String, required: true },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Academic Hierarchy (copied from Course at enrollment time) ──────────
    classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class',           required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section',         required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },

    // ── Multi-Tenant Isolation ──────────────────────────────────────────────
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch',    required: true },

    // ── Enrollment Number (sequential, e.g. ENR-2026-0001) ─────────────────
    enrollmentNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // ── Timeline ───────────────────────────────────────────────────────────
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: null,
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['ACTIVE', 'DROPPED', 'COMPLETED'],
      default: 'ACTIVE',
    },

    // ── Audit Fields ──────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Soft Delete ───────────────────────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Prevent duplicate enrollment (same student + course)
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
// Fast lookups by course, student, tenant
enrollmentSchema.index({ courseId: 1, isDeleted: 1 });
enrollmentSchema.index({ studentId: 1, isDeleted: 1 });
enrollmentSchema.index({ instituteId: 1, branchId: 1 });
enrollmentSchema.index({ teacherId: 1 });

// ── Soft-Delete Query Filter ──────────────────────────────────────────────────
enrollmentSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
module.exports.generateEnrollmentNumber = generateEnrollmentNumber;
