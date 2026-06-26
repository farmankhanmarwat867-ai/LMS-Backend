import React, { useState, useRef, useEffect } from 'react';
import { useGetUsersQuery, useGetClassesQuery, useGetSectionsQuery } from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { Printer, IdCard, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Input from '../../components/common/Input';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function IdCardModule() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: classesData } = useGetClassesQuery({});
  const { data: sectionsData } = useGetSectionsQuery({});
  const { data: usersData, isLoading } = useGetUsersQuery({ role: 'STUDENT', limit: 1000 });

  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];
  const students = usersData?.data || [];

  const filteredSections = selectedClass
    ? sections.filter(s => (s.classId?._id || s.classId) === selectedClass)
    : sections;

  const filteredStudents = students.filter(student => {
    const matchClass = selectedClass ? (student.classId?._id || student.classId) === selectedClass : true;
    const matchSection = selectedSection ? (student.sectionId?._id || student.sectionId) === selectedSection : true;
    const matchSearch = searchTerm ? student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchClass && matchSection && matchSearch;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSection, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const printRef = useRef(null);

  const handlePrint = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students found to print');
      return;
    }
    window.print();
  };

  const handleDownloadPDF = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students found to download');
      return;
    }
    setIsDownloading(true);
  };

  useEffect(() => {
    const generatePdf = async () => {
      const toastId = toast.loading('Generating PDF. Please wait...');
      try {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: [2.125, 3.375] // Portrait CR80 ID Card dimensions
        });

        // Ensure we find the cards inside the overlay
        const cards = printRef.current.querySelectorAll('.card-face');
        
        if (!cards || cards.length === 0) {
          throw new Error('No cards found to render');
        }

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          
          const canvas = await html2canvas(card, {
            scale: 3, // High quality but balanced for memory
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, 2.125, 3.375);
        }

        pdf.save(`ID_Cards_${classes.find(c=>c._id===selectedClass)?.name || 'All'}.pdf`);
        toast.success('PDF generated successfully!', { id: toastId });
      } catch (error) {
        console.error('PDF Generation Error:', error);
        toast.error('Failed to generate PDF. Check console for details.', { id: toastId });
      } finally {
        setIsDownloading(false);
      }
    };

    if (isDownloading && printRef.current) {
      // Wait for DOM layout and images to fully render before taking snapshot
      setTimeout(() => {
        generatePdf();
      }, 800);
    }
  }, [isDownloading, classes, selectedClass]);

  const getClassName = (id) => classes.find(c => c._id === id)?.name || 'N/A';
  const getSectionName = (id) => sections.find(s => s._id === id)?.name || 'N/A';

  const renderCardList = (studentsList) => (
    studentsList.map(student => (
      <div key={student._id} className="id-card-wrapper flex flex-col gap-4 items-center shrink-0">
        
        {/* FRONT CARD */}
        <div className="card-face relative w-[2.125in] h-[3.375in] bg-[#ffffff] rounded-xl overflow-hidden shadow-lg border border-[#e2e8f0] shrink-0 print:shadow-none print:border-gray-400">
          {/* Blue top angles */}
          <div className="absolute top-0 left-0 w-full h-[140px] bg-[#1d5fb5]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)' }}></div>
          
          {/* Black angles behind */}
          <div className="absolute top-[80px] left-[-20px] w-[80px] h-[30px] bg-[#0f172a] rotate-[-30deg]"></div>
          <div className="absolute top-[95px] left-[-20px] w-[60px] h-[15px] bg-[#1e293b] rotate-[-30deg]"></div>
          
          <div className="absolute top-[80px] right-[-20px] w-[80px] h-[30px] bg-[#0f172a] rotate-[30deg]"></div>
          <div className="absolute top-[95px] right-[-20px] w-[60px] h-[15px] bg-[#1e293b] rotate-[30deg]"></div>

          {/* Header */}
          <div className="relative z-10 pt-4 flex flex-col items-center">
            <div className="flex items-center gap-1.5 bg-[#ffffff] px-2 py-0.5 rounded-full shadow-sm max-w-[90%]">
              {student.instituteId?.logo ? (
                <img src={student.instituteId.logo} alt="Logo" className="w-4 h-4 object-contain rounded-sm" crossOrigin="anonymous" />
              ) : (
                <div className="w-3.5 h-3.5 shrink-0 bg-[#1d5fb5] text-[#ffffff] rounded flex items-center justify-center font-bold text-[8px]">
                  {student.instituteId?.name?.charAt(0) || 'E'}
                </div>
              )}
              <div className="flex flex-col leading-none text-[#1e293b] truncate">
                <span className="text-[8px] font-bold uppercase tracking-wide truncate" title={student.instituteId?.name || 'EduEnterprise'}>
                  {student.instituteId?.name || 'EduEnterprise'}
                </span>
                <span className="text-[4px] uppercase tracking-wider text-[#64748b] truncate" title={student.branchId?.name || 'Student ID Card'}>
                  {student.branchId?.name || 'Student ID Card'}
                </span>
              </div>
            </div>
          </div>

          {/* Photo inside hexagon */}
          <div className="relative z-10 mt-5 mx-auto w-[90px] h-[100px] bg-[#1e293b] p-1" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <div className="w-full h-full bg-[#e2e8f0] overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              {student.avatar ? (
                <img src={student.avatar} alt="Photo" className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#94a3b8]">
                  <IdCard className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>

          {/* Name & Title */}
          <div className="text-center mt-3 mb-3 relative z-10">
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide leading-none mb-1">{student.name}</h2>
            <p className="text-[7px] text-[#64748b] uppercase tracking-widest font-medium">STUDENT</p>
          </div>

          {/* Details */}
          <div className="px-5 text-[6.5px] text-[#334155] space-y-0.5 relative z-10 bg-[#ffffff]">
            <div className="flex"><span className="w-10 font-bold text-[#64748b]">ID NO</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.studentId}</span></div>
            <div className="flex"><span className="w-10 font-bold text-[#64748b]">DOB</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">N/A</span></div>
            <div className="flex"><span className="w-10 font-bold text-[#64748b]">CLASS</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{getClassName(student.classId?._id || student.classId)} - {getSectionName(student.sectionId?._id || student.sectionId)}</span></div>
            <div className="flex"><span className="w-10 font-bold text-[#64748b]">ROLL</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.rollNumber || '-'}</span></div>
            <div className="flex"><span className="w-10 font-bold text-[#64748b]">PHONE</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.phone || 'N/A'}</span></div>
          </div>

          {/* Bottom blue bar */}
          <div className="absolute bottom-[0] left-[-5%] w-[110%] h-[30px] bg-[#1d5fb5]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}></div>
        </div>

        {/* BACK CARD */}
        <div className="card-face relative w-[2.125in] h-[3.375in] bg-[#ffffff] rounded-xl overflow-hidden shadow-lg border border-[#e2e8f0] shrink-0 print:shadow-none print:border-gray-400">
          {/* Blue top angles */}
          <div className="absolute top-0 left-0 w-full h-[140px] bg-[#1d5fb5]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)' }}></div>
          
          {/* Header */}
          <div className="relative z-10 pt-4 flex flex-col items-center">
            <div className="flex items-center gap-1.5 bg-[#ffffff] px-2 py-0.5 rounded-full shadow-sm">
              <div className="w-3.5 h-3.5 bg-[#1d5fb5] text-[#ffffff] rounded flex items-center justify-center font-bold text-[8px]">
                {student.instituteId?.name?.charAt(0) || 'E'}
              </div>
              <div className="flex flex-col leading-none text-[#1e293b]">
                <span className="text-[8px] font-bold uppercase tracking-wide">{student.instituteId?.name || 'COMPANY'}</span>
                <span className="text-[4px] uppercase tracking-wider text-[#64748b]">{student.branchId?.name || 'TAGLINE GOES HERE'}</span>
              </div>
            </div>
          </div>

          {/* QR Code inside hexagon */}
          <div className="relative z-10 mt-5 mx-auto w-[90px] h-[100px] bg-[#1e293b] p-1" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <div className="w-full h-full bg-[#ffffff] flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              {student.studentId || student._id ? (
                <QRCode value={student.studentId || student._id} size={50} level="M" />
              ) : (
                <span className="text-[8px] text-[#94a3b8]">No QR</span>
              )}
            </div>
          </div>

          {/* Terms & Signature */}
          <div className="mt-6 px-5 text-[5px] text-[#94a3b8] text-center leading-relaxed">
            <p className="flex items-start gap-1 mb-1">
              <span className="w-1 h-1 rounded-full bg-[#1d5fb5] mt-1 shrink-0"></span>
              This identity card is the property of {student.instituteId?.name || 'the institution'}. It must be presented upon request.
            </p>
            <p className="flex items-start gap-1">
              <span className="w-1 h-1 rounded-full bg-[#1d5fb5] mt-1 shrink-0"></span>
              If found, please return to the school administration office immediately.
            </p>
          </div>

          <div className="absolute bottom-[35px] w-full flex justify-center">
            <div className="text-center">
              <div className="w-16 border-b border-[#cbd5e1] mb-1 mx-auto"></div>
              <span className="text-[5px] text-[#94a3b8] font-medium tracking-wider">Authorized Signature</span>
            </div>
          </div>

          {/* Bottom blue bar */}
          <div className="absolute bottom-[0] left-[-5%] w-[110%] h-[30px] bg-[#1d5fb5]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}></div>
        </div>

      </div>
    ))
  );

  return (
    <div className="space-y-6 overflow-x-hidden pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] flex items-center gap-2">
            <IdCard className="w-6 h-6 text-[var(--color-primary-pink)]" />
            Student ID Cards
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Generate and print permanent QR ID cards for students.</p>
        </div>
        <div className="flex flex-wrap gap-3 hide-on-print">
          <Button onClick={handleDownloadPDF} disabled={isDownloading} variant="outline" className="gap-2 shadow-sm whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </Button>
          <Button onClick={handlePrint} className="gap-2 shadow-md whitespace-nowrap">
            <Printer className="w-4 h-4" />
            <span>Print Cards ({filteredStudents.length})</span>
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4 hide-on-print">
        <Select
          label="Filter by Class"
          options={[{ value: '', label: 'All Classes' }, ...classes.map(c => ({ value: c._id, label: c.name }))]}
          value={selectedClass}
          onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
        />
        <Select
          label="Filter by Section"
          options={[{ value: '', label: 'All Sections' }, ...filteredSections.map(s => ({ value: s._id, label: s.name }))]}
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          disabled={!selectedClass}
        />
        <Input
          label="Search Students"
          placeholder="Name or Student ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading students...</div>
      ) : (
        <>
          {filteredStudents.length > 0 ? (
            <>
              {/* Visible Paginated Cards */}
              <div 
                className="grid gap-8 justify-items-center hide-on-print" 
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(2.125in, 1fr))' }}
              >
                {renderCardList(paginatedStudents)}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 hide-on-print">
                  <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outline" className="px-3">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} variant="outline" className="px-3">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Hidden Print/PDF Container */}
              {isDownloading ? (
                <div className="fixed inset-0 bg-slate-100 z-[9999] overflow-y-auto flex flex-col items-center py-20" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                  <div className="mb-8 flex flex-col items-center bg-white p-6 rounded-xl shadow-lg border border-black/5">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                     <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Generating High-Quality PDF...</h2>
                     <p className="text-[var(--color-text-secondary)] mt-2 text-sm text-center max-w-md">Please wait while we render all {filteredStudents.length} ID cards. Do not close or refresh this page.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-8 pointer-events-none" ref={printRef}>
                    {renderCardList(filteredStudents)}
                  </div>
                </div>
              ) : (
                <div className="print-only-container">
                  <div ref={printRef}>
                    {renderCardList(filteredStudents)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="col-span-full py-10 text-center text-[var(--color-text-secondary)]">No students found matching your filters.</div>
          )}
        </>
      )}

      <style>{`
        .print-only-container {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .hide-on-print {
            display: none !important;
          }
          .print-only-container {
            display: block !important;
          }
          .print-only-container .id-card-wrapper, .print-only-container .id-card-wrapper * {
            visibility: visible;
          }
          .print-only-container .id-card-wrapper {
            page-break-inside: avoid;
            margin-bottom: 20px;
            float: left;
            margin-right: 20px;
          }
        }
      `}</style>
    </div>
  );
}
