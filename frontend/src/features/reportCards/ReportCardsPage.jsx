import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetReportCardsQuery,
  useGetStudentReportCardsQuery,
  useGenerateReportCardMutation,
  usePublishReportCardMutation,
  useGetExamsQuery,
  useGetUsersQuery,
  useGetInstitutesQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import PDFPreview from '../../components/common/PDFPreview';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Eye, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';

const reportSchema = z.object({
  examId:    z.string().min(1, 'Exam is required'),
  studentId: z.string().optional(),
  teacherComments: z.string().optional(),
});

export default function ReportCardsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const isStudent = user?.role === 'STUDENT';

  // Queries — students use the student-specific endpoint, others use general list
  const { data: reportsResponse,        isLoading: reportsLoading,  refetch: refetchGeneral } = useGetReportCardsQuery(undefined,        { skip: isStudent });
  const { data: studentReportsResponse, isLoading: studentLoading, refetch: refetchStudent  } = useGetStudentReportCardsQuery(user?._id || user?.id, { skip: !isStudent || !(user?._id || user?.id) });
  const { data: examsResponse }    = useGetExamsQuery({ limit: 100 },             { skip: isStudent });
  const { data: studentsResponse } = useGetUsersQuery({ role: 'STUDENT', limit: 200 }, { skip: isStudent });
  const { data: institutesResponse } = useGetInstitutesQuery({ _id: user?.instituteId }, { skip: !user?.instituteId });

  const refetch = isStudent ? refetchStudent : refetchGeneral;

  // Mutations
  const [generateReportCard, { isLoading: isGenerating }]   = useGenerateReportCardMutation();
  const [publishReportCard,  { isLoading: isPublishingCard }] = usePublishReportCardMutation();

  const handlePublishCard = async (id) => {
    try {
      await publishReportCard(id).unwrap();
      toast.success('Report card published! Students can now view it.');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to publish report card');
    }
  };

  const extractData = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.data && Array.isArray(res.data.docs)) return res.data.docs;
    if (Array.isArray(res.docs)) return res.docs;
    return [];
  };

  const reportCards = isStudent
    ? extractData(studentReportsResponse)
    : extractData(reportsResponse);
  const exams    = examsResponse?.data?.docs || examsResponse?.data || [];
  const students = studentsResponse?.data?.docs || studentsResponse?.data || [];
  const isLoading = isStudent ? studentLoading : reportsLoading;
  
  const schoolName = institutesResponse?.data?.docs?.[0]?.name || institutesResponse?.data?.[0]?.name || user?.instituteName || 'EduEnterprise Educational ERP';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reportSchema),
  });

  const handleOpenCreate = () => {
    reset({ examId: '', studentId: '', teacherComments: '' });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      await generateReportCard(data).unwrap();
      toast.success('Report card compiled successfully!');
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to compile report card');
    }
  };

  // Client-Side PDF Generation Fallback using jsPDF
  const handlePreview = (report) => {
    setSelectedReportCard(report);
    
    try {
      const doc = new jsPDF();
      
      // Document Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(107, 59, 255); // Primary Theme Color
      doc.text(schoolName, 105, 25, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('OFFICIAL ACADEMIC REPORT CARD', 105, 33, { align: 'center' });
      
      doc.setDrawColor(220);
      doc.line(20, 38, 190, 38);

      // Student Meta details
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text(`Student Name: ${report.studentId?.name || 'N/A'}`, 20, 48);
      doc.text(`Email Address: ${report.studentId?.email || 'N/A'}`, 20, 54);
      doc.text(`Academic Session: ${report.sessionId?.name || 'N/A'}`, 120, 48);
      doc.text(`Report Term: ${report.term || 'N/A'}`, 120, 54);

      doc.line(20, 60, 190, 60);

      // Academic Performance Grid
      doc.setFont('Helvetica', 'bold');
      doc.text('Academic Metrics', 20, 70);
      
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total Marks: ${report.totalMarks !== undefined ? report.totalMarks : 'N/A'}`, 20, 80);
      doc.text(`Obtained Marks: ${report.obtainedMarks !== undefined ? report.obtainedMarks : 'N/A'}`, 20, 86);
      doc.text(`Percentage: ${report.percentage !== undefined ? report.percentage.toFixed(1) : 'N/A'}%`, 120, 80);
      doc.text(`Final Grade: ${report.finalGrade || 'N/A'}`, 120, 86);
      doc.text(`Class Rank: #${report.classRank || 'N/A'}`, 120, 92);

      doc.line(20, 100, 190, 100);

      // Teacher comments
      doc.setFont('Helvetica', 'bold');
      doc.text('Remarks & Instructor Comments', 20, 110);
      doc.setFont('Helvetica', 'normal');
      const splitComments = doc.splitTextToSize(report.teacherComments || 'No comments provided.', 150);
      doc.text(splitComments, 20, 118);

      // Signatures
      doc.line(20, 160, 70, 160);
      doc.text('Class Instructor Signature', 20, 166);

      doc.line(140, 160, 190, 160);
      doc.text('Principal Signature', 140, 166);

      const blob = doc.output('blob');
      setPdfBlob(blob);
      setPreviewOpen(true);
    } catch (err) {
      toast.error('Failed to generate PDF preview.');
    }
  };

  const columns = [
    ...(isStudent ? [] : [{ header: 'Student Name', accessorKey: 'studentId.name', cell: ({ row }) => row.original.studentId?.name || 'N/A' }]),
    { header: 'Session', accessorKey: 'sessionId.name', cell: ({ row }) => row.original.sessionId?.name || 'N/A' },
    { header: 'Term', accessorKey: 'term' },
    { header: 'GPA', accessorKey: 'gpa', cell: ({ getValue }) => getValue() !== undefined ? getValue().toFixed(2) : 'N/A' },
    { header: 'Grade', accessorKey: 'finalGrade', cell: ({ getValue }) => <span className="font-extrabold text-[var(--color-primary-pink)]">{getValue() || 'N/A'}</span> },
    { header: 'Rank', accessorKey: 'classRank', cell: ({ getValue }) => getValue() !== undefined ? `#${getValue()}` : 'N/A' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          getValue() === 'PUBLISHED'
            ? 'bg-emerald-500/15 text-[var(--color-status-success)] dark:text-emerald-400'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}>
          {getValue() || 'DRAFT'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button onClick={() => handlePreview(row.original)} variant="secondary" size="sm" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Preview PDF</span>
          </Button>
          {!isStudent && row.original.status !== 'PUBLISHED' && (
            <Button
              onClick={() => handlePublishCard(row.original._id)}
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              isLoading={isPublishingCard}
            >
              <span>Publish</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">
          {isStudent ? 'My Report Cards' : 'Report Cards'}
        </h2>
        {!isStudent && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Compile Report Card</span>
          </Button>
        )}
      </div>

      <Table columns={columns} data={reportCards} isLoading={isLoading} />

      {/* Compile Report Card Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Compile Academic Report Card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <Select
            id="examId"
            label="Select Exam"
            required
            options={exams.map(e => ({ value: e._id, label: `${e.title} (${e.examType || e.examCode || ''})` }))}
            placeholder="Choose Exam"
            error={errors.examId}
            {...register('examId')}
          />

          <Select
            id="studentId"
            label="Student (optional — leave blank to compile for all students)"
            options={[{ value: '', label: '— All Students —' }, ...students.map(s => ({ value: s._id, label: s.name }))]}
            placeholder="All Students"
            error={errors.studentId}
            {...register('studentId')}
          />

          <Input id="teacherComments" label="Teacher Comments & Remarks" placeholder="e.g. Excellent progress this semester..." error={errors.teacherComments} {...register('teacherComments')} />

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-slate-850">
            <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isGenerating}>Compile Report</Button>
          </div>
        </form>
      </Modal>

      {/* PDF Preview Drawer/Modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Report Card PDF Preview" size="xl">
        <PDFPreview
          pdfBlob={pdfBlob}
          downloadName={`ReportCard_${selectedReportCard?.studentId?.name || 'Student'}_${selectedReportCard?.term || 'Term'}.pdf`}
        />
      </Modal>
    </div>
  );
}
