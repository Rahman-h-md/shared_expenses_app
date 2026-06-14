import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, TrendingUp, CheckCircle, Activity, Zap, Layers } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative bg-[#060813] text-slate-100 overflow-x-hidden font-sans">
      
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        
        {/* Subtle grid mesh overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Floating Header */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-display font-extrabold text-lg rounded-lg flex items-center justify-center shadow-md shadow-violet-500/20">
            $
          </div>
          <span className="font-display font-extrabold text-sm tracking-wider text-slate-100">
            Share<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Pay</span>
          </span>
        </div>

      </header>

      {/* Hero Section Container */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 flex-1 flex items-center justify-center z-10 relative py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* Left Column: Interactive Glass Mockup (Image 1 reference) */}
          <div className="lg:col-span-6 flex justify-center items-center relative order-2 lg:order-1">
            
            {/* Ambient background glow circle */}
            <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-violet-600/15 via-indigo-500/10 to-cyan-400/10 blur-[80px] pointer-events-none animate-pulse" />
            
            <div className="relative w-full max-w-sm sm:max-w-md">
              {/* Primary Glass Card (Performance Chart Mockup) */}
              <div className="glass-panel p-6 border-white/[0.06] shadow-2xl relative overflow-hidden backdrop-blur-xl hover:border-violet-500/20 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Activity size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white tracking-wide font-display">Performance</h3>
                      <p className="text-[10px] text-slate-500">Live ledger activity</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-emerald-950"></span>
                </div>

                {/* SVG Glowing Line Graph */}
                <div className="h-32 w-full my-4 relative">
                  <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#a7f3d0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path 
                      d="M0,80 Q50,30 100,60 T200,20 T300,30 L300,100 L0,100 Z" 
                      fill="url(#chart-glow)"
                    />
                    {/* Stroke Line */}
                    <path 
                      d="M0,80 Q50,30 100,60 T200,20 T300,30" 
                      fill="none" 
                      stroke="url(#line-grad)" 
                      strokeWidth="3" 
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Pulsing indicator dot on chart peak */}
                  <div className="absolute top-[28%] left-[67%] -translate-x-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300"></span>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/[0.04]">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold font-display">Growth Rate</span>
                    <div className="text-3xl font-display font-black text-white leading-none mt-1">135K%</div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <TrendingUp size={10} />
                    <span>+12.4%</span>
                  </div>
                </div>
              </div>

              {/* Secondary Overlapping Glass Card (Split details) */}
              <div className="glass-panel p-4 absolute -bottom-6 -right-4 sm:-right-8 w-56 border-white/[0.08] border-l-2 border-l-violet-500 shadow-2xl backdrop-blur-xl hover:border-violet-500/30 hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px]">
                    $
                  </div>
                  <span className="text-[10px] font-semibold text-slate-200 font-display">Real-Time Split</span>
                </div>
                
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                    <span className="text-slate-400 font-medium">Alice paid Dinner</span>
                    <span className="font-mono text-white">$90.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60" />
                      Bob owes Alice
                    </span>
                    <span className="font-mono text-rose-400 font-semibold">-$30.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60" />
                      Charlie owes Alice
                    </span>
                    <span className="font-mono text-rose-400 font-semibold">-$30.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Information */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left order-1 lg:order-2">
            
            {/* Elegant Tech Badge */}
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 font-display font-medium text-[10px] tracking-wider uppercase text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Ledger Terminal v1.0
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-display font-black text-white leading-[1.12] tracking-tight mb-5">
              Split the bill, <br />
              <span className="relative inline-block bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent pb-1">
                not the bond.
                <svg className="absolute left-0 bottom-0 w-full h-1 text-cyan-400/60" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,5 Q50,0 100,5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm mb-8 max-w-md leading-relaxed">
              Ditch complex calculations and spreadsheet audits. <strong className="text-slate-200">SharePay</strong> is a high-performance financial ledger designed to track, split, and settle group expenses with absolute precision.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-8">
              <button
                onClick={handleGetStarted}
                className="group btn-primary flex items-center justify-center gap-2.5 px-7 py-4 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-violet-500/25"
              >
                <span className="text-xs font-bold uppercase tracking-wider font-display">Get Started</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              
              <div className="flex items-center gap-2 justify-center sm:justify-start text-[10px] font-bold text-slate-500 font-display px-2 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                <span>Instant ledger creation</span>
              </div>
            </div>

            {/* Feature Highlights Grid (Glass Micro-cards) */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6">
              <div className="group/card bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-violet-500/20 p-4.5 rounded-2xl transition-all duration-300">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover/card:scale-110 transition-transform">
                    <Zap size={13} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider font-display text-slate-200">Sub-second Sync</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">Ledger balances compile in real-time. Instantly sync debt records for all group members.</p>
              </div>
              <div className="group/card bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-cyan-500/20 p-4.5 rounded-2xl transition-all duration-300">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover/card:scale-110 transition-transform">
                    <Layers size={13} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider font-display text-slate-200">Group Ledgers</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">Maintain clean ledger histories. Generate reports, import CSV records, and settle debts instantly.</p>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-[10px] text-slate-600 z-10 border-t border-white/[0.04] bg-[#04050a]/40 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; {new Date().getFullYear()} SharePay. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Documentation</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
