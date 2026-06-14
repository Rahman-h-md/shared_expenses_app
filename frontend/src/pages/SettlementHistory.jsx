import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, History, Trash2, Loader2, AlertCircle, CheckCircle, User } from 'lucide-react';

export default function SettlementHistory() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSettlements = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/settlements`);
      setSettlements(res.data.data || []);
    } catch {
      setError('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettlements(); }, [groupId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this settlement record?')) return;
    try {
      await api.delete(`/groups/${groupId}/settlements/${id}`);
      fetchSettlements();
    } catch {
      setError('Failed to delete settlement');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={24} className="text-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <button 
          onClick={() => navigate(`/groups/${groupId}`)} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back to Group
        </button>

        <h1 className="text-2xl font-display font-extrabold text-white tracking-tight mb-6 flex items-center gap-2">
          <History size={20} className="text-violet-400" />
          Settlement History
        </h1>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 px-4 py-3 rounded-xl text-xs font-medium">
            <AlertCircle size={14} className="flex-shrink-0 text-rose-400" /> {error}
          </div>
        )}

        {settlements.length === 0 ? (
          <div className="glass-panel text-center py-16 border border-dashed border-white/[0.06] bg-white/[0.01]">
            <CheckCircle size={24} className="text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-slate-300 font-semibold text-sm">No settlements yet</h3>
            <p className="text-slate-500 text-xs mt-1">Settlements will appear here once recorded</p>
          </div>
        ) : (
          <div className="glass-panel divide-y divide-white/[0.06] overflow-hidden">
            {settlements.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle size={14} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-rose-400">{s.payer_name}</span>
                      <span className="text-slate-500 font-medium">paid</span>
                      <span className="font-semibold text-emerald-400">{s.payee_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(s.settled_at || s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {s.notes && ` · "${s.notes}"`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-slate-200">{s.currency} {parseFloat(s.amount).toFixed(2)}</span>
                  <button
                    id={`delete-settlement-${s.id}`}
                    onClick={() => handleDelete(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-all p-1.5 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
