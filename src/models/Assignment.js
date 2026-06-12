const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an assignment title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Please add a due date'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Please add maximum marks'],
      default: 100,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'CLOSED'],
      default: 'DRAFT',
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
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
  { timestamps: true }
);

// Basic indexes
assignmentSchema.index({ courseId: 1, status: 1 });
assignmentSchema.index({ instituteId: 1, branchId: 1 });
assignmentSchema.index({ teacherId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
