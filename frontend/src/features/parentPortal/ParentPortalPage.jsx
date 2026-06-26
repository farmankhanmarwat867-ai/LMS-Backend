import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useGetParentChildrenQuery,
  useGetParentChildAttendanceQuery,
  useGetParentChildAssignmentsQuery,
  useGetParentChildResultsQuery,
  useGetParentChildFeesQuery,
  useGetStudentReportCardsQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import PDFPreview from '../../components/common/PDFPreview';
import { Users, GraduationCap, ClipboardCheck, FileText, Wallet, AlertCircle, CreditCard, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';

export default function ParentPortalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const pathParts = location.pathname.split('/');
  const subPath = pathParts[2] && pathParts[2] !== 'children' ? pathParts[2] : 'attendance';
  const activeSubTab = subPath;

  const setActiveSubTab = (tabId) => {
    navigate(`/parent-portal/${tabId}`);
  };

  const [selectedChildId, setSelectedChildId] = useState('');

  // Parent Portal Queries
  const { data: childrenResponse, isLoading: childrenLoading } = useGetParentChildrenQuery();
  const children = childrenResponse?.data || [];

  // Active Child Context Query
  const { data: attendanceResponse, isLoading: attendanceLoading } = useGetParentChildAttendanceQuery(
    { childId: selectedChildId },
    { skip: !selectedChildId || activeSubTab !== 'attendance' }
  );

  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useGetParentChildAssignmentsQuery(
    { childId: selectedChildId },
    { skip: !selectedChildId || activeSubTab !== 'assignments' }
  );

  const { data: resultsResponse, isLoading: resultsLoading } = useGetParentChildResultsQuery(
    { childId: selectedChildId },
    { skip: !selectedChildId || activeSubTab !== 'results' }
  );

  const { data: feesResponse, isLoading: feesLoading } = useGetParentChildFeesQuery(
    { childId: selectedChildId },
    { skip: !selectedChildId || activeSubTab !== 'fees' }
  );

  const { data: reportCardsResponse, isLoading: reportCardsLoading } = useGetStudentReportCardsQuery(
    selectedChildId,
    { skip: !selectedChildId || activeSubTab !== 'reportCards' }
  );

  const activeChild = children.find(c => c._id === selectedChildId);

  const extractData = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.data && Array.isArray(res.data.docs)) return res.data.docs;
    if (Array.isArray(res.docs)) return res.docs;
    return [];
  };

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  const handlePreview = (report) => {
    try {
      const doc = new jsPDF();
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(107, 59, 255);
      doc.text('Official Report Card', 105, 25, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('ACADEMIC REPORT', 105, 33, { align: 'center' });
      doc.setDrawColor(220);
      doc.line(20, 38, 190, 38);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text(`Student Name: ${report.studentId?.name || activeChild?.name || 'N/A'}`, 20, 48);
      doc.text(`Academic Session: ${report.sessionId?.name || 'N/A'}`, 120, 48);
      doc.text(`Report Term: ${report.term || 'N/A'}`, 120, 54);
      doc.line(20, 60, 190, 60);

      doc.setFont('Helvetica', 'bold');
      doc.text('Academic Metrics', 20, 70);
      
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total Marks: ${report.totalMarks !== undefined ? report.totalMarks : 'N/A'}`, 20, 80);
      doc.text(`Obtained Marks: ${report.obtainedMarks !== undefined ? report.obtainedMarks : 'N/A'}`, 20, 86);
      doc.text(`Percentage: ${report.percentage !== undefined ? report.percentage.toFixed(1) : 'N/A'}%`, 120, 80);
      doc.text(`Final Grade: ${report.finalGrade || 'N/A'}`, 120, 86);
      doc.text(`Class Rank: #${report.classRank || 'N/A'}`, 120, 92);
      doc.line(20, 100, 190, 100);

      doc.setFont('Helvetica', 'bold');
      doc.text('Remarks & Instructor Comments', 20, 110);
      doc.setFont('Helvetica', 'normal');
      const splitComments = doc.splitTextToSize(report.teacherComments || 'No comments provided.', 150);
      doc.text(splitComments, 20, 118);

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

  // Set default selected child once loaded
  React.useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0]._id);
    }
  }, [children, selectedChildId]);

  if (childrenLoading) {
    return <Loader size="lg" className="min-h-[60vh]" />;
  }

  if (children.length === 0) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 max-w-lg mx-auto mt-10">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Children Linked</h3>
        <p className="text-sm text-slate-400 mt-2">
          Your parent profile does not have any student accounts linked to it. Please contact the branch administrator to link your child's profile.
        </p>
      </div>
    );
  }

  // Attendance Columns
  const attendanceColumns = [
    { header: 'Date', accessorKey: 'date', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { 
      header: 'Class & Subject / Topic', 
      id: 'classAndSubject',
      cell: ({ row }) => {
        const className = row.original.classId?.name;
        const subjectName = row.original.courseId?.name;
        const topic = row.original.topic;
        
        let main = 'General';
        if (className && subjectName) main = `Class ${className} - ${subjectName}`;
        else if (className) main = `Class ${className} - General`;
        else if (subjectName) main = subjectName;
        
        return (
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">{main}</div>
            {topic && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{topic}</div>}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
          ABSENT: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400',
          LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400',
          EXCUSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{val}</span>;
      }
    },
    { header: 'Remarks', accessorKey: 'remarks', cell: ({ getValue }) => getValue() || 'N/A' }
  ];

  // Assignments Columns
  const assignmentColumns = [
    { header: 'Title', accessorKey: 'title', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    { header: 'Class & Subject', accessorKey: 'course', cell: ({ getValue }) => getValue() || 'N/A' },
    { header: 'Due Date', accessorKey: 'dueDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { header: 'Max Marks', accessorKey: 'maxMarks' },
    { header: 'Marks Obtained', accessorKey: 'marksObtained', cell: ({ getValue }) => getValue() !== null && getValue() !== undefined ? getValue() : '-' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          OVERDUE: 'bg-rose-100 text-rose-800 dark:bg-rose-950/20',
          PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20',
          SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/20',
          GRADED: 'bg-purple-100 text-purple-800 dark:bg-purple-950/20',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val] || 'bg-slate-100 text-slate-800'}`}>{val}</span>;
      }
    }
  ];

  // Results Columns
  const resultColumns = [
    { header: 'Exam Container', accessorKey: 'examScheduleId.examId.title', cell: ({ row }) => row.original.examScheduleId?.examId?.title || 'N/A' },
    { header: 'Subject', accessorKey: 'examScheduleId.subjectId.name', cell: ({ row }) => row.original.examScheduleId?.subjectId?.name || 'N/A' },
    { header: 'Marks Obtained', cell: ({ row }) => `${row.original.marksObtained} / ${row.original.examScheduleId?.totalMarks || 100}` },
    { header: 'Calculated Grade', accessorKey: 'grade', cell: ({ getValue }) => <span className="font-black text-primary">{getValue() || 'N/A'}</span> },
    {
      header: 'Standing',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getValue() === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {getValue()}
        </span>
      )
    }
  ];

  // Report Cards Columns
  const reportCardColumns = [
    { header: 'Session', accessorKey: 'sessionId.name', cell: ({ row }) => row.original.sessionId?.name || 'N/A' },
    { header: 'Term', accessorKey: 'term' },
    { header: 'Grade', accessorKey: 'finalGrade', cell: ({ getValue }) => <span className="font-extrabold text-primary">{getValue() || 'N/A'}</span> },
    { header: 'Rank', accessorKey: 'classRank', cell: ({ getValue }) => getValue() !== undefined ? `#${getValue()}` : 'N/A' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          {getValue() || 'PUBLISHED'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button onClick={() => handlePreview(row.original)} variant="secondary" size="sm" className="gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          <span>Preview PDF</span>
        </Button>
      ),
    }
  ];

  // Fees Columns
  const feeColumns = [
    { header: 'Invoice Code', accessorKey: 'invoiceNumber', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() || 'N/A'}</span> },
    { header: 'Amount Due', cell: ({ row }) => `$${row.original.totalAmount || row.original.amount || 0}` },
    { header: 'Due Date', accessorKey: 'dueDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    {
      header: 'Payment Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          PAID: 'bg-emerald-100 text-emerald-800',
          UNPAID: 'bg-red-100 text-red-800',
          OVERDUE: 'bg-amber-100 text-amber-800',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val]}`}>{val}</span>;
      }
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          onClick={() => {
            if (row.original.status === 'PAID') {
              toast.success('This invoice is already paid.');
            } else {
              toast('Online payment gateway integration coming soon!', { icon: '💳' });
            }
          }}
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={row.original.status === 'PAID'}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pay Now</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Kid selection header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-805 dark:text-slate-100">Parent Dashboard</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Linked Child: <span className="font-bold text-slate-700 dark:text-slate-200">{activeChild?.name}</span></p>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Switch Child profile</label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          >
            {children.map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Child Dashboard tabs */}
      {selectedChildId && (
        <div className="space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
            {[
              { id: 'attendance', label: 'Attendance logs', icon: ClipboardCheck },
              { id: 'assignments', label: 'Homework & Work', icon: FileText },
              { id: 'results', label: 'Grades & Results', icon: GraduationCap },
              { id: 'reportCards', label: 'Report Cards', icon: FileText },
              { id: 'fees', label: 'Fees Invoices', icon: Wallet },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                    activeSubTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Subviews */}
          {activeSubTab === 'attendance' && (
            <Table
              columns={attendanceColumns}
              data={attendanceResponse?.data?.history || []}
              isLoading={attendanceLoading}
            />
          )}

          {activeSubTab === 'assignments' && (
            <Table
              columns={assignmentColumns}
              data={extractData(assignmentsResponse)}
              isLoading={assignmentsLoading}
            />
          )}

          {activeSubTab === 'results' && (
            <Table
              columns={resultColumns}
              data={extractData(resultsResponse)}
              isLoading={resultsLoading}
            />
          )}

          {activeSubTab === 'reportCards' && (
            <Table
              columns={reportCardColumns}
              data={extractData(reportCardsResponse)}
              isLoading={reportCardsLoading}
            />
          )}

          {activeSubTab === 'fees' && (
            <Table
              columns={feeColumns}
              data={extractData(feesResponse)}
              isLoading={feesLoading}
            />
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPdfBlob(null); }}
        title="Report Card Preview"
        size="5xl"
      >
        <PDFPreview pdfBlob={pdfBlob} downloadName={`ReportCard_${activeChild?.name?.replace(/\s+/g, '_') || 'Student'}.pdf`} />
      </Modal>
    </div>
  );
}
