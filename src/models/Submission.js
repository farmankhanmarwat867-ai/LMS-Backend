const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submissionText: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    marksObtained: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'GRADED'],
      default: 'SUBMITTED',
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

// One submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ instituteId: 1, branchId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
