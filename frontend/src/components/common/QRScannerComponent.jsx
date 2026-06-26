import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScannerComponent({ onScanSuccess, onScanFailure }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-el',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText, decodedResult) => {
        if (onScanSuccess) {
          onScanSuccess(decodedText, decodedResult);
        }
      },
      (error) => {
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    return () => {
      scanner.clear().catch((err) => {
        // Suppress errors on component unmount
      });
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-100/50 dark:bg-slate-900/40">
      <div id="qr-reader-el" className="w-full max-w-sm rounded-lg overflow-hidden"></div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
        Position the QR code inside the frame to scan automatically.
      </p>
    </div>
  );
}
