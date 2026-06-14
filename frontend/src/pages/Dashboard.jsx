import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Users, TrendingUp, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', currency: 'USD' });
  const [creating, setCreating] = useState(false);

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD'];

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data.data || []);
    } catch {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/groups', newGroup);
      setNewGroup({ name: '', description: '', currency: 'USD' });
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1.5 font-display">
              Welcome Back, {user?.firstName || 'User'}
            </div>
            <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Your Groups</h1>

          </div>
          <button
            id="create-group-btn"
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <PlusCircle size={14} />
            <span className="text-xs font-semibold tracking-wide">New Group</span>
          </button>
        </div>

        {/* Create Group Form */}
        {showCreate && (
          <div className="glass-panel p-6 mb-8 border-t-2 border-t-violet-500">
            <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-violet-400" />
              Create New Group
            </h2>
            <form onSubmit={handleCreateGroup} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-350 mb-1.5">Group Name *</label>
                <input
                  id="group-name-input"
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Manali Trip 2026"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-355 mb-1.5">Description</label>
                <input
                  type="text"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Optional description note"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-355 mb-1.5">Base Currency</label>
                <select
                  id="group-currency-select"
                  value={newGroup.currency}
                  onChange={(e) => setNewGroup({ ...newGroup, currency: e.target.value })}
                  className="input-field"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)} 
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  id="create-group-submit" 
                  type="submit" 
                  disabled={creating} 
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  {creating && <Loader2 size={12} className="animate-spin" />}
                  <span className="text-xs font-semibold tracking-wide">
                    {creating ? 'Creating...' : 'Create Group'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-405 px-4 py-3 rounded-xl text-xs font-medium">
            <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {/* Groups Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-400 mb-4">
              <Users size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">No groups yet</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">Create your first group to start tracking and splitting expenses.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                id={`group-card-${group.id}`}
                className="glass-panel p-6 hover:border-violet-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-650/5 group transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all duration-300">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-semibold bg-white/[0.04] border border-white/[0.06] text-slate-300 px-2.5 py-1 rounded-lg">
                    {group.currency}
                  </span>
                </div>
                <h3 className="font-display font-bold text-slate-200 text-lg leading-tight mb-1 group-hover:text-violet-300 transition-colors">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-slate-400 text-xs mb-3 line-clamp-2 leading-relaxed">{group.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <TrendingUp size={13} className="text-violet-400/80" />
                    <span>{group.member_count || 0} members</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
