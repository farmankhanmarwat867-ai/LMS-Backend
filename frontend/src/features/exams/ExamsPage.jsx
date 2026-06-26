import React, { useState, useEffect } from 'react';
import {
  useGetExamsQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamSchedulesQuery,
  useCreateExamScheduleMutation,
  useUpdateExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useGetSessionsQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetCoursesQuery,
  useGetUsersQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { 
  Plus, Edit2, Trash2, Calendar, BookOpen, FileText,
  GraduationCap, CalendarClock, School, Phone, Globe, Clock, Quote,
  Percent, FlaskConical, Atom, Dna, Computer, Languages, Award, Shield,
  Mail
} from 'lucide-react';
import dayjs from 'dayjs';
import ConfirmModal from '../../components/common/ConfirmModal';
import { jsPDF } from 'jspdf';

const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [addr.street, addr.city, addr.state, addr.country]
      .filter(p => p && p.trim() !== '');
    return parts.join(', ');
  }
  return '';
};

const examSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  examCode: z.string().min(1, 'Exam Code is required'),
  examType: z.enum(['QUIZ', 'MONTHLY', 'MID_TERM', 'FINAL', 'MOCK', 'PRACTICAL', 'CUSTOM']),
  sessionId: z.string().min(1, 'Session is required'),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().min(1, 'Section is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
});

const scheduleSchema = z.object({
  examId: z.string().min(1, 'Exam is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().min(1, 'Section is required'),
  examDate: z.string().min(1, 'Exam date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  totalMarks: z.coerce.number().int().min(1),
  passingMarks: z.coerce.number().int().min(0),
  roomNumber: z.string().optional(),
});

const getSubjectIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('math') || n.includes('algebra') || n.includes('geometry') || n.includes('percent') || n.includes('calculus')) return Percent;
  if (n.includes('physics') || n.includes('science')) return Atom;
  if (n.includes('chem') || n.includes('flask')) return FlaskConical;
  if (n.includes('bio') || n.includes('microscope') || n.includes('life') || n.includes('dna')) return Dna;
  if (n.includes('computer') || n.includes('code') || n.includes('cs') || n.includes('program')) return Computer;
  if (n.includes('history') || n.includes('social') || n.includes('geography') || n.includes('pakistan')) return Globe;
  if (n.includes('english') || n.includes('urdu') || n.includes('lang') || n.includes('islam') || n.includes('arabic')) return Languages;
  return BookOpen;
};

