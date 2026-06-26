import React, { useState } from 'react';
import {
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useGetPaymentsQuery,
  useRecordPaymentMutation,
  useGetUsersQuery,
  useGetSessionsQuery,
  useGetBranchesQuery,
  useGetClassesQuery,
} from '../../app/api/coreApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectTenantContext } from '../../app/authSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { toast } from 'react-hot-toast';
import { Plus, Wallet, FileText, CheckCircle2, History, Trash2, X } from 'lucide-react';
import dayjs from 'dayjs';

const FEE_TYPES = ['TUITION', 'ADMISSION', 'EXAM', 'LIBRARY', 'TRANSPORT', 'CUSTOM'];
const FREQUENCIES = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CARD', 'OTHER'];

const emptyItem = () => ({ type: 'TUITION', label: '', amount: '' });

export default function FeesPage() {
  const currentUser  = useSelector(selectCurrentUser);
  const tenant       = useSelector(selectTenantContext);
  const isAdmin      = ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'BRANCH_ADMIN'].includes(currentUser?.role);

  const [activeTab, setActiveTab] = useState('invoices');

  // ── Fee Structure Form State ─────────────────────────────────────────────────
  const [structModalOpen, setStructModalOpen] = useState(false);
  const [structForm, setStructForm] = useState({
    name: '', frequency: 'MONTHLY', sessionId: '', branchId: '', classId: '',
    items: [emptyItem()],
  });

  // ── Invoice Form State ───────────────────────────────────────────────────────
  const [invoiceModalOpen, setInvoiceModalOpen]   = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '', feeStructureId: '', sessionId: '', dueDate: '',
    billingMonth: '', billingYear: new Date().getFullYear(),
  });

  // ── Payment Modal State ──────────────────────────────────────────────────────
  const [payModalOpen, setPayModalOpen]     = useState(false);
  const [payingInvoice, setPayingInvoice]   = useState(null);
  const [paymentMethod, setPaymentMethod]   = useState('CASH');
  const [paymentRef, setPaymentRef]         = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: structsResponse, isLoading: structsLoading, refetch: refetchStructs } = useGetFeeStructuresQuery({});
  const { data: invoicesResponse, isLoading: invoicesLoading, refetch: refetchInvoices } = useGetInvoicesQuery({});
  const { data: paymentsResponse, isLoading: paymentsLoading } = useGetPaymentsQuery({});
  const { data: studentsResponse } = useGetUsersQuery({ role: 'STUDENT', limit: 200 });
  const { data: sessionsResponse } = useGetSessionsQuery({ limit: 50 });
  const { data: branchesResponse } = useGetBranchesQuery({ limit: 50 });
  const { data: classesResponse }  = useGetClassesQuery({ limit: 100 });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const [createStruct,  { isLoading: isCreatingStruct }]   = useCreateFeeStructureMutation();
  const [createInvoice, { isLoading: isCreatingInvoice }]  = useCreateInvoiceMutation();
  const [recordPayment, { isLoading: isPaying }]           = useRecordPaymentMutation();

  const structures = structsResponse?.data || [];
  const invoices   = invoicesResponse?.data || [];
  const payments   = paymentsResponse?.data || [];
  const students   = studentsResponse?.data?.docs || studentsResponse?.data || [];
  const sessions   = sessionsResponse?.data || [];
  const branches   = branchesResponse?.data || [];
  const classes    = classesResponse?.data || [];

  // ── Fee Structure Handlers ───────────────────────────────────────────────────
  const handleOpenCreateStruct = () => {
    setStructForm({
      name: '', frequency: 'MONTHLY',
      sessionId: sessions[0]?._id || '',
      branchId:  branches[0]?._id || tenant?.branchId || '',
      classId:   '',
      items: [emptyItem()],
    });
    setStructModalOpen(true);
  };

  const handleStructItemChange = (idx, field, value) => {
    setStructForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const handleAddStructItem  = () => setStructForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const handleRemoveStructItem = (idx) => {
    if (structForm.items.length === 1) return;
    setStructForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const onStructSubmit = async (e) => {
    e.preventDefault();
    if (!structForm.name.trim())     { toast.error('Fee structure name is required'); return; }
    if (!structForm.sessionId)       { toast.error('Academic session is required');   return; }
    if (!structForm.branchId && !tenant?.branchId) { toast.error('Branch is required'); return; }

    const invalidItem = structForm.items.find(i => !i.label.trim() || !i.amount);
    if (invalidItem) { toast.error('All fee items must have a label and amount'); return; }

    const payload = {
      name:        structForm.name,
      frequency:   structForm.frequency,
      sessionId:   structForm.sessionId,
      branchId:    structForm.branchId || tenant?.branchId,
      instituteId: tenant?.instituteId || currentUser?.instituteId,
      classId:     structForm.classId || undefined,
      items: structForm.items.map(i => ({
        type:   i.type,
        label:  i.label,
        amount: Number(i.amount),
      })),
    };

    try {
      await createStruct(payload).unwrap();
      toast.success('Fee structure created successfully!');
      setStructModalOpen(false);
      refetchStructs();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.errors?.[0]?.msg || 'Failed to create fee structure');
    }
  };

  // ── Invoice Handlers ─────────────────────────────────────────────────────────
  const handleOpenCreateInvoice = () => {
    setInvoiceForm({
      studentId: '', feeStructureId: '', sessionId: sessions[0]?._id || '',
      dueDate: '', billingMonth: '', billingYear: new Date().getFullYear(),
    });
    setInvoiceModalOpen(true);
  };

  const onInvoiceSubmit = async (e) => {
    e.preventDefault();
    const { studentId, feeStructureId, sessionId, dueDate } = invoiceForm;
    if (!studentId)       { toast.error('Please select a student');             return; }
    if (!feeStructureId)  { toast.error('Please select a fee structure');        return; }
    if (!sessionId)       { toast.error('Please select an academic session');    return; }
    if (!dueDate)         { toast.error('Due date is required');                 return; }

    // Derive branchId/instituteId from the selected fee structure
    const selectedStruct = structures.find(s => s._id === feeStructureId);

    const payload = {
      studentId,
      feeStructureId,
      sessionId,
      dueDate,
      branchId:    selectedStruct?.branchId?._id || selectedStruct?.branchId || tenant?.branchId,
      instituteId: selectedStruct?.instituteId?._id || selectedStruct?.instituteId || tenant?.instituteId || currentUser?.instituteId,
      billingMonth: invoiceForm.billingMonth ? Number(invoiceForm.billingMonth) : undefined,
      billingYear:  Number(invoiceForm.billingYear),
    };

    try {
      await createInvoice(payload).unwrap();
      toast.success('Fee invoice generated!');
      setInvoiceModalOpen(false);
      refetchInvoices();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.errors?.[0]?.msg || 'Invoice generation failed');
    }
  };

  // ── Payment Handlers ─────────────────────────────────────────────────────────
  const handleOpenPayModal = (invoice) => {
    setPayingInvoice(invoice);
    setPaymentMethod('CASH');
    setPaymentRef('');
    setPayModalOpen(true);
  };

  const handlePay = async () => {
    if (!payingInvoice) return;
    try {
      await recordPayment({
        invoiceId:  payingInvoice._id,
        amount:     payingInvoice.balance || payingInvoice.totalAmount,
        paymentMethod,
        transactionReference: paymentRef || undefined,
      }).unwrap();
      toast.success('Payment recorded successfully!');
      setPayModalOpen(false);
      refetchInvoices();
    } catch (err) {
      toast.error(err?.data?.message || 'Payment failed');
    }
  };

  // ── Table Column Definitions ─────────────────────────────────────────────────
  const statusColors = {
    PAID:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    PARTIAL:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    OVERDUE:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-slate-100 text-[var(--color-text-secondary)] dark:bg-slate-800 dark:text-slate-400',
    WAIVED:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const invoiceColumns = [
    { header: 'Invoice #',     cell: ({ row }) => <span className="font-mono text-xs text-[var(--color-primary-pink)]">{row.original.invoiceNumber || '—'}</span> },
    { header: 'Student',       cell: ({ row }) => row.original.studentId?.name || 'N/A' },
    { header: 'Fee Plan',      cell: ({ row }) => row.original.feeStructureId?.name || 'N/A' },
    { header: 'Total',         cell: ({ row }) => `PKR ${(row.original.totalAmount || 0).toLocaleString()}` },
    { header: 'Paid',          cell: ({ row }) => `PKR ${(row.original.amountPaid || 0).toLocaleString()}` },
    { header: 'Balance',       cell: ({ row }) => `PKR ${(row.original.balance || 0).toLocaleString()}` },
    { header: 'Due Date',      cell: ({ row }) => dayjs(row.original.dueDate).format('DD MMM YYYY') },
    {
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[s] || ''}`}>{s}</span>;
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const inv = row.original;
        const canPay = !['PAID', 'CANCELLED', 'WAIVED'].includes(inv.status);
        return (
          <div className="flex gap-2">
            {isAdmin && canPay && (
              <Button onClick={() => handleOpenPayModal(inv)} variant="success" size="sm" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const structColumns = [
    { header: 'Plan Name',  accessorKey: 'name' },
    { header: 'Frequency',  accessorKey: 'frequency' },
    { header: 'Session',    cell: ({ row }) => row.original.sessionId?.name || 'N/A' },
    { header: 'Branch',     cell: ({ row }) => row.original.branchId?.name || 'N/A' },
    { header: 'Class',      cell: ({ row }) => row.original.classId?.name || 'All Classes' },
    {
      header: 'Total Amount',
      cell: ({ row }) => {
        const total = (row.original.items || []).reduce((s, i) => s + i.amount, 0);
        return `PKR ${total.toLocaleString()}`;
      },
    },
    {
      header: 'Items',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-secondary)]">{row.original.items?.length || 0} item(s)</span>
      ),
    },
  ];

  const paymentColumns = [
    { header: 'Receipt #',  cell: ({ row }) => <span className="font-mono text-xs">{row.original.receiptNumber || row.original._id?.slice(-8) || '—'}</span> },
    { header: 'Student',    cell: ({ row }) => row.original.invoiceId?.studentId?.name || 'N/A' },
    { header: 'Amount',     cell: ({ row }) => `PKR ${(row.original.amount || 0).toLocaleString()}` },
    { header: 'Method',     accessorKey: 'paymentMethod' },
    { header: 'Date',       cell: ({ row }) => dayjs(row.original.createdAt).format('DD MMM YYYY') },
    { header: 'Reference',  cell: ({ row }) => row.original.transactionReference || '—' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Fee &amp; Ledger Registry</h2>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 gap-0.5">
          {[
            { key: 'invoices',   icon: FileText,  label: 'Student Invoices' },
            ...(isAdmin ? [{ key: 'structures', icon: Wallet, label: 'Fee Structures' }] : []),
            { key: 'payments',   icon: History,   label: 'Payment Logs' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-[var(--color-primary-pink)])] dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Invoices Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleOpenCreateInvoice} className="gap-2">
                <Plus className="w-4 h-4" />
                <span>Generate Invoice</span>
              </Button>
            </div>
          )}
          <Table columns={invoiceColumns} data={invoices} isLoading={invoicesLoading} />
        </div>
      )}

      {/* ── Fee Structures Tab ──────────────────────────────────────────────── */}
      {activeTab === 'structures' && isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleOpenCreateStruct} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>New Fee Structure</span>
            </Button>
          </div>
          <Table columns={structColumns} data={structures} isLoading={structsLoading} />
        </div>
      )}

      {/* ── Payments Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <Table columns={paymentColumns} data={payments} isLoading={paymentsLoading} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Fee Structure Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={structModalOpen} onClose={() => setStructModalOpen(false)} title="Create Fee Structure">
        <form onSubmit={onStructSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              value={structForm.name}
              onChange={e => setStructForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Grade 10 Monthly Tuition"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Billing Frequency
            </label>
            <select
              value={structForm.frequency}
              onChange={e => setStructForm(p => ({ ...p, frequency: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              {FREQUENCIES.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Session */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <select
              value={structForm.sessionId}
              onChange={e => setStructForm(p => ({ ...p, sessionId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select session —</option>
              {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={structForm.branchId}
              onChange={e => setStructForm(p => ({ ...p, branchId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select branch —</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          {/* Class (optional) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Class (optional — leave blank for all classes)
            </label>
            <select
              value={structForm.classId}
              onChange={e => setStructForm(p => ({ ...p, classId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Fee Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Fee Items <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={handleAddStructItem} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-pink)] hover:text-[var(--color-primary-pink)]/80">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {structForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white/5/40 border border-black/5 dark:border-slate-700/60">
                  {/* Type */}
                  <div className="col-span-3">
                    <select
                      value={item.type}
                      onChange={e => handleStructItemChange(idx, 'type', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none"
                    >
                      {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {/* Label */}
                  <div className="col-span-5">
                    <input
                      placeholder="Label (e.g. Monthly Tuition)"
                      value={item.label}
                      onChange={e => handleStructItemChange(idx, 'label', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none"
                    />
                  </div>
                  {/* Amount */}
                  <div className="col-span-3">
                    <input
                      type="number" min="0" placeholder="Amount"
                      value={item.amount}
                      onChange={e => handleStructItemChange(idx, 'amount', e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-xs px-2 py-1.5 outline-none"
                    />
                  </div>
                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => handleRemoveStructItem(idx)} disabled={structForm.items.length === 1}
                      className="p-1 rounded text-red-400 hover:text-[var(--color-status-error)] hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total preview */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5 dark:border-slate-700">
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Total:</span>
              <span className="text-sm font-black text-[var(--color-text-[var(--color-primary-pink)])]">
                PKR {structForm.items.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="button" onClick={() => setStructModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreatingStruct}>Save Fee Structure</Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          Generate Invoice Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Generate Fee Invoice">
        <form onSubmit={onInvoiceSubmit} className="space-y-4">
          {/* Student */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Student <span className="text-red-500">*</span>
            </label>
            <select
              value={invoiceForm.studentId}
              onChange={e => setInvoiceForm(p => ({ ...p, studentId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select student —</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Fee Structure */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Fee Structure <span className="text-red-500">*</span>
            </label>
            <select
              value={invoiceForm.feeStructureId}
              onChange={e => setInvoiceForm(p => ({ ...p, feeStructureId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select fee plan —</option>
              {structures.map(s => {
                const total = (s.items || []).reduce((a, i) => a + i.amount, 0);
                return <option key={s._id} value={s._id}>{s.name} — PKR {total.toLocaleString()}</option>;
              })}
            </select>
            {structures.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                ⚠ No fee structures found. Please create one first in the "Fee Structures" tab.
              </p>
            )}
          </div>

          {/* Session */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <select
              value={invoiceForm.sessionId}
              onChange={e => setInvoiceForm(p => ({ ...p, sessionId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select session —</option>
              {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceForm.dueDate}
              onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Billing Month / Year (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Billing Month (optional)
              </label>
              <select
                value={invoiceForm.billingMonth}
                onChange={e => setInvoiceForm(p => ({ ...p, billingMonth: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none"
              >
                <option value="">— None —</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Billing Year
              </label>
              <input
                type="number"
                value={invoiceForm.billingYear}
                onChange={e => setInvoiceForm(p => ({ ...p, billingYear: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none"
              />
            </div>
          </div>

          {/* Invoice preview */}
          {invoiceForm.feeStructureId && (() => {
            const sel = structures.find(s => s._id === invoiceForm.feeStructureId);
            if (!sel) return null;
            return (
              <div className="bg-white/5/40 border border-black/5 dark:border-slate-700 rounded-lg p-3">
                <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Invoice Preview</p>
                {(sel.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="font-bold">PKR {item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-sm mt-2 pt-2 border-t border-black/5 dark:border-slate-600">
                  <span>Total</span>
                  <span>PKR {(sel.items || []).reduce((a, i) => a + i.amount, 0).toLocaleString()}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="button" onClick={() => setInvoiceModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreatingInvoice}>Generate Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          Record Payment Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Record Payment">
        {payingInvoice && (
          <div className="space-y-4">
            {/* Invoice summary */}
            <div className="bg-white/5/40 border border-black/5 dark:border-slate-700 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Invoice</span><span className="font-mono font-bold">{payingInvoice.invoiceNumber}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Student</span><span className="font-semibold">{payingInvoice.studentId?.name}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Total</span><span className="font-semibold">PKR {(payingInvoice.totalAmount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Paid</span><span className="font-semibold text-[var(--color-status-success)]">PKR {(payingInvoice.amountPaid || 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-black/5 dark:border-slate-700 pt-1 mt-1">
                <span className="font-bold">Balance Due</span>
                <span className="font-black text-[var(--color-primary-pink)]">PKR {(payingInvoice.balance || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Transaction Reference (optional)
              </label>
              <input
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. Cheque #12345"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
              <Button type="button" onClick={() => setPayModalOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={handlePay} isLoading={isPaying} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
