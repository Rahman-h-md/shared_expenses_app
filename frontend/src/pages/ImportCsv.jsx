import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Upload, FileText, X, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';

const TEMPLATE_CSV = `description,amount,currency,date,paid_by,split_type,participants
Hotel Booking,300,USD,2025-01-15,alice@example.com,equal,"alice@example.com,bob@example.com,charlie@example.com"
Dinner at restaurant,120.50,USD,2025-01-16,bob@example.com,equal,"alice@example.com,bob@example.com"
Taxi fare,45,USD,2025-01-17,charlie@example.com,exact,"alice@example.com:15,bob@example.com:15,charlie@example.com:15"`;

export default function ImportCsv() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError('');
    } else {
      setError('Please upload a valid .csv file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a CSV file'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/groups/${groupId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const importId = res.data.data?.import_id;
      navigate(`/import-report/${importId}?groupId=${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed. Please check your CSV format.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splitwise_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <button 
          onClick={() => navigate(`/groups/${groupId}`)} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back to Group
        </button>

        <div className="glass-panel p-8 border-t-2 border-t-violet-500">
          <h1 className="text-2xl font-display font-extrabold text-white tracking-tight mb-1 flex items-center gap-2">
            <Upload size={20} className="text-violet-400" />
            Import Expenses
          </h1>
          <p className="text-slate-400 text-sm mb-6">Upload a CSV file to bulk import expenses</p>

          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 mb-6">
            <Info size={14} className="text-violet-450 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-300">
              <p className="font-semibold text-slate-200 mb-1">CSV Format Guide</p>
              <p className="text-slate-450 text-[11px] leading-relaxed">
                Required columns: <code className="bg-white/[0.04] px-1 rounded text-violet-300">description</code>, <code className="bg-white/[0.04] px-1 rounded text-violet-300">amount</code>, <code className="bg-white/[0.04] px-1 rounded text-violet-300">currency</code>, <code className="bg-white/[0.04] px-1 rounded text-violet-300">date</code>, <code className="bg-white/[0.04] px-1 rounded text-violet-300">paid_by</code>, <code className="bg-white/[0.04] px-1 rounded text-violet-300">split_type</code>
              </p>
            </div>
            <button
              id="download-template-btn"
              onClick={downloadTemplate}
              className="ml-auto flex-shrink-0 text-[10px] text-violet-400 hover:text-violet-350 border border-violet-500/20 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap font-semibold uppercase tracking-wider cursor-pointer"
            >
              Template
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-405 px-4 py-3 rounded-xl text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-455" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Drop Zone */}
            <div
              id="csv-dropzone"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5'
                  : file
                  ? 'border-violet-500/30 bg-violet-500/2'
                  : 'border-white/[0.08] hover:border-white/[0.15] bg-slate-900/10'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <FileText size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 text-xs font-semibold">{file.name}</p>
                    <p className="text-slate-500 text-[10px] font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-slate-500 hover:text-rose-405 transition-colors flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    <X size={10} /> Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500">
                    <Upload size={16} />
                  </div>
                  <div>
                    <p className="text-slate-200 text-xs font-semibold">Drop CSV file here</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">or click to browse filesystem</p>
                  </div>
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">Supports .csv files only</span>
                </div>
              )}
            </div>

            <button
              id="import-submit-btn"
              type="submit"
              disabled={!file || uploading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              <span className="text-xs font-semibold tracking-wide">
                {uploading ? 'Processing file...' : 'Import Expenses'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
