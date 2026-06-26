import React, { useState, useRef, useEffect } from 'react';
import { useGetMeQuery, useGetClassesQuery, useGetSectionsQuery } from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import { IdCard, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

export default function StudentIdCardDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  const { data: meData, isLoading: isMeLoading } = useGetMeQuery();
  const { data: classesData, isLoading: isClassesLoading } = useGetClassesQuery({});
  const { data: sectionsData, isLoading: isSectionsLoading } = useGetSectionsQuery({});

  const isLoading = isMeLoading || isClassesLoading || isSectionsLoading;

  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];

  const student = meData?.data || meData; // Use the fully populated fetched profile

  const getClassName = (id) => classes.find(c => c._id === id)?.name || 'N/A';
  const getSectionName = (id) => sections.find(s => s._id === id)?.name || 'N/A';

  useEffect(() => {
    const generatePdf = async () => {
      if (!student) {
        setIsDownloading(false);
        return;
      }
      
      const toastId = toast.loading('Generating your ID Card...');
      try {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: [2.125, 3.375]
        });

        const cards = printRef.current.querySelectorAll('.card-face');
        
        if (!cards || cards.length === 0) {
          throw new Error('No cards found to render');
        }

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const canvas = await html2canvas(card, {
            scale: 3,
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, 2.125, 3.375);
        }

        pdf.save(`${student.studentId || 'ID'}_Card.pdf`);
        toast.success('ID Card downloaded successfully!', { id: toastId });
      } catch (error) {
        console.error('PDF Generation Error:', error);
        toast.error('Failed to generate ID Card.', { id: toastId });
      } finally {
        setIsDownloading(false);
      }
    };

    if (isDownloading && printRef.current && student) {
      setTimeout(() => {
        generatePdf();
      }, 500);
    }
  }, [isDownloading, student, classes]);

  if (isLoading || !student) {
    return (
      <Button disabled variant="outline" className="gap-2 shadow-sm">
        <IdCard className="w-4 h-4" />
        <span>Loading ID Card...</span>
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setIsDownloading(true)} disabled={isDownloading} className="gap-2 shadow-md">
        <Download className="w-4 h-4" />
        <span>{isDownloading ? 'Generating...' : 'Download My ID Card'}</span>
      </Button>

      {/* Hidden Print/PDF Container */}
      {isDownloading && (
        <div className="fixed inset-0 bg-slate-100 z-[9999] overflow-y-auto flex flex-col items-center justify-center py-10" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
          <div className="mb-8 flex flex-col items-center bg-white p-6 rounded-xl shadow-lg border border-[#e2e8f0]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
             <h2 className="text-xl font-bold text-[#0f172a]">Generating High-Quality PDF...</h2>
             <p className="text-[#64748b] mt-2 text-sm text-center">Please wait. Do not close or refresh this page.</p>
          </div>
          <div className="flex flex-col gap-8 pointer-events-none" ref={printRef}>
            
            {/* FRONT CARD */}
            <div className="card-face relative w-[2.125in] h-[3.375in] bg-[#ffffff] rounded-xl overflow-hidden shadow-lg border border-[#e2e8f0] shrink-0 print:shadow-none print:border-gray-400">
              <div className="absolute top-0 left-0 w-full h-[140px] bg-[#1d5fb5]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)' }}></div>
              <div className="absolute top-[80px] left-[-20px] w-[80px] h-[30px] bg-[#0f172a] rotate-[-30deg]"></div>
              <div className="absolute top-[95px] left-[-20px] w-[60px] h-[15px] bg-[#1e293b] rotate-[-30deg]"></div>
              <div className="absolute top-[80px] right-[-20px] w-[80px] h-[30px] bg-[#0f172a] rotate-[30deg]"></div>
              <div className="absolute top-[95px] right-[-20px] w-[60px] h-[15px] bg-[#1e293b] rotate-[30deg]"></div>

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

              <div className="text-center mt-3 mb-3 relative z-10">
                <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide leading-none mb-1">{student.name}</h2>
                <p className="text-[7px] text-[#64748b] uppercase tracking-widest font-medium">STUDENT</p>
              </div>

              <div className="px-5 text-[6.5px] text-[#334155] space-y-0.5 relative z-10 bg-[#ffffff]">
                <div className="flex"><span className="w-10 font-bold text-[#64748b]">ID NO</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.studentId}</span></div>
                <div className="flex"><span className="w-10 font-bold text-[#64748b]">DOB</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">N/A</span></div>
                <div className="flex"><span className="w-10 font-bold text-[#64748b]">CLASS</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{getClassName(student.classId?._id || student.classId)} - {getSectionName(student.sectionId?._id || student.sectionId)}</span></div>
                <div className="flex"><span className="w-10 font-bold text-[#64748b]">ROLL</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.rollNumber || '-'}</span></div>
                <div className="flex"><span className="w-10 font-bold text-[#64748b]">PHONE</span><span className="px-1 text-[#94a3b8]">:</span><span className="font-medium text-[#1e293b]">{student.phone || 'N/A'}</span></div>
              </div>

              <div className="absolute bottom-[0] left-[-5%] w-[110%] h-[30px] bg-[#1d5fb5]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}></div>
            </div>

            {/* BACK CARD */}
            <div className="card-face relative w-[2.125in] h-[3.375in] bg-[#ffffff] rounded-xl overflow-hidden shadow-lg border border-[#e2e8f0] shrink-0 print:shadow-none print:border-gray-400">
              <div className="absolute top-0 left-0 w-full h-[140px] bg-[#1d5fb5]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)' }}></div>
              
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

              <div className="relative z-10 mt-5 mx-auto w-[90px] h-[100px] bg-[#1e293b] p-1" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <div className="w-full h-full bg-[#ffffff] flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                  {student.studentId || student._id ? (
                    <QRCode value={student.studentId || student._id} size={50} level="M" />
                  ) : (
                    <span className="text-[8px] text-[#94a3b8]">No QR</span>
                  )}
                </div>
              </div>

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

              <div className="absolute bottom-[0] left-[-5%] w-[110%] h-[30px] bg-[#1d5fb5]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}></div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
