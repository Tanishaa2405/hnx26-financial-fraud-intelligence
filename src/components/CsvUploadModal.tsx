import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Download, ArrowRight } from 'lucide-react';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (csvContent: string) => Promise<void>;
}

const REQUIRED_COLUMNS = [
  'transaction_id',
  'account_id',
  'amount',
  'timestamp',
  'merchant',
  'merchant_category',
  'device_id',
  'location',
  'payment_channel',
];

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateCsvString = (content: string): { valid: boolean; missing?: string[]; rowCount: number } => {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return { valid: false, missing: ['File is empty or has no data rows'], rowCount: 0 };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

    return {
      valid: missing.length === 0,
      missing,
      rowCount: lines.length - 1,
    };
  };

  const handleFileProcess = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvText(content);
      const validation = validateCsvString(content);
      if (!validation.valid) {
        setError(`CSV validation failed: Missing required columns: ${validation.missing?.join(', ')}`);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!csvText.trim()) {
      setError('Please upload a CSV file or paste transaction rows.');
      return;
    }

    const validation = validateCsvString(csvText);
    if (!validation.valid) {
      setError(`Cannot analyze: Missing required columns: ${validation.missing?.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onUploadSuccess(csvText);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during transaction ingestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Transaction Dataset (CSV)</h2>
              <p className="text-xs text-slate-400">Send dataset into the Python ML anomaly engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-cyan-500 bg-cyan-950/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-200">
              {fileName ? fileName : 'Click to select CSV file or drag and drop here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Comma-separated values with header row</p>
          </div>

          {/* Column Format Requirements */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300">Required CSV Columns (Exact Names):</span>
              <a
                href="/api/sample-csv"
                download="transactions_sample.csv"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Download Sample CSV</span>
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-slate-400 font-mono text-[11px]">
              {REQUIRED_COLUMNS.map((col) => {
                const isMatched = csvText && csvText.split('\n')[0]?.toLowerCase().includes(col);
                return (
                  <div key={col} className="flex items-center gap-1">
                    {isMatched ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span className={isMatched ? 'text-emerald-300 font-bold' : ''}>{col}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paste CSV Preview */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Direct CSV Text / Preview
            </label>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setError(null);
              }}
              placeholder={`transaction_id,account_id,amount,timestamp,merchant,merchant_category,device_id,location,payment_channel\nTXN_001,ACC_100,50.00,2026-10-01T10:00:00Z,Starbucks,Dining,DEV_01,Seattle WA,in_store`}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !csvText.trim()}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md transition disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Running Pipeline...' : 'Analyze Transactions'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
