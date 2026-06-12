/**
 * Fee Service — Phase 19
 * ═══════════════════════════════════════════════════════════════════════════════
 * Business logic for:
 *   • Fee Structure CRUD
 *   • Invoice generation (single / bulk)
 *   • Discount & Fine management
 *   • Payment recording & balance reconciliation
 *   • Parent Portal queries
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const FeeStructure         = require('../models/FeeStructure');
const FeeInvoice           = require('../models/FeeInvoice');
const { generateInvoiceNumber } = require('../models/FeeInvoice');
const Payment              = require('../models/Payment');
const { generateReceiptNumber } = require('../models/Payment');
const User                 = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * computeBalance — recalculate totalDiscount, totalAmount, and balance
 * and update invoice status based on payment.
 */
const recalcInvoice = (invoice) => {
  // Total discount
  invoice.totalDiscount = invoice.discounts.reduce((s, d) => s + (d.appliedAmount || 0), 0);

  // Total fines
  invoice.totalFines = invoice.fines.reduce((s, f) => s + f.amount, 0);

  // Grand total
  invoice.totalAmount = Math.max(0, invoice.subtotal - invoice.totalDiscount + invoice.totalFines);

  // Balance
  invoice.balance = Math.max(0, invoice.totalAmount - invoice.amountPaid);

  // Status
  if (invoice.status === 'CANCELLED' || invoice.status === 'WAIVED') return;
  if (invoice.balance <= 0) invoice.status = 'PAID';
  else if (invoice.amountPaid > 0) invoice.status = 'PARTIAL';
  else if (new Date() > invoice.dueDate) invoice.status = 'OVERDUE';
  else invoice.status = 'PENDING';
};

/**
 * applyDiscount — compute appliedAmount for a discount sub-doc
 */
const applyDiscount = (discount, subtotal) => {
  if (discount.type === 'PERCENT') {
    discount.appliedAmount = parseFloat(((discount.value / 100) * subtotal).toFixed(2));
  } else {
    discount.appliedAmount = discount.value;
  }
  return discount;
};

// ─────────────────────────────────────────────────────────────────────────────
// FEE STRUCTURE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createFeeStructure
 * Creates a new fee structure for a branch/session/class combination.
 */
exports.createFeeStructure = async (body, user) => {
  const structure = new FeeStructure({
    ...body,
    createdBy: user._id,
    updatedBy: user._id,
  });
  await structure.save();
  return structure;
};

/**
 * getFeeStructures
 * Paginated list with optional filters.
 */
