import { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Loader2,
  FileText, TrendingUp, TrendingDown, Info, ChevronDown, ChevronRight
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const cfg = {
    success: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={11} />, label: 'Imported' },
    warning: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <AlertTriangle size={11} />, label: 'Warning' },
    error: { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <XCircle size={11} />, label: 'Failed' },
    skipped: { cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <Info size={11} />, label: 'Skipped' },
  };
  const c = cfg[status] || cfg.skipped;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
};

export default function ImportReport() {
  const { importId } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState('');

  const fetchReportDetails = async () => {
    try {
      const res = await api.get(`/imports/${importId}/report`);
      setReport(res.data.data);
    } catch {
      setError('Failed to load import report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
  }, [importId]);

  const handleCommit = async () => {
    if (!groupId) {
      setError('Group ID is missing.');
      return;
    }
    setCommitting(true);
    setError('');
    setCommitSuccess('');
    try {
      const res = await api.post(`/groups/${groupId}/imports/${importId}/commit`);
      setCommitSuccess(res.data.message || 'Import committed successfully!');
      await fetchReportDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to commit import');
    } finally {
      setCommitting(false);
    }
  };

  const toggleRow = (idx) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={32} className="text-emerald-400 animate-spin" />
    </div>
  );

  const rows = report?.rows || [];
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);
  const stats = {
    total: rows.length,
    success: rows.filter(r => r.status === 'success').length,
    warning: rows.filter(r => r.status === 'warning').length,
    error: rows.filter(r => r.status === 'error').length,
    skipped: rows.filter(r => r.status === 'skipped').length,
  };

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <button
          onClick={() => groupId ? navigate(`/groups/${groupId}`) : navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
          <h1 className="text-2xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-violet-400" />
            Import Report
          </h1>
          {report?.job?.status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
              <CheckCircle size={13} /> Imported Successfully
            </span>
          ) : (
            <button
              id="commit-import-btn"
              onClick={handleCommit}
              disabled={committing || stats.success === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
            >
              {committing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              <span className="text-xs font-semibold tracking-wide">
                Commit {stats.success} Records
              </span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 px-4 py-3 rounded-xl text-xs font-medium">
            <XCircle size={14} className="flex-shrink-0 text-rose-400" /> {error}
          </div>
        )}

        {commitSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-4 py-3 rounded-xl text-xs font-medium">
            <CheckCircle size={14} className="flex-shrink-0 text-emerald-400" /> {commitSuccess}
          </div>
        )}

        {report && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Rows', value: stats.total, icon: <FileText size={14} />, color: 'text-slate-400' },
                { label: 'Imported', value: stats.success, icon: <CheckCircle size={14} />, color: 'text-emerald-400' },
                { label: 'Warnings', value: stats.warning, icon: <AlertTriangle size={14} />, color: 'text-amber-405' },
                { label: 'Failed', value: stats.error + stats.skipped, icon: <XCircle size={14} />, color: 'text-rose-400' },
              ].map(s => (
                <div key={s.label} className="glass-panel p-4">
                  <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${s.color}`}>
                    {s.icon}
                    <span>{s.label}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-100">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Overall Progress Bar */}
            <div className="glass-panel p-4 mb-6">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-slate-400 font-semibold">Import Success Rate</span>
                <span className="text-slate-200 font-bold">
                  {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 border border-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-650 transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['all', 'success', 'warning', 'error', 'skipped'].map(f => (
                <button
                  key={f}
                  id={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold capitalize transition-all duration-200 cursor-pointer ${
                    filter === f
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300 shadow-md shadow-violet-500/5'
                      : 'border-white/[0.08] bg-slate-900/40 text-slate-450 hover:text-slate-200'
                  }`}
                >
                  {f} {f === 'all' ? `(${stats.total})` : f === 'success' ? `(${stats.success})` : f === 'warning' ? `(${stats.warning})` : f === 'error' ? `(${stats.error})` : `(${stats.skipped})`}
                </button>
              ))}
            </div>

            {/* Rows Table */}
            <div className="glass-panel overflow-hidden border border-white/[0.08] mb-12">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-slate-950/20">
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 w-12 text-center">#</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-400">Description</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-400">Amount</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-400">Date</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-400">Status</th>
                      <th className="px-4 py-3.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-sans">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500 text-xs font-medium">
                          No matching records found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row, idx) => (
                        <Fragment key={idx}>
                          <tr
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                            onClick={() => (row.errors?.length > 0 || row.warnings?.length > 0) && toggleRow(idx)}
                          >
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs text-center">{row.row_number || idx + 1}</td>
                            <td className="px-4 py-3 text-slate-200 text-xs font-medium">{row.description || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                              {row.currency} {parseFloat(row.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.date || '—'}</td>
                            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                            <td className="px-4 py-3 text-slate-500">
                              {(row.errors?.length > 0 || row.warnings?.length > 0) && (
                                expandedRows.has(idx) ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />
                              )}
                            </td>
                          </tr>
                          {expandedRows.has(idx) && (row.errors?.length > 0 || row.warnings?.length > 0) && (
                            <tr key={`exp-${idx}`}>
                              <td colSpan={6} className="bg-slate-950/45 px-6 py-4 border-l-2 border-l-violet-500">
                                {row.errors?.map((err, ei) => (
                                  <div key={ei} className="flex items-start gap-2 text-rose-350 text-xs font-medium mb-1.5">
                                    <XCircle size={12} className="mt-0.5 flex-shrink-0 text-rose-400" />
                                    <span>Error: {err}</span>
                                  </div>
                                ))}
                                {row.warnings?.map((warn, wi) => (
                                  <div key={wi} className="flex items-start gap-2 text-amber-350 text-xs font-medium mb-1.5">
                                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-400" />
                                    <span>Warning: {warn}</span>
                                  </div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
