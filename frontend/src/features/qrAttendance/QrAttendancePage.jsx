import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../app/authSlice';
import {
  useGenerateQRSessionMutation,
  useScanQRCheckinMutation,
  useGetSubjectsQuery
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import QRScannerComponent from '../../components/common/QRScannerComponent';
import { toast } from 'react-hot-toast';
import { QrCode, ScanLine, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import uploadAxios from '../../services/uploadHelper';

export default function QrAttendancePage({ scanMode = false }) {
  const currentUser = useSelector(selectCurrentUser);
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionDuration, setSessionDuration] = useState('15'); // default 15 minutes
  const [activeSession, setActiveSession] = useState(null);
  
  // Student Scan States
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(true);

  // API Hooks
  const { data: coursesResponse } = useGetSubjectsQuery({ limit: 200 });
  const [generateQR, { isLoading: isGenerating }] = useGenerateQRSessionMutation();
  const [scanCheckin, { isLoading: isCheckingIn }] = useScanQRCheckinMutation();

  const courses = coursesResponse?.data || [];
  const courseOptions = courses.map(c => {
    const className = c.classId?.name ? `Class ${c.classId.name}` : '';
    const sectionName = c.sectionId?.name ? `(Sec ${c.sectionId.name})` : '';
    const subjectName = c.name || c.title || 'Unknown Subject';
    const label = className ? `${className} ${sectionName} - ${subjectName}` : subjectName;
    return { value: c._id, label: label.trim() };
  });

  // Teacher handlers
  const handleStartSession = async () => {
    if (!selectedCourseId) {
      toast.error('Select a course to start QR session');
      return;
    }
    try {
      const response = await generateQR({
        courseId: selectedCourseId,
        expiresInMinutes: Number(sessionDuration),
      }).unwrap();
      if (response.success) {
        setActiveSession(response.data);
        toast.success('QR session generated successfully!');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start session');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const res = await uploadAxios.patch(`/attendance/session/${activeSession._id || activeSession.id}/close`);
      if (res.data.success) {
        toast.success('Session closed. Attendance sheet generated.');
        setActiveSession(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to close session');
    }
  };

  // Student handlers
  const handleScanSuccess = async (decodedText) => {
    setScanning(false);
    try {
      // Expecting standard token payload from QR code
      const response = await scanCheckin({ qrToken: decodedText }).unwrap();
      if (response.success) {
        setScanResult({ success: true, message: response.message || 'Check-in completed successfully!' });
        toast.success('Attendance recorded!');
      } else {
        setScanResult({ success: false, message: response.message || 'Scan failed.' });
      }
    } catch (err) {
      setScanResult({ success: false, message: err?.data?.message || 'Invalid or expired session token.' });
    }
  };

  const handleResetScan = () => {
    setScanResult(null);
    setScanning(true);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <QrCode className="w-8 h-8 text-[var(--color-primary-pink)]" />
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">QR Session Attendance</h2>
          <p className="text-xs text-slate-400 font-medium">Real-time instant student attendance sheets</p>
        </div>
      </div>

      {/* Teacher Session Generator */}
      {isTeacher && !scanMode && (
        <div className="glass-card p-6 rounded-xl shadow-xs space-y-6">
          {!activeSession ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider">Configure QR Check-in</h3>
              
              <Select
                id="qrCourseSelect"
                label="Choose Course"
                options={courseOptions}
                placeholder="Select Course"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              />

              <Input
                id="qrDuration"
                label="Code Expiry (Minutes)"
                type="number"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
              />

              <Button onClick={handleStartSession} isLoading={isGenerating} className="w-full gap-2">
                <QrCode className="w-4 h-4" />
                <span>Generate QR Check-in Code</span>
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                QR Code Session Active (Expires in {sessionDuration} mins)
              </div>

              {/* Graphical QR Code rendering */}
              <div className="inline-block p-4 bg-white dark:bg-slate-200 rounded-xl border-2 border-black/5 dark:border-white/5 shadow-md">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeSession.token)}`} 
                  alt="Session QR Code" 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                />
              </div>

              <div className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
                Instruct students to navigate to their <strong>QR Check-in</strong> screen and point their camera at this code.
              </div>

              <div className="flex justify-center pt-4 border-t border-black/5 dark:border-white/5">
                <Button onClick={handleCloseSession} variant="danger">
                  Close Code Session
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Scanner */}
      {(isStudent || scanMode) && (
        <div className="glass-card p-6 rounded-xl shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[var(--color-primary-pink)]" />
            <span>Scan QR Code Session</span>
          </h3>

          {scanning ? (
            <QRScannerComponent
              onScanSuccess={handleScanSuccess}
              onScanFailure={(err) => {
                // optional: log scan errors quietly
              }}
            />
          ) : (
            <div className="text-center py-6 space-y-4">
              {scanResult?.success ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="w-16 h-16 text-[var(--color-status-success)] animate-bounce" />
                  <h4 className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Attendance Recorded</h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">{scanResult.message}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <ShieldAlert className="w-16 h-16 text-rose-600 animate-pulse" />
                  <h4 className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Check-in Failed</h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">{scanResult?.message}</p>
                </div>
              )}

              <div className="pt-6">
                <Button onClick={handleResetScan} variant="outline" className="mx-auto">
                  Try Scanning Again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