exports.getFeeStructures = async (filters = {}, pagination = {}) => {
  const query = { isDeleted: false };
  if (filters.instituteId) query.instituteId = filters.instituteId;
  if (filters.branchId)    query.branchId    = filters.branchId;
  if (filters.sessionId)   query.sessionId   = filters.sessionId;
  if (filters.classId)     query.classId     = filters.classId;

  const page  = parseInt(pagination.page)  || 1;
  const limit = parseInt(pagination.limit) || 10;
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    FeeStructure.find(query)
      .populate('sessionId', 'name year')
      .populate('classId',   'name')
      .populate('branchId',  'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    FeeStructure.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

/**
 * getFeeStructureById
 */
exports.getFeeStructureById = async (id) => {
  const structure = await FeeStructure.findById(id)
    .populate('sessionId', 'name year')
    .populate('classId',   'name')
    .populate('branchId',  'name');
  if (!structure) throw Object.assign(new Error('Fee structure not found'), { statusCode: 404 });
  return structure;
};

/**
 * updateFeeStructure
 */
exports.updateFeeStructure = async (id, body, user) => {
  const structure = await FeeStructure.findById(id);
  if (!structure) throw Object.assign(new Error('Fee structure not found'), { statusCode: 404 });

  const allowed = ['name', 'description', 'items', 'frequency', 'isActive'];
  allowed.forEach((k) => { if (body[k] !== undefined) structure[k] = body[k]; });
  structure.updatedBy = user._id;
  await structure.save();
  return structure;
};

/**
 * deleteFeeStructure — soft delete
 */
exports.deleteFeeStructure = async (id, user) => {
  const structure = await FeeStructure.findById(id);
  if (!structure) throw Object.assign(new Error('Fee structure not found'), { statusCode: 404 });
  structure.isDeleted = true;
  structure.deletedAt = new Date();
  structure.updatedBy = user._id;
  await structure.save();
  return { message: 'Fee structure deleted' };
};

// ─────────────────────────────────────────────────────────────────────────────
// FEE INVOICE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createInvoice
 * Generates an invoice for a student from a fee structure.
 * Supports optional discounts on creation.
 */
exports.createInvoice = async (body, user) => {
  const {
    studentId, feeStructureId, sessionId,
    branchId, instituteId,
    dueDate, billingMonth, billingYear,
    discounts = [], notes = '',
  } = body;

  // Load fee structure
  const structure = await FeeStructure.findById(feeStructureId);
  if (!structure) throw Object.assign(new Error('Fee structure not found'), { statusCode: 404 });

  // Build line items from structure
  const items = structure.items.map((item) => ({
    feeItemId: item._id,
    type:      item.type,
    label:     item.label,
    amount:    item.amount,
  }));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  // Process discounts
  const processedDiscounts = discounts.map((d) => applyDiscount({ ...d }, subtotal));
  const totalDiscount = processedDiscounts.reduce((s, d) => s + d.appliedAmount, 0);
  const totalAmount   = Math.max(0, subtotal - totalDiscount);

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = new FeeInvoice({
    invoiceNumber,
    studentId,
    feeStructureId,
    sessionId,
    instituteId,
    branchId,
    dueDate,
    billingMonth: billingMonth || null,
    billingYear:  billingYear  || new Date().getFullYear(),
    items,
    subtotal,
    discounts:     processedDiscounts,
    totalDiscount,
    totalAmount,
    amountPaid:   0,
    balance:      totalAmount,
    status:       'PENDING',
    notes,
    createdBy: user._id,
    updatedBy: user._id,
  });

  await invoice.save();
  return invoice;
};

/**
 * getInvoices
 * Paginated list with role-aware filtering.
 */
exports.getInvoices = async (filters = {}, pagination = {}, user) => {
  const query = { isDeleted: false };

  // Students/Parents can only see their own
  if (user.role === 'STUDENT') {
    query.studentId = user._id;
  } else if (user.role === 'PARENT') {
    if (!user.parentOf || user.parentOf.length === 0) return { data: [], pagination: {} };
    query.studentId = { $in: user.parentOf };
  } else {
    // Admin/Branch/Teacher filtering
    if (filters.studentId)   query.studentId   = filters.studentId;
    if (filters.instituteId) query.instituteId = filters.instituteId;
    if (filters.branchId)    query.branchId    = filters.branchId;
    if (filters.sessionId)   query.sessionId   = filters.sessionId;
  }

  if (filters.status) query.status = filters.status;

  const page  = parseInt(pagination.page)  || 1;
  const limit = parseInt(pagination.limit) || 10;
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    FeeInvoice.find(query)
      .populate('studentId',      'name email')
      .populate('feeStructureId', 'name frequency')
      .populate('sessionId',      'name year')
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit),
    FeeInvoice.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

/**
 * getInvoiceById
 */
exports.getInvoiceById = async (id, user) => {
  const invoice = await FeeInvoice.findById(id)
    .populate('studentId',      'name email phone')
    .populate('feeStructureId', 'name frequency')
    .populate('sessionId',      'name year');
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });

  // Role check
  if (user.role === 'STUDENT' && String(invoice.studentId._id) !== String(user._id)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  if (user.role === 'PARENT') {
    const childIds = (user.parentOf || []).map(String);
    if (!childIds.includes(String(invoice.studentId._id))) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }
  return invoice;
};

/**
 * addDiscount — add a discount/scholarship to an existing invoice
 */
exports.addDiscount = async (invoiceId, discountBody, user) => {
  const invoice = await FeeInvoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
  if (['PAID', 'CANCELLED'].includes(invoice.status)) {
    throw Object.assign(new Error('Cannot modify a paid or cancelled invoice'), { statusCode: 400 });
  }

  const discount = applyDiscount({ ...discountBody }, invoice.subtotal);
  invoice.discounts.push(discount);
  recalcInvoice(invoice);
  invoice.updatedBy = user._id;
  await invoice.save();
  return invoice;
};

/**
 * addFine — add a fine to an invoice
 */
exports.addFine = async (invoiceId, fineBody, user) => {
  const invoice = await FeeInvoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
  if (['PAID', 'CANCELLED'].includes(invoice.status)) {
    throw Object.assign(new Error('Cannot add fine to a paid or cancelled invoice'), { statusCode: 400 });
  }

  invoice.fines.push({ ...fineBody, addedBy: user._id, addedAt: new Date() });
  recalcInvoice(invoice);
  invoice.updatedBy = user._id;
  await invoice.save();
  return invoice;
};

/**
 * cancelInvoice
 */
exports.cancelInvoice = async (invoiceId, user) => {
  const invoice = await FeeInvoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
  if (invoice.status === 'PAID') {
    throw Object.assign(new Error('Cannot cancel a paid invoice'), { statusCode: 400 });
  }
  invoice.status    = 'CANCELLED';
  invoice.updatedBy = user._id;
  await invoice.save();
  return invoice;
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * recordPayment
 * Records a payment against an invoice and updates the invoice balance.
 */
exports.recordPayment = async (body, user) => {
  const {
    invoiceId, amount, paymentMethod,
    transactionReference = '', remarks = '',
    paymentDate,
  } = body;

  const invoice = await FeeInvoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
  if (['CANCELLED', 'WAIVED'].includes(invoice.status)) {
    throw Object.assign(new Error('Cannot accept payment for cancelled/waived invoice'), { statusCode: 400 });
  }
  if (invoice.balance <= 0) {
    throw Object.assign(new Error('Invoice is already fully paid'), { statusCode: 400 });
  }
  if (amount > invoice.balance) {
    throw Object.assign(new Error(`Payment (${amount}) exceeds outstanding balance (${invoice.balance})`), { statusCode: 400 });
  }

  const receiptNumber = await generateReceiptNumber();

  const payment = new Payment({
    receiptNumber,
    invoiceId,
    studentId:            invoice.studentId,
    instituteId:          invoice.instituteId,
    branchId:             invoice.branchId,
    amount,
    paymentDate:          paymentDate || new Date(),
    paymentMethod,
    transactionReference,
    remarks,
    status:               'VERIFIED',
    collectedBy:          user._id,
    createdBy:            user._id,
    updatedBy:            user._id,
  });

  await payment.save();

  // Update invoice
  invoice.amountPaid += amount;
  recalcInvoice(invoice);
  invoice.updatedBy = user._id;
  await invoice.save();

  return { payment, invoice };
};

/**
 * getPayments
 * Paginated history with role-aware filtering.
 */
exports.getPayments = async (filters = {}, pagination = {}, user) => {
  const query = { isDeleted: false };

  if (user.role === 'STUDENT') {
    query.studentId = user._id;
  } else if (user.role === 'PARENT') {
    if (!user.parentOf || user.parentOf.length === 0) return { data: [], pagination: {} };
    query.studentId = { $in: user.parentOf };
  } else {
    if (filters.studentId)   query.studentId   = filters.studentId;
    if (filters.instituteId) query.instituteId = filters.instituteId;
    if (filters.branchId)    query.branchId    = filters.branchId;
    if (filters.invoiceId)   query.invoiceId   = filters.invoiceId;
  }

  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
  if (filters.status)        query.status        = filters.status;

  const page  = parseInt(pagination.page)  || 1;
  const limit = parseInt(pagination.limit) || 10;
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find(query)
      .populate('studentId', 'name email')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

/**
 * getPaymentById
 */
exports.getPaymentById = async (id, user) => {
  const payment = await Payment.findById(id)
    .populate('studentId', 'name email phone')
    .populate('invoiceId', 'invoiceNumber totalAmount amountPaid balance')
    .populate('collectedBy', 'name');
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });

  if (user.role === 'STUDENT' && String(payment.studentId._id) !== String(user._id)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  if (user.role === 'PARENT') {
    const childIds = (user.parentOf || []).map(String);
    if (!childIds.includes(String(payment.studentId._id))) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }
  return payment;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARENT PORTAL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getParentPortalFeeStatus
 * Returns fee status summary for all children of a parent.
 */
exports.getParentPortalFeeStatus = async (parentId) => {
  const parent = await User.findById(parentId).select('parentOf');
  if (!parent) throw Object.assign(new Error('Parent not found'), { statusCode: 404 });

  const children = parent.parentOf || [];
  if (children.length === 0) return { children: [] };

  const results = await Promise.all(
    children.map(async (childId) => {
      const invoices  = await FeeInvoice.find({ studentId: childId, isDeleted: false })
        .populate('feeStructureId', 'name frequency')
        .sort({ dueDate: -1 })
        .limit(20);

      const paid    = invoices.filter((i) => i.status === 'PAID');
      const pending = invoices.filter((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status));
      const totalDue = pending.reduce((s, i) => s + i.balance, 0);

      const child = await User.findById(childId).select('name email');

      return {
        student: child,
        summary: {
          totalInvoices: invoices.length,
          paid:          paid.length,
          pending:       pending.length,
          totalDue,
        },
        recentInvoices: invoices.slice(0, 5),
      };
    })
  );

  return { children: results };
};
