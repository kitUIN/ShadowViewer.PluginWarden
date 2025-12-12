import React from 'react';
import { Github } from 'lucide-react';
import { RepositoryBasicModel } from '../types';

interface ReleasesModalProps {
  repo: RepositoryBasicModel;
  onClose: () => void;
  onToggleVisible: (releaseId: number, currentVisible: boolean) => void;
}

export const ReleasesModal: React.FC<ReleasesModalProps> = ({ repo, onClose, onToggleVisible }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-indigo-500/10 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            Releases for <span className="text-indigo-400 font-mono">{repo.name}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold px-2">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scrollbar">
          {repo.releases.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No releases found.</p>
          ) : (
            repo.releases.map(release => (
              <div key={release.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg text-white">{release.tag_name}</h4>
                      {release.draft && <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">Draft</span>}
                      {release.prerelease && <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Pre-release</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Published on {new Date(release.published_at).toLocaleDateString()} at {new Date(release.published_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className={`text-xs font-medium ${release.visible ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {release.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <button
                      onClick={() => onToggleVisible(release.id, release.visible)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${release.visible ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${release.visible ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-400 line-clamp-2 mb-2 font-mono bg-slate-900 p-2 rounded border border-slate-800/50">
                  {release.body || "No description provided."}
                </div>
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit"
                >
                  View on GitHub <Github className="w-3 h-3" />
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
