const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    monthlyPrice: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: 0,
    },
    yearlyPrice: {
      type: Number,
      required: [true, 'Yearly price is required'],
      min: 0,
    },
    studentLimit: {
      type: Number,
      required: [true, 'Student limit is required'],
      min: 1,
    },
    teacherLimit: {
      type: Number,
      required: [true, 'Teacher limit is required'],
      min: 1,
    },
    branchLimit: {
      type: Number,
      required: [true, 'Branch limit is required'],
      min: 1,
    },
    storageLimit: {
      type: Number, // in GB
      required: [true, 'Storage limit is required (in GB)'],
      min: 1,
    },
    features: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    
    // Audit fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Soft delete middleware
planSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Plan', planSchema);
