import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, BarChart2, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function BalanceSummary() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settling, setSettling] = useState(null);
  const [settleSuccess, setSettleSuccess] = useState('');

  const fetchBalances = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/balances`);
      setData(res.data.data);
    } catch {
      setError('Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [groupId]);

  const handleSettle = async (settlement) => {
    setSettling(settlement.from_member_id + '-' + settlement.to_member_id);
    setSettleSuccess('');
    try {
      await api.post(`/groups/${groupId}/settlements`, {
        payer_member_id: settlement.from_member_id,
        payee_member_id: settlement.to_member_id,
        amount: settlement.amount,
        currency: settlement.currency,
        notes: `Settling balance`,
      });
      setSettleSuccess(`Settlement of ${settlement.currency} ${settlement.amount.toFixed(2)} recorded!`);
      fetchBalances();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={24} className="text-cyber-lime animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <button 
          onClick={() => navigate(`/groups/${groupId}`)} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back to Group
        </button>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart2 size={20} className="text-violet-400" /> Balance Summary
          </h1>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 px-4 py-3 rounded-xl text-xs font-medium">
            <AlertCircle size={14} className="flex-shrink-0 text-rose-400" /> {error}
          </div>
        )}
        {settleSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-4 py-3 rounded-xl text-xs font-medium">
            <CheckCircle size={14} className="flex-shrink-0 text-emerald-400" /> {settleSuccess}
          </div>
        )}

        {data && (
          <>
            {/* Member Balances */}
            <div className="glass-panel p-6 mb-6">
              <h2 className="text-sm font-semibold text-white mb-4 pb-2 border-b border-white/[0.06]">Member Balances</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.member_balances || []).map((m) => {
                  const balance = parseFloat(m.net_balance);
                  const isPositive = balance > 0;
                  const isZero = Math.abs(balance) < 0.01;
                  return (
                    <div key={m.member_id} className="bg-white/[0.01] rounded-xl p-4 border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08] transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 text-violet-300 font-display font-bold text-xs flex items-center justify-center">
                            {m.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-200">{m.user_name}</span>
                        </div>
                        {isZero ? (
                          <Minus size={12} className="text-slate-600" />
                        ) : isPositive ? (
                          <TrendingUp size={12} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={12} className="text-rose-400" />
                        )}
                      </div>
                      <div className={`text-base font-mono font-bold ${isZero ? 'text-slate-500' : isPositive ? 'text-emerald-450' : 'text-rose-450'}`}>
                        {isPositive ? '+' : ''}{data.currency} {balance.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {isZero ? 'Settled up' : isPositive ? 'Gets back' : 'Owes'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Settlements */}
            <div className="glass-panel p-6">
              <h2 className="text-sm font-semibold text-white mb-1">Suggested Settlements</h2>
              <p className="text-slate-500 text-xs mb-4">Minimum transactions to settle all debts</p>

              {(data.settlements || []).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
                  <CheckCircle size={24} className="text-emerald-450 mx-auto mb-2" />
                  <p className="text-emerald-400 font-semibold text-sm">All settled up! 🎉</p>
                  <p className="text-slate-500 text-xs mt-1">No outstanding balances in this group</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(data.settlements || []).map((s, idx) => {
                    const key = s.from_member_id + '-' + s.to_member_id;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08] rounded-xl px-4 py-2.5 transition-colors">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-rose-400">{s.from_name}</span>
                          <span className="text-slate-500 font-medium">pays</span>
                          <span className="font-semibold text-emerald-400">{s.to_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-slate-200">{s.currency} {s.amount.toFixed(2)}</span>
                          <button
                            id={`settle-btn-${idx}`}
                            onClick={() => handleSettle(s)}
                            disabled={settling === key}
                            className="btn-primary text-[10px] px-3.5 py-2 disabled:opacity-60 flex items-center gap-1.5"
                          >
                            {settling === key ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                            <span>Settle</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
