import React from 'react';
import { Github } from 'lucide-react';

export const InstallModal: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl shadow-indigo-500/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="w-20 h-20 bg-slate-800 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-slate-700 shadow-inner">
          <img src="/icon.png" alt="App Icon" className="w-12 h-12 object-contain" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">Setup Required</h3>

        <p className="text-slate-400 mb-8 leading-relaxed">
          No repositories are currently installed. This tool monitors your repositories for new releases and automatically imports them into the ShadowViewer Plugin Store.
        </p>

        <a
          href="https://github.com/apps/shadowviewerpluginwarden/installations/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20 w-full"
        >
          <Github className="w-5 h-5" />
          Install GitHub App
        </a>

        <p className="mt-4 text-xs text-slate-500">
          You'll be redirected to GitHub to select repositories.
        </p>
      </div>
    </div>
  );
};
