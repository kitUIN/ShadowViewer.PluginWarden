import React from 'react';
import { Plus, Github, Eye, Send, EyeOff } from 'lucide-react';
import { RepositoryBasicModel } from '../types';

interface ReposViewProps {
  repos: RepositoryBasicModel[];
  onViewReleases: (repo: RepositoryBasicModel) => void;
  onConfirmAction: (repo: RepositoryBasicModel, watched: boolean) => void;
}

export const ReposView: React.FC<ReposViewProps> = ({ repos, onViewReleases, onConfirmAction }) => {
  return (
    <div className="space-y-6">

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Repository Name</th>
              <th className="px-6 py-4">Author</th>
              <th className="px-6 py-4">Releases</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {repos.map(repo => (
              <tr key={repo.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <Github className="w-4 h-4 text-slate-500" />
                  <div className="flex flex-col">
                    <a href={repo.html_url} target="_blank" rel="noreferrer" className="font-mono text-slate-300 hover:text-indigo-400 transition-colors">{repo.name}</a>
                    <span className="text-xs text-slate-500">{repo.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {repo.author ? (
                    <div className="flex items-center gap-2">
                      <img src={repo.author.avatar_url} alt={repo.author.login} className="w-6 h-6 rounded-full" />
                      <span className="text-slate-400">{repo.author.login}</span>
                    </div>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onViewReleases(repo)}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    {repo.releases.length} Releases
                  </button>
                </td>
                <td className="px-6 py-4">
                  {repo.watched ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Eye className="w-3 h-3" />
                      Watched
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Send className="w-3 h-3" />
                      Needs Apply
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {!repo.watched ? (
                      <button
                        onClick={() => onConfirmAction(repo, true)}
                        className="px-3 py-1 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-md transition-colors flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Apply
                      </button>
                    ) : (
                      <button
                        onClick={() => onConfirmAction(repo, false)}
                        className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-400 text-white rounded-md transition-colors flex items-center gap-1"
                      >
                        <EyeOff className="w-3 h-3" />
                        Unwatch
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
