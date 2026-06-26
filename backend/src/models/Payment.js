/**
 * Payment Model — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * Records each payment transaction against a FeeInvoice.
 * Supports partial payments; multiple payments can settle one invoice.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ── Counter for Receipt Numbers ───────────────────────────────────────────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `receipt_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `RCP-${year}-${String(counter.seq).padStart(5, '0')}`;
};

// ── Payment Schema ────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      unique: true,
    },

    // ── Associations ─────────────────────────────────────────────────────────
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeInvoice',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Multi-Tenant ─────────────────────────────────────────────────────────
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

    // ── Payment Details ───────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be positive'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CARD', 'OTHER'],
      required: true,
    },
    transactionReference: {
      // Bank ref / cheque no / online transaction ID
      type: String,
      default: '',
    },
    remarks: { type: String, default: '' },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED', 'REFUNDED'],
      default: 'VERIFIED',
    },

    // ── Refund (if applicable) ────────────────────────────────────────────────
    refundedAt:     { type: Date, default: null },
    refundedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    refundReason:   { type: String, default: '' },

    // ── Audit ─────────────────────────────────────────────────────────────────
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // staff who recorded it
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ studentId: 1, paymentDate: -1 });
paymentSchema.index({ instituteId: 1, branchId: 1, paymentDate: -1 });
paymentSchema.index({ isDeleted: 1 });

// ── Soft-Delete Query Filter ───────────────────────────────────────────────────
paymentSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
module.exports.generateReceiptNumber = generateReceiptNumber;
