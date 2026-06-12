/**
 * FeeInvoice Model — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * Generated per student per billing cycle.
 * Tracks what is owed, discounts/scholarships, fines, and payment status.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ── Counter helper for Invoice Numbers ────────────────────────────────────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `invoice_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `INV-${year}-${String(counter.seq).padStart(5, '0')}`;
};

// ── Invoice Line Item ─────────────────────────────────────────────────────────
const invoiceItemSchema = new mongoose.Schema(
  {
    feeItemId: { type: mongoose.Schema.Types.ObjectId }, // ref to FeeStructure.items._id
    type:       { type: String, required: true },         // TUITION, EXAM …
    label:      { type: String, required: true },
    amount:     { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// ── Discount / Scholarship Sub-Document ────────────────────────────────────────
const discountSchema = new mongoose.Schema(
  {
    label:       { type: String, required: true },    // "Merit Scholarship", "Sibling Discount"
    type:        { type: String, enum: ['PERCENT', 'FLAT'], default: 'FLAT' },
    value:       { type: Number, required: true, min: 0 }, // % or flat amount
    appliedAmount: { type: Number, default: 0 },           // computed flat deduction
  },
  { _id: true }
);

// ── Fine Sub-Document ─────────────────────────────────────────────────────────
const fineSchema = new mongoose.Schema(
  {
    reason:    { type: String, required: true },
    amount:    { type: Number, required: true, min: 0 },
    addedAt:   { type: Date, default: Date.now },
    addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true }
);

// ── Fee Invoice Schema ────────────────────────────────────────────────────────
const feeInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },

    // ── Associations ─────────────────────────────────────────────────────────
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
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

    // ── Billing Period ────────────────────────────────────────────────────────
    billingMonth: { type: Number, min: 1, max: 12, default: null }, // null for one-time
    billingYear:  { type: Number, default: () => new Date().getFullYear() },
    dueDate:      { type: Date, required: true },

    // ── Line Items ────────────────────────────────────────────────────────────
    items:         { type: [invoiceItemSchema], default: [] },

    // ── Financial Summary ─────────────────────────────────────────────────────
    subtotal:      { type: Number, required: true, min: 0 }, // sum of items
    discounts:     { type: [discountSchema], default: [] },
    totalDiscount: { type: Number, default: 0 },
    fines:         { type: [fineSchema],    default: [] },
    totalFines:    { type: Number, default: 0 },
    totalAmount:   { type: Number, required: true, min: 0 }, // subtotal - discount + fines
    amountPaid:    { type: Number, default: 0, min: 0 },
    balance:       { type: Number, default: 0 },             // totalAmount - amountPaid

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED'],
      default: 'PENDING',
    },

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: { type: String, default: '' },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null },

    // ── Audit ─────────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
feeInvoiceSchema.index({ studentId: 1, sessionId: 1, status: 1 });
feeInvoiceSchema.index({ instituteId: 1, branchId: 1, status: 1 });
feeInvoiceSchema.index({ dueDate: 1, status: 1 });
feeInvoiceSchema.index({ isDeleted: 1 });

// ── Soft-Delete Query Filter ───────────────────────────────────────────────────
feeInvoiceSchema.pre(/^find/, function () {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const FeeInvoice = mongoose.model('FeeInvoice', feeInvoiceSchema);

module.exports = FeeInvoice;
module.exports.generateInvoiceNumber = generateInvoiceNumber;
