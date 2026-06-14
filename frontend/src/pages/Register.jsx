import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/login', { state: { message: 'Registration successful! Please sign in with your credentials.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!form.password) return null;
    if (form.password.length < 6) return { level: 'Weak', color: 'bg-rose-500' };
    if (form.password.length < 10) return { level: 'Fair', color: 'bg-amber-500' };
    return { level: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-display font-extrabold text-xl shadow-lg shadow-violet-500/20 mb-4">
            $
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1.5">Join SharePay and split expenses easily</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8">
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-450 px-4 py-3 rounded-xl text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-slate-355 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-slate-355 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="name@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-medium text-slate-355 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 8 characters"
                  className="input-field pl-10"
                />
              </div>
              {strength && (
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <div className="flex-1 h-1 bg-slate-900 border border-white/[0.04] rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${
                      strength.level === 'Weak' ? 'bg-rose-500 w-1/3' : 
                      strength.level === 'Fair' ? 'bg-amber-500 w-2/3' : 
                      'bg-emerald-500 w-full'
                    }`} />
                  </div>
                  <span className="text-slate-500 font-medium">{strength.level}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-medium text-slate-355 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-confirm"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm password"
                  className="input-field pl-10"
                />
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <CheckCircle size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              <span className="text-sm font-semibold tracking-wide">
                {loading ? 'Creating Account...' : 'Create Account'}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
