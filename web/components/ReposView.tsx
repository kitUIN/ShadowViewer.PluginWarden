import React from 'react';
import { Github } from 'lucide-react';
import { RepositoryBasicModel } from '../types';

interface ReposViewProps {
  repos: RepositoryBasicModel[];
  onViewReleases: (repo: RepositoryBasicModel) => void;
  onConfirmAction: (repoId: number, watched: boolean) => void;
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
                    {repo.releases.length} total · {repo.releases.filter(r => r.visible).length} open
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onConfirmAction(repo.id, !repo.watched)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        repo.watched ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`${
                          repo.watched ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${repo.watched ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {repo.watched ? 'Watched' : 'Unwatched'}
                    </span>
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