const getSubjectBg = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('math')) return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50';
  if (n.includes('physics')) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50';
  if (n.includes('chem')) return 'bg-purple-50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50';
  if (n.includes('bio')) return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50';
  if (n.includes('computer')) return 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50';
  return 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50';
};

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' or 'schedules'
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [editingSched, setEditingSched] = useState(null);

  const [deleteExamModalOpen, setDeleteExamModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  const [deleteSchedModalOpen, setDeleteSchedModalOpen] = useState(false);
  const [schedToDelete, setSchedToDelete] = useState(null);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassSectionKey, setSelectedClassSectionKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Queries
  const { data: examsResponse, isLoading: examsLoading } = useGetExamsQuery();
  const { data: schedsResponse, isLoading: schedsLoading } = useGetExamSchedulesQuery();
  const { data: sessionsResponse } = useGetSessionsQuery({ limit: 100 });
  const { data: classesResponse } = useGetClassesQuery({ limit: 100 });
  const { data: sectionsResponse } = useGetSectionsQuery({ limit: 100 });
  const { data: subjectsResponse } = useGetSubjectsQuery({ limit: 100 });
  const { data: coursesResponse } = useGetCoursesQuery({ limit: 100 });
  const { data: teachersResponse } = useGetUsersQuery({ role: 'TEACHER', limit: 100 });

  // Mutations
  const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();
  const [updateExam, { isLoading: isUpdatingExam }] = useUpdateExamMutation();
  const [deleteExam, { isLoading: isDeletingExam }] = useDeleteExamMutation();

  const [createSched, { isLoading: isCreatingSched }] = useCreateExamScheduleMutation();
  const [updateSched, { isLoading: isUpdatingSched }] = useUpdateExamScheduleMutation();
  const [deleteSched, { isLoading: isDeletingSched }] = useDeleteExamScheduleMutation();

  const exams = examsResponse?.data || [];
  const schedules = schedsResponse?.data || [];
  const sessions = sessionsResponse?.data || [];
  const classes = classesResponse?.data || [];
  const sections = sectionsResponse?.data || [];
  const subjects = subjectsResponse?.data || [];
  const courses = coursesResponse?.data || [];
  const teachers = teachersResponse?.data?.docs || teachersResponse?.data || [];

  // Get unique exams present in schedules
  const uniqueExams = [];
  const seenExams = new Set();
  schedules.forEach(s => {
    const eid = s.examId?._id;
    if (eid && !seenExams.has(eid)) {
      seenExams.add(eid);
      uniqueExams.push({
        id: eid,
        title: s.examId?.title || 'N/A'
      });
    }
  });

  // Get unique class + section combinations present in schedules
  const uniqueClassSections = [];
  const seenCombos = new Set();
  schedules.forEach(s => {
    const cid = s.classId?._id;
    const sid = s.sectionId?._id;
    if (cid && sid) {
      const key = `${cid}_${sid}`;
      if (!seenCombos.has(key)) {
        seenCombos.add(key);
        uniqueClassSections.push({
          classId: cid,
          sectionId: sid,
          className: s.classId?.name || 'N/A',
          sectionName: s.sectionId?.name || 'N/A',
          label: `${s.classId?.name || 'N/A'} - ${s.sectionId?.name || 'N/A'}`
        });
      }
    }
  });

  // Auto-select first options if not set
  useEffect(() => {
    if (schedules.length > 0) {
      if (!selectedExamId && uniqueExams.length > 0) {
        setSelectedExamId(uniqueExams[0].id);
      }
      if (!selectedClassSectionKey && uniqueClassSections.length > 0) {
        setSelectedClassSectionKey(`${uniqueClassSections[0].classId}_${uniqueClassSections[0].sectionId}`);
      }
    }
  }, [schedules, uniqueExams.length, uniqueClassSections.length]);

  // Filtered schedules
  const filteredSchedules = schedules.filter(s => {
    const matchExam = selectedExamId ? s.examId?._id === selectedExamId : true;
    const matchClassSection = selectedClassSectionKey
      ? `${s.classId?._id}_${s.sectionId?._id}` === selectedClassSectionKey
      : true;
    return matchExam && matchClassSection;
  });

  const showHeaderInfo = selectedExamId && selectedClassSectionKey && filteredSchedules.length > 0;

  // Form Hooks
  const {
    register: registerExam,
    handleSubmit: handleExamSubmit,
    reset: resetExam,
    formState: { errors: examErrors },
  } = useForm({ resolver: zodResolver(examSchema) });

  const {
    register: registerSched,
    handleSubmit: handleSchedSubmit,
    reset: resetSched,
    formState: { errors: schedErrors },
  } = useForm({ resolver: zodResolver(scheduleSchema) });

  // Handlers for Exams
  const handleOpenCreateExam = () => {
    setEditingExam(null);
    resetExam({ title: '', examCode: '', examType: 'FINAL', sessionId: '', classId: '', sectionId: '', startDate: '', endDate: '', status: 'DRAFT' });
    setExamModalOpen(true);
  };

  const handleOpenEditExam = (exam) => {
    setEditingExam(exam);
    resetExam({
      title: exam.title,
      examCode: exam.examCode,
      examType: exam.examType,
      sessionId: exam.sessionId?._id || exam.sessionId || '',
      classId: exam.classId?._id || exam.classId || '',
      sectionId: exam.sectionId?._id || exam.sectionId || '',
      startDate: dayjs(exam.startDate).format('YYYY-MM-DD'),
      endDate: dayjs(exam.endDate).format('YYYY-MM-DD'),
      status: exam.status,
    });
    setExamModalOpen(true);
  };

  const onExamSubmit = async (data) => {
    try {
      if (editingExam) {
        await updateExam({ id: editingExam._id, ...data }).unwrap();
        toast.success('Exam details updated successfully!');
      } else {
        await createExam(data).unwrap();
        toast.success('Exam created successfully!');
      }
      setExamModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleOpenDeleteExam = (exam) => {
    setExamToDelete(exam);
    setDeleteExamModalOpen(true);
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await deleteExam(examToDelete._id).unwrap();
      toast.success('Exam deleted!');
      setDeleteExamModalOpen(false);
      setExamToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  // Handlers for Schedules
  const handleOpenCreateSched = () => {
    setEditingSched(null);
    resetSched({ examId: '', subjectId: '', teacherId: '', classId: '', sectionId: '', examDate: '', startTime: '09:00 AM', endTime: '12:00 PM', totalMarks: 100, passingMarks: 40, roomNumber: '' });
    setSchedModalOpen(true);
  };

  const handleOpenEditSched = (sched) => {
    setEditingSched(sched);
    resetSched({
      examId: sched.examId?._id || sched.examId || '',
      subjectId: sched.subjectId?._id || sched.subjectId || '',
      teacherId: sched.teacherId?._id || sched.teacherId || '',
      classId: sched.classId?._id || sched.classId || '',
      sectionId: sched.sectionId?._id || sched.sectionId || '',
      examDate: dayjs(sched.examDate).format('YYYY-MM-DD'),
      startTime: sched.startTime,
      endTime: sched.endTime,
      totalMarks: sched.totalMarks,
      passingMarks: sched.passingMarks,
      roomNumber: sched.roomNumber || '',
    });
    setSchedModalOpen(true);
  };

  const onSchedSubmit = async (data) => {
    try {
      if (editingSched) {
        await updateSched({ id: editingSched._id, ...data }).unwrap();
        toast.success('Exam schedule updated successfully!');
      } else {
        await createSched(data).unwrap();
        toast.success('Exam schedule registered successfully!');
      }
      setSchedModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const handleOpenDeleteSched = (sched) => {
    setSchedToDelete(sched);
    setDeleteSchedModalOpen(true);
  };

  const handleConfirmDeleteSched = async () => {
    if (!schedToDelete) return;
    try {
      await deleteSched(schedToDelete._id).unwrap();
      toast.success('Schedule slot deleted!');
      setDeleteSchedModalOpen(false);
      setSchedToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  const handleDownloadPDF = async () => {
    if (filteredSchedules.length === 0) {
      toast.error('No schedules available to download.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const activeBranch = filteredSchedules[0]?.branchId;
    const activeInst = filteredSchedules[0]?.instituteId;

    const branchName = activeBranch?.name || activeInst?.name || 'Sahibzada School';
    const className = `${filteredSchedules[0]?.classId?.name || 'N/A'} - ${filteredSchedules[0]?.sectionId?.name || 'N/A'}`;
    const examTitle = filteredSchedules[0]?.examId?.title || 'Exam Term';
    const effectiveDate = dayjs(filteredSchedules[0]?.examDate).format('DD MMMM YYYY');

    // ── 1. Top Header Section ──────────────────────────────────────────────
    // Logo Shield or Image
    const logoUrl = activeInst?.logo;
    let logoImg = null;
    if (logoUrl) {
      try {
        logoImg = await loadImage(logoUrl);
      } catch (err) {
        console.error('Failed to load institute logo for PDF:', err);
      }
    }

    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 15, 15, 12, 12);
    } else {
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(15, 15, 12, 12, 'F');
      // Draw white inner design in shield
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.6);
      doc.line(18, 20, 21, 24);
      doc.line(21, 24, 24, 18);
    }

    // School Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text((branchName || 'EDUCORE').toUpperCase(), 30, 21);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('EXCELLENCE THROUGH EDUCATION', 30, 25);

    // Contact details (Right side, right aligned)
    const addressText = formatAddress(activeBranch?.address) || formatAddress(activeInst?.address) || 'Main Campus, Rawalpindi';
    const phoneText = `Phone: ${activeBranch?.phone || activeInst?.phone || '051-1234567'}`;
    const emailText = `Email: ${activeBranch?.email || activeInst?.email || 'info@educore.edu.pk'}`;

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(addressText, 195, 19, { align: 'right' });
    doc.text(phoneText, 195, 22.5, { align: 'right' });
    doc.text(emailText, 195, 26, { align: 'right' });

    // Green Divider Line
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.8);
    doc.line(15, 30, 195, 30);

    // ── 2. Timetable Sub-Bar ───────────────────────────────────────────────
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 30, 54); // dark navy
    doc.text(`${(examTitle || 'EXAM').toUpperCase()} TIMETABLE`, 15, 39);

    // Session Badge
    const sessionName = filteredSchedules[0]?.examId?.sessionId?.name || 'Fall 2026';
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(165, 34, 30, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Session: ${sessionName}`, 168.5, 38.5);

    // ── 3. Metadata Badges (Rounded rectangles) ───────────────────────────
    const badgeY = 46;
    const badgeW = 57;
    const badgeH = 10;
    const badgeGap = 4;

    // Badge 1: Class
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(15, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('CLASS & SECTION', 18, badgeY + 3.5);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(className, 18, badgeY + 7.5);

    // Badge 2: Exam Term
    doc.roundedRect(15 + badgeW + badgeGap, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('EXAM CONTAINER', 18 + badgeW + badgeGap, badgeY + 3.5);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(examTitle, 18 + badgeW + badgeGap, badgeY + 7.5);

    // Badge 3: Effective Date
    doc.roundedRect(15 + (badgeW * 2) + (badgeGap * 2), badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('EFFECTIVE DATE', 18 + (badgeW * 2) + (badgeGap * 2), badgeY + 3.5);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(effectiveDate, 18 + (badgeW * 2) + (badgeGap * 2), badgeY + 7.5);

    // ── 4. Table Grid ──────────────────────────────────────────────────────
    const tableTop = 62;
    // Table Header Background (#0F1E36)
    doc.setFillColor(15, 30, 54);
    doc.roundedRect(15, tableTop, 180, 8, 1.5, 1.5, 'F');
    // Reset rounded bottom corners by drawing a small overlap rect
    doc.rect(15, tableTop + 5, 180, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DATE & DAY', 18, tableTop + 5.5);
    doc.text('SUBJECT / COURSE', 60, tableTop + 5.5);
    doc.text('TIME SLOT', 105, tableTop + 5.5);
    doc.text('ROOM', 140, tableTop + 5.5);
    doc.text('TOTAL/PASS', 157, tableTop + 5.5);
    doc.text('INVIGILATOR', 178, tableTop + 5.5);

    // Body Rows
    let currentY = tableTop + 8;
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.4);

    filteredSchedules.forEach((s, idx) => {
      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.rect(15, currentY, 180, 9, 'F');
      
      // Bottom border for row
      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY + 9, 195, currentY + 9);

      const dateStr = dayjs(s.examDate).format('DD MMM, YYYY');
      const dayStr = dayjs(s.examDate).format('dddd');
      const subjectStr = s.subjectId?.name || 'N/A';
      const timeStr = `${s.startTime} - ${s.endTime}`;
      const roomStr = s.roomNumber || 'N/A';
      const marksStr = `${s.totalMarks}/${s.passingMarks}`;
      const teacherStr = s.teacherId?.name || 'N/A';

      // Date Text (bold date, normal day)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(dateStr, 18, currentY + 5.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(dayStr, 18, currentY + 8);

      // Subject Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(subjectStr, 60, currentY + 5.5);

      // Time Slot
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(timeStr, 105, currentY + 5.5);

      // Room
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(roomStr, 140, currentY + 5.5);

      // Marks
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(marksStr, 157, currentY + 5.5);

      // Teacher / Invigilator
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(teacherStr, 178, currentY + 5.5);

      currentY += 9;
    });

    // ── 5. Sheet Footer ────────────────────────────────────────────────────
    const footerY = currentY + 15;
    
    // Notes block (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Important Instructions:', 15, footerY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('• Please reach the examination room at least 15 minutes early.', 15, footerY + 3.5);
    doc.text('• Mobile phones and study materials are strictly prohibited.', 15, footerY + 6.5);

    // Quote box (Middle)
    doc.setFillColor(240, 253, 250); // emerald-50
    doc.setDrawColor(204, 251, 241); // emerald-100
    doc.roundedRect(88, footerY - 3, 50, 11, 1, 1, 'FD');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('"Discipline Today, Success Tomorrow."', 90.5, footerY + 4);

    // Principal Signature Line (Right)
    doc.setFont('courier', 'bolditalic'); // Handwritten script fallback style
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Controller', 165, footerY + 1);

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(160, footerY + 3, 195, footerY + 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('CONTROLLER OF EXAMINATIONS', 160, footerY + 6.5);

    // Generated on info (Bottom center)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${dayjs().format('DD MMM, YYYY HH:mm A')} | EduEnterprise LMS`, 15, footerY + 18);

    // Save File
    const fileName = `timetable_${className.replace(/\s+/g, '')}_${dayjs().format('YYYYMMDD')}.pdf`;
    doc.save(fileName);
    toast.success('Timetable PDF downloaded successfully!');
  };

  const examColumns = [
    { header: 'Exam Code', accessorKey: 'examCode' },
    { header: 'Exam Name', accessorKey: 'title', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    { header: 'Class', accessorKey: 'classId.name', cell: ({ row }) => row.original.classId?.name || 'N/A' },
    { header: 'Type', accessorKey: 'examType' },
    { header: 'Start Date', accessorKey: 'startDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          DRAFT: 'bg-amber-100 text-amber-800',
          SCHEDULED: 'bg-blue-100 text-blue-800',
          ONGOING: 'bg-emerald-100 text-emerald-800',
          COMPLETED: 'bg-slate-100 text-[var(--color-text-secondary)]',
          CANCELLED: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[val]}`}>{val}</span>;
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => handleOpenEditExam(row.original)} variant="secondary" size="sm">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenDeleteExam(row.original)} variant="danger" size="sm">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const schedColumns = [
    { header: 'Exam Container', accessorKey: 'examId.title', cell: ({ row }) => row.original.examId?.title || 'N/A' },
    { header: 'Class', cell: ({ row }) => `${row.original.classId?.name || 'N/A'} - ${row.original.sectionId?.name || 'N/A'}` },
    { header: 'Subject', accessorKey: 'subjectId.name', cell: ({ row }) => row.original.subjectId?.name || 'N/A' },
    { header: 'Exam Date', accessorKey: 'examDate', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY') },
    { header: 'Time Slot', cell: ({ row }) => `${row.original.startTime} - ${row.original.endTime}` },
    { header: 'Room', accessorKey: 'roomNumber', cell: ({ getValue }) => getValue() || 'N/A' },
    { header: 'Total/Pass', cell: ({ row }) => `${row.original.totalMarks} / ${row.original.passingMarks}` },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => handleOpenEditSched(row.original)} variant="secondary" size="sm">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenDeleteSched(row.original)} variant="danger" size="sm">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const renderCardChart = (idx, exam) => {
    const chartType = idx % 4;

    if (chartType === 0) {
      return (
        <div className="w-full space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold">
            <span>Pilot completion rate</span>
            <span className="text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">70%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>
      );
    } else if (chartType === 1) {
      return (
        <div className="flex items-center gap-3 w-full pl-2">
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100 dark:text-[var(--color-text-[var(--color-primary-pink)])]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-emerald-400" strokeDasharray="50, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute text-[9px] font-mono font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">50%</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold block uppercase leading-none">Pilot group</span>
            <span className="text-xs font-bold text-emerald-500 mt-1 block">Active</span>
          </div>
        </div>
      );
    } else if (chartType === 2) {
      return (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="relative w-24 h-12 overflow-hidden flex items-end justify-center">
            <svg className="w-full h-full" viewBox="0 0 100 50">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-850" strokeWidth="7" strokeLinecap="round" />
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gauge-grad)" strokeWidth="7" strokeDasharray="80, 126" strokeLinecap="round" />
              <line x1="50" y1="50" x2="72" y2="28" stroke="currentColor" className="text-slate-700 dark:text-slate-200" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="3.5" stroke="currentColor" className="text-slate-750 dark:text-slate-250" />
              <defs>
                <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-full">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100 dark:text-[var(--color-text-[var(--color-primary-pink)])]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-indigo-400" strokeDasharray="40, 100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-purple-400" strokeDasharray="25, 100" strokeDashoffset="-40" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-yellow-400" strokeDasharray="15, 100" strokeDashoffset="-65" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] uppercase tracking-tight">Exam Container</h2>
        
        {/* Toggle tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'exams'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-[var(--color-primary-pink)])]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" /> Exams Container
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'schedules'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-[var(--color-primary-pink)])]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Exam Timetables
          </button>
        </div>
      </div>

      {activeTab === 'exams' ? (
        <div className="space-y-6">
          {/* Exam Overview Statistics Bar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-405 dark:text-[var(--color-text-secondary)] uppercase tracking-wider">
              Exam Overview
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg text-blue-500 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold block uppercase tracking-wider">Total Exams</span>
                  <span className="text-lg font-black text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white mt-0.5 block leading-none">{exams.length}</span>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-[var(--color-status-success)] dark:text-emerald-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold block uppercase tracking-wider">Ongoing</span>
                  <span className="text-lg font-black text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white mt-0.5 block leading-none">
                    {exams.filter(e => e.status === 'ONGOING').length}
                  </span>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold block uppercase tracking-wider">Scheduled</span>
                  <span className="text-lg font-black text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white mt-0.5 block leading-none">
                    {exams.filter(e => e.status === 'SCHEDULED').length}
                  </span>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg text-amber-500 dark:text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold block uppercase tracking-wider">Drafts</span>
                  <span className="text-lg font-black text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white mt-0.5 block leading-none">
                    {exams.filter(e => e.status === 'DRAFT').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {examsLoading ? (
            <div className="flex justify-center items-center py-12">
              <span className="text-sm font-medium text-slate-400">Loading exams...</span>
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <span className="text-sm font-medium text-slate-400">No exams configured yet.</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {exams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((e, idx) => {
                  const statusColors = {
                    DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/10',
                    SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/10',
                    ONGOING: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/10',
                    COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-[var(--color-primary-pink)]/50/10 dark:text-slate-400 border border-slate-500/20 dark:border-slate-500/10',
                    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-500/20 dark:border-red-500/10',
                  };

                  return (
                    <div 
                      key={e._id} 
                      className="glass-card/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300 group/card"
                    >
                      <div>
                        {/* Title */}
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white tracking-tight text-base group-hover/card:text-emerald-500 dark:group-hover/card:text-emerald-400 transition-colors">
                            {e.title}
                          </h4>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400 dark:text-[var(--color-text-secondary)] font-semibold mt-1">
                          <span>{e.examCode}</span>
                          <span>{e.classId?.name || 'N/A'}</span>
                        </div>

                        {/* Graphic Indicator */}
                        <div className="my-6 flex items-center justify-center min-h-[60px]">
                          {renderCardChart(idx, e)}
                        </div>

                        {/* Start Date & Type */}
                        <div className="space-y-2.5 text-xs text-[var(--color-text-secondary)] border-t border-slate-100 dark:border-slate-800/60 pt-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Start Date</span>
                            <span className="text-slate-700 dark:text-slate-200 font-mono font-bold ml-auto">
                              {dayjs(e.startDate).format('MMM DD, YYYY')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Type</span>
                            <span className="text-slate-700 dark:text-slate-200 font-bold ml-auto">
                              {e.examType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide leading-none uppercase ${statusColors[e.status] || 'bg-slate-100 text-slate-600'}`}>
                          {e.status}
                        </span>
                        <div className="flex gap-1.5 items-center">
                          <Button 
                            onClick={() => handleOpenEditExam(e)} 
                            variant="secondary" 
                            size="sm" 
                            className="gap-1 px-2.5 py-1 text-[11px] font-bold"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </Button>
                          <Button 
                            onClick={() => {
                              setActiveTab('schedules');
                              setSelectedExamId(e._id);
                            }} 
                            variant="secondary" 
                            size="sm" 
                            className="gap-1 px-2 py-1 text-[11px] font-bold"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>View Details</span>
                          </Button>
                          <Button 
                            onClick={() => handleOpenDeleteExam(e)} 
                            variant="danger" 
                            size="sm" 
                            className="p-1.5 bg-red-500/10 dark:bg-red-500/20 text-[var(--color-status-error)] hover:bg-red-600 hover:text-white border border-red-500/20 dark:border-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Row */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass-card/80 rounded-xl p-4 shadow-xs">
                {/* Entry Limit Selector */}
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] font-semibold">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-hidden text-xs font-bold"
                  >
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>entries</span>
                </div>

                {/* Page Selectors */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-bold"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(exams.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                        currentPage === page
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-[var(--color-text-secondary)] border border-black/5 dark:border-white/5'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === Math.ceil(exams.length / itemsPerPage) || exams.length === 0}
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(exams.length / itemsPerPage), p + 1))}
                    className="px-3 py-1.5 text-xs font-bold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Create Button */}
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
            <span className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg whitespace-nowrap">
              + Create Exam Term
            </span>
            <button 
              onClick={handleOpenCreateExam} 
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 border border-emerald-400/20"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-black/5 dark:border-white/5">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-64 flex flex-col gap-1">
                <label htmlFor="filterExam" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Filter by Exam Term
                </label>
                <select
                  id="filterExam"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">All Exam Terms</option>
                  {uniqueExams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-64 flex flex-col gap-1">
                <label htmlFor="filterClassSection" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Filter by Class & Section
                </label>
                <select
                  id="filterClassSection"
                  value={selectedClassSectionKey}
                  onChange={(e) => setSelectedClassSectionKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">All Classes</option>
                  {uniqueClassSections.map(cs => (
                    <option key={`${cs.classId}_${cs.sectionId}`} value={`${cs.classId}_${cs.sectionId}`}>{cs.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
              {showHeaderInfo && (
                <Button onClick={handleDownloadPDF} variant="secondary" className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Download PDF</span>
                </Button>
              )}
              <Button onClick={handleOpenCreateSched} className="gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Timetable Slot</span>
              </Button>
            </div>
          </div>

          {/* Custom Sheet Timetable */}
          {showHeaderInfo ? (
            <div className="glass-card rounded-2xl p-8 shadow-xs space-y-6">
              {/* Sheet Top Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex items-center justify-center text-[var(--color-status-success)] dark:text-emerald-400 shrink-0 overflow-hidden">
                    {filteredSchedules[0]?.instituteId?.logo ? (
                      <img 
                        src={filteredSchedules[0].instituteId.logo} 
                        alt="Institute Logo" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Shield className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-[var(--color-text-[var(--color-primary-pink)])] dark:text-white tracking-tight uppercase">
                      {filteredSchedules[0]?.branchId?.name || 'EduCore International'}
                    </h1>
                    <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold tracking-widest uppercase block mt-0.5">
                      Excellence Through Education
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-[11px] text-[var(--color-text-secondary)] font-medium">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-slate-400" /> 
                      {formatAddress(filteredSchedules[0]?.branchId?.address) || formatAddress(filteredSchedules[0]?.instituteId?.address) || 'Main Campus, Rawalpindi'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> 
                      {filteredSchedules[0]?.branchId?.phone || filteredSchedules[0]?.instituteId?.phone || '051-1234567'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> 
                      {filteredSchedules[0]?.branchId?.email || filteredSchedules[0]?.instituteId?.email || 'info@educore.edu.pk'}
                    </p>
                  </div>
                  
                  <div className="bg-[#0F1E36] dark:bg-slate-950 text-white rounded-xl p-3 flex items-center gap-3 border border-slate-850 shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold leading-none">Session</span>
                      <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">
                        {filteredSchedules[0]?.examId?.sessionId?.name || 'Fall 2026'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Green Band */}
              <div className="h-0.5 bg-emerald-500 rounded-full w-full" />

              {/* Timetable Sub-Bar */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] uppercase tracking-wide">
                    {`${filteredSchedules[0]?.examId?.title || 'EXAM'} TIMETABLE`.toUpperCase()}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold leading-none uppercase">Class</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                        {filteredSchedules[0]?.classId?.name || 'N/A'} - {filteredSchedules[0]?.sectionId?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold leading-none uppercase">Exam Term</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                        {filteredSchedules[0]?.examId?.title || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold leading-none uppercase">Effective From</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                        {dayjs(filteredSchedules[0]?.examDate).format('DD MMMM YYYY')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Timetable Grid */}
              <div className="w-full overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#0F1E36] text-white text-[11px] uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-6">Date & Day</th>
                      <th className="py-3.5 px-6">Subject / Course</th>
                      <th className="py-3.5 px-6">Time Slot</th>
                      <th className="py-3.5 px-6">Room</th>
                      <th className="py-3.5 px-6">Total/Pass</th>
                      <th className="py-3.5 px-6">Invigilator</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredSchedules.map((s, idx) => {
                      const SubjectIcon = getSubjectIcon(s.subjectId?.name);
                      const bgClass = getSubjectBg(s.subjectId?.name);
                      return (
                        <tr key={s._id || idx} className="hover:bg-[var(--color-primary-pink)]/5/50 dark:hover:bg-slate-950/20 transition-colors">
                          {/* Date & Day */}
                          <td className="py-4 px-6">
                            <span className="text-sm font-bold text-slate-850 dark:text-slate-100 block">
                              {dayjs(s.examDate).format('DD MMM, YYYY')}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[var(--color-text-secondary)] font-medium">
                              {dayjs(s.examDate).format('dddd')}
                            </span>
                          </td>
                          {/* Subject Card */}
                          <td className="py-4 px-6">
                            <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${bgClass}`}>
                              <SubjectIcon className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-bold tracking-wide">{s.subjectId?.name || 'N/A'}</span>
                            </div>
                          </td>
                          {/* Time Slot */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.startTime} - {s.endTime}</span>
                            </div>
                          </td>
                          {/* Room */}
                          <td className="py-4 px-6">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {s.roomNumber || 'N/A'}
                            </span>
                          </td>
                          {/* Total/Pass */}
                          <td className="py-4 px-6 text-xs font-mono font-bold text-[var(--color-text-secondary)]">
                            {s.totalMarks} / {s.passingMarks}
                          </td>
                          {/* Invigilator */}
                          <td className="py-4 px-6 text-xs font-medium text-slate-650 dark:text-slate-400">
                            {s.teacherId?.name || 'N/A'}
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button onClick={() => handleOpenEditSched(s)} variant="secondary" size="sm">
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button onClick={() => handleOpenDeleteSched(s)} variant="danger" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sheet Bottom Footer */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-[11px] text-[var(--color-text-secondary)] font-medium space-y-1 text-center md:text-left">
                  <p className="font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200">Important Instruction:</p>
                  <p>• Please reach the examination room at least 15 minutes before the exam time.</p>
                  <p>• Mobile phones, smartwatches, and study materials are strictly prohibited.</p>
                </div>

                <div className="flex flex-col items-center gap-1 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-6 py-2">
                  <Quote className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[10px] font-bold text-[var(--color-status-success)] dark:text-emerald-400 italic">
                    Discipline Today, Success Tomorrow.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-mono text-base text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 italic font-black select-none tracking-widest border-b border-slate-300 dark:border-slate-700 pb-0.5 px-4">
                    Controller
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-[var(--color-text-secondary)] font-bold uppercase tracking-wider mt-1.5">
                    Controller of Examinations
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Table 
              columns={schedColumns} 
              data={filteredSchedules} 
              isLoading={schedsLoading} 
            />
          )}
        </div>
      )}

      {/* Exam Term Modal */}
      <Modal isOpen={examModalOpen} onClose={() => setExamModalOpen(false)} title={editingExam ? 'Edit Exam details' : 'Create Exam Term'}>
        <form onSubmit={handleExamSubmit(onExamSubmit)} className="space-y-4">
          <Input id="title" label="Exam Name (e.g. Mid Term 2026)" required error={examErrors.title} {...registerExam('title')} />
          <Input id="examCode" label="Exam Unique Code" placeholder="MID-2026" required error={examErrors.examCode} {...registerExam('examCode')} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="examType"
              label="Exam Type"
              required
              options={[
                { value: 'QUIZ', label: 'Quiz' },
                { value: 'MONTHLY', label: 'Monthly Quiz' },
                { value: 'MID_TERM', label: 'Mid Term' },
                { value: 'FINAL', label: 'Final Examination' },
                { value: 'MOCK', label: 'Mock Exam' },
                { value: 'PRACTICAL', label: 'Practical Exam' },
                { value: 'CUSTOM', label: 'Custom Term' },
              ]}
              error={examErrors.examType}
              {...registerExam('examType')}
            />

            <Select
              id="sessionId"
              label="Academic Session"
              required
              options={sessions.map(s => ({ value: s._id, label: s.name }))}
              placeholder="Select Session"
              error={examErrors.sessionId}
              {...registerExam('sessionId')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="classId"
              label="Class"
              required
              options={classes.map(c => ({ value: c._id, label: c.name }))}
              placeholder="Select Class"
              error={examErrors.classId}
              {...registerExam('classId')}
            />

            <Select
              id="sectionId"
              label="Section"
              required
              options={sections.map(s => ({ value: s._id, label: s.name }))}
              placeholder="Select Section"
              error={examErrors.sectionId}
              {...registerExam('sectionId')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="startDate" label="Start Date" type="date" required error={examErrors.startDate} {...registerExam('startDate')} />
            <Input id="endDate" label="End Date" type="date" required error={examErrors.endDate} {...registerExam('endDate')} />
          </div>

          <Select
            id="status"
            label="Exam Status"
            required
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'ONGOING', label: 'Ongoing' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            error={examErrors.status}
            {...registerExam('status')}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setExamModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreatingExam || isUpdatingExam}>Save Exam</Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Slot Modal */}
      <Modal isOpen={schedModalOpen} onClose={() => setSchedModalOpen(false)} title={editingSched ? 'Edit Schedule Slot' : 'Add Timetable Slot'} size="lg">
        <form onSubmit={handleSchedSubmit(onSchedSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="examId"
              label="Exam Term"
              required
              options={exams.map(e => ({ value: e._id, label: e.title }))}
              placeholder="Select Exam"
              error={schedErrors.examId}
              {...registerSched('examId')}
            />

            <Select
              id="subjectId"
              label="Subject"
              required
              options={subjects.map(s => ({ value: s._id, label: s.name }))}
              placeholder="Select Subject"
              error={schedErrors.subjectId}
              {...registerSched('subjectId')}
            />
          </div>

            <Select
              id="teacherId"
              label="Invigilator / Teacher"
              required
              options={teachers.map(t => ({ value: t._id, label: t.name }))}
              placeholder="Select Teacher"
              error={schedErrors.teacherId}
              {...registerSched('teacherId')}
            />
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="classId"
              label="Class"
              required
              options={classes.map(c => ({ value: c._id, label: c.name }))}
              placeholder="Select Class"
              error={schedErrors.classId}
              {...registerSched('classId')}
            />

            <Select
              id="sectionId"
              label="Section"
              required
              options={sections.map(s => ({ value: s._id, label: s.name }))}
              placeholder="Select Section"
              error={schedErrors.sectionId}
              {...registerSched('sectionId')}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input id="examDate" label="Exam Date" type="date" required error={schedErrors.examDate} {...registerSched('examDate')} />
            <Input id="startTime" label="Start Time" placeholder="09:00 AM" required error={schedErrors.startTime} {...registerSched('startTime')} />
            <Input id="endTime" label="End Time" placeholder="12:00 PM" required error={schedErrors.endTime} {...registerSched('endTime')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input id="totalMarks" label="Total Marks" type="number" required error={schedErrors.totalMarks} {...registerSched('totalMarks')} />
            <Input id="passingMarks" label="Passing Marks" type="number" required error={schedErrors.passingMarks} {...registerSched('passingMarks')} />
            <Input id="roomNumber" label="Room Number" placeholder="Room 204" error={schedErrors.roomNumber} {...registerSched('roomNumber')} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <Button onClick={() => setSchedModalOpen(false)} variant="outline">Cancel</Button>
            <Button type="submit" isLoading={isCreatingSched || isUpdatingSched}>Save Schedule</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteExamModalOpen}
        onClose={() => setDeleteExamModalOpen(false)}
        onConfirm={handleConfirmDeleteExam}
        title="Delete Exam Container"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this exam container?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete the exam container <strong className="text-red-900 dark:text-red-200">{examToDelete?.title}</strong> ({examToDelete?.examCode}). All associated timetable slots and graded results for this exam will be permanently deleted. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Exam"
        isLoading={isDeletingExam}
      />

      <ConfirmModal
        isOpen={deleteSchedModalOpen}
        onClose={() => setDeleteSchedModalOpen(false)}
        onConfirm={handleConfirmDeleteSched}
        title="Delete Timetable Slot"
        message={
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Are you sure you want to delete this schedule slot?</h4>
            <p className="text-red-700/80 dark:text-red-400/80">
              You are about to delete the timetable slot for <strong className="text-red-900 dark:text-red-200">{schedToDelete?.subjectId?.name}</strong> on <strong className="text-red-900 dark:text-red-200">{dayjs(schedToDelete?.examDate).format('MMM DD, YYYY')}</strong>. This action is irreversible.
            </p>
          </div>
        }
        confirmText="Delete Timetable Slot"
        isLoading={isDeletingSched}
      />
    </div>
  );
}
