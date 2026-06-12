const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'ASSIGNMENT_CREATED',
        'ASSIGNMENT_DUE',
        'ABSENCE_ALERT',
        'NEW_RESULT',
        'REPORT_CARD_PUBLISHED',
        'FEE_DUE',
        'FEE_PAID',
        'GENERAL',
      ],
      default: 'GENERAL',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionLink: {
      type: String,
      default: '',
    },
    channels: {
      type: [String],
      enum: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'],
      default: ['IN_APP'],
    },
    
    // Multi-tenant isolation
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
    
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Exclude soft-deleted by default
notificationSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
