import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-slate-950/45 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-7.5 h-7.5 bg-gradient-to-br from-violet-500 to-indigo-650 text-white font-display font-extrabold text-sm rounded-lg flex items-center justify-center shadow-md shadow-violet-500/10 group-hover:shadow-violet-500/20 transition-all duration-200">
                $
              </div>
              <span className="font-display font-extrabold text-sm tracking-wider text-slate-100">
                Share<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Pay</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="text-slate-400 hover:text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-transparent hover:bg-white/[0.04]"
            >
              <LayoutDashboard size={14} className="text-slate-500" />
              <span>Dashboard</span>
            </Link>
            
            <div className="h-4 w-px bg-white/[0.08]"></div>
            
            <div className="flex items-center gap-2 text-xs text-slate-350 bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">{user?.firstName}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 transition-colors p-2 rounded-xl bg-transparent hover:bg-rose-500/10 cursor-pointer"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
