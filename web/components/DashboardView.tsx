import React from 'react';
import { Activity } from 'lucide-react';
import { LogTerminal } from './LogTerminal';
import { LogEntry } from '../types';

interface DashboardViewProps {
  stats: {
    total_plugins: number;
    installed_repos: number;
    watched_repos: number;
  };
  logs: LogEntry[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, logs }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Stats Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-slate-400 text-sm mb-1">Total Plugins</p>
            <p className="text-3xl font-bold text-white">{stats.total_plugins}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-slate-400 text-sm mb-1">Installed Repos</p>
            <p className="text-3xl font-bold text-indigo-400">{stats.installed_repos}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-slate-400 text-sm mb-1">Watched Repos</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.watched_repos}</p>
          </div>
        </div>

        {/* Recent Activity / "Python Logic Visualization" */}
        <div className="flex-1 h-[calc(100%-140px)] min-h-[400px]">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Automation Logs
          </h3>
          <LogTerminal logs={logs} />
        </div>
      </div>

      {/* Right Column: Quick Status */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-6 rounded-xl">
          <h3 className="font-bold text-lg text-white mb-2">ShadowViewer PluginStore</h3>
          <p className="text-sm text-slate-300 mb-4">
            ShadowViewer 插件商店专为 ShadowViewer App 提供，所有插件必须在 ShadowViewer 内安装后才能正常运行。
          </p>
          <a href="https://github.com/kitUIN/ShadowViewer/releases/latest" target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">点击前往下载地址 →</a>
        </div>
      </div>
    </div>
  );
};
