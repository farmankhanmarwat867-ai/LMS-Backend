import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetCertificatesQuery,
  useGenerateCertificateMutation,
  useGetUsersQuery,
  useGetCoursesQuery,
  useGetInstitutesQuery,
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import {
  Award,
  Plus,
  Eye,
  Download,
  QrCode,
  Shield,
  CheckCircle,
  Calendar,
  User,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';

const certSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.string().min(1, 'Certificate type is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  courseId: z.string().optional(),
});

const TYPE_LABELS = {
  COURSE_COMPLETION: 'Course Completion',
  MERIT: 'Merit Award',
  PARTICIPATION: 'Participation',
};

const TYPE_COLORS = {
  COURSE_COMPLETION: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  MERIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PARTICIPATION: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

export default function CertificatesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  // Queries
  const { user } = useSelector((state) => state.auth);
  const { data: institutesResponse } = useGetInstitutesQuery({ _id: user?.instituteId }, { skip: !user?.instituteId });
  const instituteName = institutesResponse?.data?.[0]?.name || user?.instituteName || 'EduEnterprise Institute';

  const { data: certsResponse, isLoading, refetch } = useGetCertificatesQuery();
  const { data: studentsResponse } = useGetUsersQuery({ role: 'STUDENT', limit: 200 });
  const { data: coursesResponse } = useGetCoursesQuery({ limit: 200 });

  // Mutations
  const [generateCertificate, { isLoading: isGenerating }] = useGenerateCertificateMutation();

  const certificates = certsResponse?.data || [];
  const students = studentsResponse?.data?.docs || studentsResponse?.data || [];
  const courses = coursesResponse?.data?.docs || coursesResponse?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(certSchema) });

  const certType = watch('type');

  const handleOpenCreate = () => {
    reset({ studentId: '', type: '', title: '', description: '', courseId: '' });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.courseId) delete payload.courseId;
      await generateCertificate(payload).unwrap();
      toast.success('Certificate issued successfully!');
      setModalOpen(false);
      refetch();
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.data?.errors?.[0]?.message ||
        err?.message ||
        'Failed to generate certificate. Please check the form and try again.';
      toast.error(msg);
    }
  };

  // ── PDF Generation ────────────────────────────────────────────────────────────
  const generatePDF = (cert) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const H = 210;

    // Background gradient simulation
    doc.setFillColor(248, 246, 255);
    doc.rect(0, 0, W, H, 'F');

    // Decorative border
    doc.setDrawColor(107, 59, 255);
    doc.setLineWidth(3);
    doc.rect(10, 10, W - 20, H - 20);
    doc.setDrawColor(200, 180, 255);
    doc.setLineWidth(0.8);
    doc.rect(14, 14, W - 28, H - 28);

    // Corner ornaments
    const corners = [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]];
    doc.setDrawColor(107, 59, 255);
    doc.setLineWidth(1.5);
    corners.forEach(([x, y]) => {
      const sx = x === 14 ? 1 : -1;
      const sy = y === 14 ? 1 : -1;
      doc.line(x, y, x + sx * 12, y);
      doc.line(x, y, x, y + sy * 12);
    });

    // Header — Institution name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(140, 100, 220);
    doc.text((instituteName || 'INSTITUTE OF EXCELLENCE').toUpperCase(), W / 2, 30, { align: 'center' });

    // Divider
    doc.setDrawColor(200, 180, 255);
    doc.setLineWidth(0.5);
    doc.line(50, 34, W - 50, 34);

    // Certificate title
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(107, 59, 255);
    doc.text('Certificate of ' + (TYPE_LABELS[cert.type] || cert.type), W / 2, 44, { align: 'center' });

    // Main title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 20, 60);
    const titleLines = doc.splitTextToSize(cert.title || 'Certificate of Achievement', W - 80);
    doc.text(titleLines, W / 2, 66, { align: 'center' });

    // "This is to certify that"
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 70, 100);
    doc.text('This is to certify that', W / 2, 90, { align: 'center' });

    // Student name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(107, 59, 255);
    doc.text(cert.studentId?.name || 'Student Name', W / 2, 104, { align: 'center' });

    // Underline for name
    const nameWidth = doc.getTextWidth(cert.studentId?.name || 'Student Name');
    doc.setDrawColor(107, 59, 255);
    doc.setLineWidth(0.8);
    doc.line((W - nameWidth) / 2, 107, (W + nameWidth) / 2, 107);

    // Description
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 70, 100);
    const descLines = doc.splitTextToSize(cert.description || '', W - 100);
    doc.text(descLines, W / 2, 118, { align: 'center' });

    // Course (if any)
    if (cert.courseId?.title) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 80, 140);
      doc.text(`Course: ${cert.courseId.title}`, W / 2, 135, { align: 'center' });
    }

    // Divider
    doc.setDrawColor(220, 210, 240);
    doc.setLineWidth(0.5);
    doc.line(50, 148, W - 50, 148);

    // Issue date & Cert number
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 100, 160);
    doc.text(`Issue Date: ${dayjs(cert.issueDate).format('MMMM D, YYYY')}`, 60, 158);
    doc.text(`Certificate No: ${cert.certificateNumber || 'N/A'}`, W - 60, 158, { align: 'right' });

    // Signature lines
    doc.setDrawColor(80, 60, 120);
    doc.setLineWidth(0.5);
    doc.line(60, 178, 130, 178);
    doc.line(W - 130, 178, W - 60, 178);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 80, 140);
    doc.text('Authorized Signatory', 95, 184, { align: 'center' });
    doc.text('Institute Director', W - 95, 184, { align: 'center' });

    // Digital seal text (bottom center)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(160, 140, 200);
    doc.text('✦ DIGITALLY VERIFIED & AUTHENTICATED ✦', W / 2, 193, { align: 'center' });

    return doc;
  };

  const handlePreview = (cert) => {
    setSelectedCert(cert);
    setPreviewOpen(true);
  };

  const handleDownloadPDF = (cert) => {
    try {
      const doc = generatePDF(cert);
      doc.save(`Certificate_${cert.studentId?.name || 'Student'}_${cert.certificateNumber || cert._id}.pdf`);
      toast.success('Certificate PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // ── Table Columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Certificate #',
      accessorKey: 'certificateNumber',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {getValue() || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Student',
      accessorKey: 'studentId.name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary-pink)]/10 text-[var(--color-primary-pink)] flex items-center justify-center text-xs font-bold">
            {(row.original.studentId?.name || 'S')[0].toUpperCase()}
          </div>
          <span className="font-medium text-[var(--color-text-[var(--color-primary-pink)])]">
            {row.original.studentId?.name || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Title',
      accessorKey: 'title',
      cell: ({ getValue }) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">{getValue()}</span>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ getValue }) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[getValue()] || 'bg-slate-100 text-slate-600'}`}>
          {TYPE_LABELS[getValue()] || getValue()}
        </span>
      ),
    },
    {
      header: 'Issued On',
      accessorKey: 'issueDate',
      cell: ({ getValue }) => (
        <span className="text-[var(--color-text-secondary)] text-sm">
          {dayjs(getValue()).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      header: 'Issued By',
      accessorKey: 'issuedBy.name',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.original.issuedBy?.name || 'System'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePreview(row.original)}
            variant="secondary"
            size="sm"
            className="gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </Button>
          <Button
            onClick={() => handleDownloadPDF(row.original)}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Total Issued',
      value: certificates.length,
      icon: Award,
      color: 'text-[var(--color-primary-pink)]',
      bg: 'bg-[var(--color-primary-pink)]/10',
    },
    {
      label: 'Course Completion',
      value: certificates.filter((c) => c.type === 'COURSE_COMPLETION').length,
      icon: CheckCircle,
      color: 'text-[var(--color-status-success)]',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
    {
      label: 'Merit Awards',
      value: certificates.filter((c) => c.type === 'MERIT').length,
      icon: Shield,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
    },
    {
      label: 'Participation',
      value: certificates.filter((c) => c.type === 'PARTICIPATION').length,
      icon: QrCode,
      color: 'text-sky-600',
      bg: 'bg-sky-100 dark:bg-sky-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] flex items-center gap-2">
            <Award className="w-6 h-6 text-[var(--color-primary-pink)]" />
            Certificates &amp; Transcripts
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Generate, manage and verify official student certificates
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>Issue Certificate</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-black/5 dark:border-white/5 flex items-center gap-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Issued Certificates
          </h2>
        </div>
        <div className="p-4">
          <Table columns={columns} data={certificates} isLoading={isLoading} />
        </div>
      </div>

      {/* Generate Certificate Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Issue New Certificate">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            id="studentId"
            label="Select Student"
            required
            options={students.map((s) => ({ value: s._id, label: `${s.name} (${s.email})` }))}
            placeholder="Choose a student"
            error={errors.studentId}
            {...register('studentId')}
          />

          <Select
            id="type"
            label="Certificate Type"
            required
            options={[
              { value: 'COURSE_COMPLETION', label: 'Course Completion' },
              { value: 'MERIT', label: 'Merit Award' },
              { value: 'PARTICIPATION', label: 'Participation' },
            ]}
            placeholder="Select type"
            error={errors.type}
            {...register('type')}
          />

          {certType === 'COURSE_COMPLETION' && (
            <Select
              id="courseId"
              label="Related Course (optional)"
              options={courses.map((c) => ({ value: c._id, label: c.title }))}
              placeholder="Select a course"
              error={errors.courseId}
              {...register('courseId')}
            />
          )}

          <Input
            id="title"
            label="Certificate Title"
            required
            placeholder="e.g. Certificate of Excellence in Mathematics"
            error={errors.title}
            {...register('title')}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-text-[var(--color-primary-pink)])] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={3}
              placeholder="Describe the achievement or reason for this certificate..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setModalOpen(false)} variant="outline" type="button">
              Cancel
            </Button>
            <Button type="submit" isLoading={isGenerating} className="gap-2">
              <Award className="w-4 h-4" />
              Issue Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Certificate Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Certificate Preview"
        size="xl"
      >
        {selectedCert && (
          <div className="space-y-6">
            {/* Visual Certificate Card */}
            <div className="relative bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl border-2 border-violet-200 dark:border-violet-800 p-8 text-center overflow-hidden">
              {/* Corner Decorations */}
              <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-violet-400 dark:border-violet-600 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-violet-400 dark:border-violet-600 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-violet-400 dark:border-violet-600 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-violet-400 dark:border-violet-600 rounded-br-lg" />

              {/* Header */}
              <p className="text-xs font-semibold tracking-widest text-violet-500 dark:text-violet-400 uppercase mb-1 text-center truncate px-4" title={instituteName || 'Institute of Excellence'}>
                {(instituteName || 'Institute of Excellence').toUpperCase()}
              </p>
              <p className="text-sm text-violet-400 dark:text-violet-500 italic mb-6 text-center">
                Certificate of {TYPE_LABELS[selectedCert.type] || selectedCert.type}
              </p>

              {/* Award Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Award className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] mb-3">
                {selectedCert.title}
              </h2>

              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                This is to certify that
              </p>

              {/* Student Name */}
              <p className="text-3xl font-bold text-[var(--color-primary-pink)] mb-1">
                {selectedCert.studentId?.name || 'Student'}
              </p>
              <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                {selectedCert.description}
              </p>

              {/* Course (if any) */}
              {selectedCert.courseId?.title && (
                <p className="text-xs text-violet-500 dark:text-violet-400 italic mb-4">
                  Course: {selectedCert.courseId.title}
                </p>
              )}

              {/* Footer details */}
              <div className="flex flex-wrap justify-center gap-6 text-xs text-[var(--color-text-secondary)] mb-6">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {dayjs(selectedCert.issueDate).format('MMMM D, YYYY')}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Issued by: {selectedCert.issuedBy?.name || 'System'}
                </span>
              </div>

              {/* QR & Cert Number */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-4 py-2 border border-black/5 dark:border-slate-700">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    {selectedCert.certificateNumber}
                  </span>
                </div>
                {selectedCert.qrCodeUrl && (
                  <img
                    src={selectedCert.qrCodeUrl}
                    alt="QR Verification Code"
                    className="w-20 h-20 rounded-lg border border-black/5 dark:border-slate-700 mt-2"
                  />
                )}
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                <Award className="w-72 h-72 text-[var(--color-primary-pink)]" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => handleDownloadPDF(selectedCert)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
