import React from 'react';
import { LogEntry } from '../types';
import { Terminal, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface LogTerminalProps {
  logs: LogEntry[];
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs }) => {
  const getIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-300';
      case 'error': return 'text-red-300';
      case 'warning': return 'text-yellow-300';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-400">Automation Runner (Python Backend)</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div className="p-4 overflow-y-auto font-mono text-xs space-y-2 flex-1 scrollbar-hide">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 items-start animate-fade-in">
            <span className="text-slate-500 min-w-[60px]">{log.timestamp}</span>
            <div className="mt-0.5">{getIcon(log.level)}</div>
            <span className={`${getColor(log.level)} break-all`}>{log.message}</span>
          </div>
        ))}
        <div className="h-4" /> {/* Spacer */}
      </div>
    </div>
  );
};
