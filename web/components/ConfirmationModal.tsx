import React from 'react';
import { RepositoryBasicModel } from '../types';

interface ConfirmationModalProps {
  repo: RepositoryBasicModel;
  isWatched: boolean;
  isUpdating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ repo, isWatched, isUpdating, onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-indigo-500/10">
        <h3 className="text-xl font-bold text-white mb-4">{isWatched ? 'Confirm Application' : 'Confirm Unwatch'}</h3>
        <p className="text-slate-400 mb-6 leading-relaxed">
          {isWatched ? (
            <>Please confirm to apply the current repository <span className="text-indigo-400 font-mono">{repo.name}</span> as a plugin. If successful, releases published by this repository will be automatically merged into the Plugin Store as new versions.</>
          ) : (
            <>Please confirm to stop watching the repository <span className="text-indigo-400 font-mono">{repo.name}</span>. If successful, releases from this repository will no longer be automatically merged into the Plugin Store.</>
          )}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isWatched ? 'Confirm Apply' : 'Confirm Unwatch'}
          </button>
        </div>
      </div>
    </div>
  );
};
