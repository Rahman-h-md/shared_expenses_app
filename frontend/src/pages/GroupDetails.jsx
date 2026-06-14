import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Users, PlusCircle, Upload, BarChart2, History,
  UserPlus, Trash2, Loader2, AlertCircle, ArrowLeft, Crown
} from 'lucide-react';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const fetchAll = async () => {
    try {
      const [gRes, mRes, eRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/members`),
        api.get(`/groups/${groupId}/expenses?limit=100`),
      ]);
      setGroup(gRes.data.data);
      setMembers(mRes.data.data || []);
      setExpenses(eRes.data.data || []);
    } catch {
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [groupId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    try {
      await api.post(`/groups/${groupId}/members`, { email: inviteEmail });
      setInviteEmail('');
      fetchAll();
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the group?')) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      fetchAll();
    } catch {
      setError('Failed to remove member');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={24} className="text-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Back */}
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to Dashboard
        </button>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-405 px-4 py-3 rounded-xl text-xs font-medium">
            <AlertCircle size={14} className="flex-shrink-0 text-rose-450" /> {error}
          </div>
        )}

        {/* Group Header */}
        {group && (
          <div className="glass-panel p-6 mb-6 border-t-2 border-t-violet-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">{group.name}</h1>
                {group.description && <p className="text-slate-400 text-xs mt-1">{group.description}</p>}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/[0.04] border border-white/[0.06] text-slate-350 px-2.5 py-1 rounded-lg">
                    Base Currency: {group.currency}
                  </span>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5">
                <Link id="add-expense-btn" to={`/groups/${groupId}/add-expense`} className="btn-primary flex items-center gap-1.5 text-xs">
                  <PlusCircle size={12} /> Add Expense
                </Link>
                <Link to={`/groups/${groupId}/balance`} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <BarChart2 size={12} /> Balances
                </Link>
                <Link to={`/groups/${groupId}/settlements`} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <History size={12} /> Settlements
                </Link>
                <Link to={`/groups/${groupId}/import`} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Upload size={12} /> Import CSV
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Members Panel */}
          <div className="glass-panel p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <Users size={14} className="text-violet-400" />
              Members ({members.length})
            </h2>

            {/* Invite */}
            <form onSubmit={handleInvite} className="mb-4">
              <div className="flex gap-2">
                <input
                  id="invite-email-input"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  placeholder="Invite by email"
                  className="input-field text-xs py-2 flex-1"
                />
                <button id="invite-btn" type="submit" disabled={inviting} className="btn-primary px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-60">
                  {inviting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                </button>
              </div>
              {inviteError && <p className="text-rose-450 text-[10px] mt-1">{inviteError}</p>}
            </form>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 text-violet-300 font-display font-bold text-xs flex items-center justify-center">
                      {m.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-200 font-medium truncate max-w-[120px]">{m.user_name}</span>
                        {m.role === 'admin' && <Crown size={11} className="text-amber-450" />}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{m.user_email}</span>
                    </div>
                  </div>
                  {m.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1.5 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Group Expenses */}
          <div className="glass-panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <History size={14} className="text-violet-400" />
                Ledger Activities ({expenses.length})
              </h2>
              <Link to={`/groups/${groupId}/balance`} className="text-violet-400 hover:text-violet-350 text-xs font-semibold hover:underline">
                Analyze Balances →
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-16 text-slate-500 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
                <PlusCircle size={24} className="mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">No expenses logged inside this network.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{exp.description}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Paid by <span className="text-slate-350 font-semibold">{exp.paid_by_name}</span> · {new Date(exp.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-mono font-bold text-sm">
                        {exp.currency} {parseFloat(exp.total_amount).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-500 capitalize block">{exp.split_type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
