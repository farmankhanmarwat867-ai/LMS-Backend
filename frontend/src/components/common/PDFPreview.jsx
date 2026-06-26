import React from 'react';
import Button from './Button';
import { Download, FileText } from 'lucide-react';

export default function PDFPreview({ pdfBlob, downloadName = 'document.pdf', isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <svg className="animate-spin h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading PDF Document Preview...</p>
      </div>
    );
  }

  if (!pdfBlob) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
        <FileText className="w-12 h-12 text-slate-400 mb-3" />
        <p className="text-sm font-semibold">No Document Loaded</p>
        <p className="text-xs text-slate-400 mt-1">Select a document to preview or generate.</p>
      </div>
    );
  }

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          <span>Download PDF</span>
        </Button>
      </div>
      <div className="w-full h-[600px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950">
        <iframe src={pdfUrl} title="PDF Preview" className="w-full h-full border-0" />
      </div>
    </div>
  );
}
