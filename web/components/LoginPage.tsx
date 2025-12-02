import React from 'react';
import { Github, Store, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] translate-y-1/2 pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl shadow-black/50 relative z-10">
        <div className="flex flex-col items-center text-center">
          
          {/* Logo / Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-300 border border-white/10">
            <Store className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Plugin<span className="text-indigo-400">Warden</span>
          </h1>
          
          <p className="text-slate-400 mb-8 text-sm leading-relaxed max-w-[280px]">
            Automated plugin management and release monitoring for the ShadowViewer ecosystem.
          </p>

          <div className="w-full space-y-6">
            <button
              onClick={handleLogin}
              className="group w-full flex items-center justify-center gap-3 bg-[#24292f] hover:bg-[#2f363d] text-white py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 border border-slate-700 hover:border-slate-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Continue with GitHub</span>
            </button>
            
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-3 h-3" />
              <span>Secure access via GitHub OAuth</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-slate-600 text-xs font-medium">
          ShadowViewer Project &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
