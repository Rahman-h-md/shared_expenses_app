import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, PlusCircle, Minus, Loader2, AlertCircle, Trash2, DollarSign } from 'lucide-react';

const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal Split', desc: 'Divide evenly among selected members' },
  { value: 'percentage', label: 'Percentage Split', desc: 'Specify % for each member' },
  { value: 'exact', label: 'Exact Amount', desc: 'Specify exact amount for each member' },
  { value: 'shares', label: 'Share-Based', desc: 'Assign share ratios' },
];

export default function AddExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    description: '',
    total_amount: '',
    currency: 'USD',
    expense_date: new Date().toISOString().split('T')[0],
    split_type: 'equal',
    paid_by_member_id: '',
    notes: '',
  });

  const [splits, setSplits] = useState([]);
  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY'];

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const [mRes, gRes] = await Promise.all([
          api.get(`/groups/${groupId}/members`),
          api.get(`/groups/${groupId}`),
        ]);
        const m = mRes.data.data || [];
        setMembers(m);
        setForm(f => ({
          ...f,
          currency: gRes.data.data?.currency || 'USD',
          paid_by_member_id: m[0]?.id || '',
        }));
        setSplits(m.map(mem => ({ member_id: mem.id, name: mem.user_name, value: '' })));
      } catch {
        setError('Failed to load members');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [groupId]);

  const handleSplitChange = (idx, val) => {
    setSplits(s => s.map((sp, i) => i === idx ? { ...sp, value: val } : sp));
  };

  const getValidationError = () => {
    const total = parseFloat(form.total_amount);
    if (!form.description.trim()) return 'Description is required';
    if (!total || total <= 0) return 'Amount must be positive';
    if (!form.paid_by_member_id) return 'Select who paid';

    if (form.split_type !== 'equal') {
      const sum = splits.reduce((acc, s) => acc + (parseFloat(s.value) || 0), 0);
      if (form.split_type === 'percentage' && Math.abs(sum - 100) > 0.01) return `Percentages must sum to 100% (currently ${sum.toFixed(1)}%)`;
      if (form.split_type === 'exact' && Math.abs(sum - total) > 0.01) return `Exact amounts must sum to ${total} (currently ${sum.toFixed(2)})`;
      if (form.split_type === 'shares' && sum === 0) return 'At least one share must be > 0';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = getValidationError();
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        total_amount: parseFloat(form.total_amount),
        splits: form.split_type === 'equal'
          ? splits.map(s => ({ member_id: s.member_id }))
          : splits.map(s => ({ member_id: s.member_id, value: parseFloat(s.value) || 0 })),
      };
      await api.post(`/groups/${groupId}/expenses`, payload);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={32} className="text-emerald-400 animate-spin" />
    </div>
  );

  const splitTotal = splits.reduce((acc, s) => acc + (parseFloat(s.value) || 0), 0);

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
            <DollarSign size={20} className="text-violet-400" />
            Add Expense
          </h1>
          <p className="text-slate-400 text-sm mb-6">Record a shared expense for your group</p>

          {error && (
            <div className="mb-5 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-405 px-4 py-3 rounded-xl text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-455" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1.5">Description *</label>
              <input
                id="expense-description"
                type="text"
                required
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="e.g., Hotel booking, Dinner"
                className="input-field"
              />
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5">Amount *</label>
                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.total_amount}
                  onChange={e => setForm({...form, total_amount: e.target.value})}
                  placeholder="0.00"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5">Currency</label>
                <select
                  id="expense-currency"
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                  className="input-field font-mono"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Date & Paid By */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5">Date</label>
                <input
                  id="expense-date"
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm({...form, expense_date: e.target.value})}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5">Paid By *</label>
                <select
                  id="expense-paid-by"
                  value={form.paid_by_member_id}
                  onChange={e => setForm({...form, paid_by_member_id: e.target.value})}
                  className="input-field"
                >
                  {members.map(m => <option key={m.id} value={m.id}>{m.user_name}</option>)}
                </select>
              </div>
            </div>

            {/* Split Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-2">Split Method</label>
              <div className="grid grid-cols-2 gap-2">
                {SPLIT_TYPES.map(st => (
                  <button
                    key={st.value}
                    type="button"
                    id={`split-${st.value}`}
                    onClick={() => setForm({...form, split_type: st.value})}
                    className={`text-left px-4 py-3 border rounded-xl transition-all duration-200 cursor-pointer ${
                      form.split_type === st.value
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300 shadow-md shadow-violet-500/5'
                        : 'border-white/[0.08] bg-slate-900/40 text-slate-400 hover:border-white/[0.15] hover:text-slate-200'
                    }`}
                  >
                    <div className="font-display font-bold text-xs tracking-wide">{st.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Split Values */}
            {form.split_type !== 'equal' && (
              <div className="bg-slate-950/40 border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-300">
                    {form.split_type === 'percentage' ? 'Percentages' :
                     form.split_type === 'exact' ? 'Exact Amounts' : 'Shares'}
                  </h3>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border ${
                    form.split_type === 'percentage'
                      ? Math.abs(splitTotal - 100) < 0.01 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : form.split_type === 'exact'
                      ? Math.abs(splitTotal - parseFloat(form.total_amount || 0)) < 0.01 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-slate-350 bg-slate-900 border-white/[0.08]'
                  }`}>
                    Total: {splitTotal.toFixed(2)}
                    {form.split_type === 'percentage' ? '%' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {splits.map((s, idx) => (
                    <div key={s.member_id} className="flex items-center gap-3">
                      <span className="text-slate-300 text-xs font-medium w-24 truncate">{s.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.value}
                        onChange={e => handleSplitChange(idx, e.target.value)}
                        placeholder="0"
                        className="input-field flex-1 py-2 text-xs font-mono"
                      />
                      <span className="text-slate-500 text-xs w-6 text-right font-semibold">
                        {form.split_type === 'percentage' ? '%' : form.split_type === 'exact' ? form.currency : 'pt'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1.5">Notes (optional)</label>
              <textarea
                id="expense-notes"
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Any additional details..."
                rows={2}
                className="input-field resize-none py-2.5"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => navigate(`/groups/${groupId}`)} 
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button 
                id="add-expense-submit" 
                type="submit" 
                disabled={submitting} 
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                <span className="text-xs font-semibold tracking-wide">
                  {submitting ? 'Adding...' : 'Add Expense'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
