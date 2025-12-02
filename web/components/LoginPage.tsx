import React from 'react';
import { Github } from 'lucide-react';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200">
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-lg shadow-xl text-center max-w-md w-full">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">
         ShadowViewer Plugin <span className="text-indigo-400">Mgr</span>
        </h1>
 
        <p className="mb-8 text-slate-400">
          Please log in to continue
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#24292f] hover:bg-[#1f2937] text-white rounded-md font-medium transition-colors duration-200"
        >
          <Github size={20} />
          Login with GitHub
        </button>
      </div>
    </div>
  );
}
