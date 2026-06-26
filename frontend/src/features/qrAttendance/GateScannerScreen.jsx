import React, { useState, useEffect, useRef } from 'react';
import { useScanGateAttendanceMutation } from '../../app/api/coreApiSlice';
import { Scan, CheckCircle, ShieldAlert } from 'lucide-react';

export default function GateScannerScreen() {
  const [scanGateAttendance] = useScanGateAttendanceMutation();
  const [lastScanResult, setLastScanResult] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Keep input focused automatically
  useEffect(() => {
    const handleBodyClick = () => inputRef.current?.focus();
    document.addEventListener('click', handleBodyClick);
    inputRef.current?.focus();
    return () => document.removeEventListener('click', handleBodyClick);
  }, []);

  const handleScan = async (qrValue) => {
    try {
      const res = await scanGateAttendance({ qrCodeValue: qrValue }).unwrap();
      setLastScanResult({
        success: true,
        student: res.data.student,
        time: res.data.attendance.checkInTime
      });
      // Play success sound (browser native beep workaround or html5 audio)
      const audio = new Audio('/success.mp3'); // We'll assume a success.mp3 exists or ignore if it fails
      audio.play().catch(() => {});
    } catch (err) {
      setLastScanResult({
        success: false,
        message: err.data?.message || 'Check-in Failed'
      });
      const audio = new Audio('/error.mp3');
      audio.play().catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const qrValue = inputValue.trim();
      if (qrValue) {
        handleScan(qrValue);
      }
      setInputValue(''); // Reset for next scan
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--color-text-[var(--color-primary-pink)])] flex items-center justify-center gap-3">
          <Scan className="w-8 h-8 text-[var(--color-primary-pink)]" />
          Gate Check-in Scanner
        </h1>
        <p className="text-[var(--color-text-secondary)]">Scan Student ID Cards. Ensure scanner is connected.</p>
      </div>

      {/* Hidden input for USB Keyboard Wedge scanners */}
      <input
        type="text"
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute top-[-9999px]"
        autoFocus
      />

      <div className="w-full max-w-lg">
        {lastScanResult ? (
          lastScanResult.success ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
              <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Attendance Marked</h2>
              
              <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900 border-4 border-emerald-500 overflow-hidden mb-4 shadow-lg">
                {lastScanResult.student.photo ? (
                  <img src={lastScanResult.student.photo} alt={lastScanResult.student.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-500 text-3xl font-bold">
                    {lastScanResult.student.name.charAt(0)}
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">{lastScanResult.student.name}</h3>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)] mt-1">
                ID: {lastScanResult.student.studentId} • Roll: {lastScanResult.student.rollNumber || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-4">
                Checked in at {new Date(lastScanResult.time).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500 rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
              <ShieldAlert className="w-20 h-20 text-rose-500 mb-4" />
              <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-400 mb-2">Scan Failed</h2>
              <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                {lastScanResult.message}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-4">Please try scanning again or contact admin.</p>
            </div>
          )
        ) : (
          <div className="bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <Scan className="w-16 h-16 text-[var(--color-primary-pink)] relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-6">Waiting for scan...</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">Ready to receive ID card scans.</p>
          </div>
        )}
      </div>
    </div>
  );
}
