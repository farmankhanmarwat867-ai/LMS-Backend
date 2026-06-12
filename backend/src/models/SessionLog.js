const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    loginAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SessionLog', sessionLogSchema);
