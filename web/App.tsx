import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, GitBranch, Settings, Plus, Activity, Github } from 'lucide-react';
import { MOCK_PLUGINS, MOCK_REPOS, MOCK_LOGS } from './constants';
import { PluginCard } from './components/PluginCard';
import { LogTerminal } from './components/LogTerminal';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { PluginData, RepositoryConfig, LogEntry, Author } from './types';

function App() {
  const [user, setUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'repos'>('dashboard');
  const [plugins] = useState<PluginData[]>(MOCK_PLUGINS);
  const [repos, setRepos] = useState<RepositoryConfig[]>(MOCK_REPOS);
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);

  useEffect(() => {
    fetch('/api/authors/me')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  // Simulating live logs for the demo
  useEffect(() => {
    const interval = setInterval(() => {
        const actions = [
            { level: 'info', message: 'Heartbeat: Checking for new releases...' },
            { level: 'info', message: 'Syncing repository metadata...' },
        ] as const;
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        const newLog: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            level: action.level,
            message: action.message
        };
        setLogs(prev => [...prev.slice(-50), newLog]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAddRepo = () => {
     const url = prompt("Enter GitHub Repository URL:");
     if (url) {
         const newRepo: RepositoryConfig = {
             id: Date.now().toString(),
             url,
             branch: 'main',
             status: 'syncing',
             lastCheck: 'Pending'
         };
         setRepos([...repos, newRepo]);
         setLogs(prev => [...prev, {
             id: Date.now().toString(),
             timestamp: new Date().toLocaleTimeString(),
             level: 'info',
             message: `Added new repository to monitor: ${url}`
         }]);
     }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-200">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">SV</div>
          <h1 className="font-bold text-lg tracking-tight">PluginStore <span className="text-indigo-400">Mgr</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('repos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'repos' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <GitBranch className="w-5 h-5" />
            Monitored Repos
          </button>
          <button 
            onClick={() => setActiveTab('store')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'store' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Store className="w-5 h-5" />
            Store Preview
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 text-sm text-slate-500">
               <Settings className="w-4 h-4" />
               <span>v1.2.0-beta</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-400">System Online</span>
               </div>
               <UserMenu user={user} />
            </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
               {/* Stats Column */}
               <div className="lg:col-span-2 space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                          <p className="text-slate-400 text-sm mb-1">Total Plugins</p>
                          <p className="text-3xl font-bold text-white">{plugins.length}</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                          <p className="text-slate-400 text-sm mb-1">Active Repos</p>
                          <p className="text-3xl font-bold text-indigo-400">{repos.length}</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                          <p className="text-slate-400 text-sm mb-1">Pending PRs</p>
                          <p className="text-3xl font-bold text-emerald-400">1</p>
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
                      <h3 className="font-bold text-lg text-white mb-2">ShadowViewer Store</h3>
                      <p className="text-sm text-slate-300 mb-4">
                        The automation service listens for Webhook events from configured repositories. When a release is detected, it downloads the assets, validates the <code className="bg-slate-950 px-1 rounded text-indigo-300">plugin.json</code>, and creates a Pull Request.
                      </p>
                      <button onClick={() => setActiveTab('store')} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">View Store →</button>
                   </div>
               </div>
            </div>
          )}

          {/* REPOS VIEW */}
          {activeTab === 'repos' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <p className="text-slate-400">Manage the GitHub repositories watched by the automation bot.</p>
                    <button onClick={handleAddRepo} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Repository
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Repository URL</th>
                                <th className="px-6 py-4">Branch</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Check</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {repos.map(repo => (
                                <tr key={repo.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        <Github className="w-4 h-4 text-slate-500" />
                                        <span className="font-mono text-slate-300">{repo.url.replace('https://github.com/', '')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{repo.branch}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            repo.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            repo.status === 'syncing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                repo.status === 'active' ? 'bg-emerald-500' :
                                                repo.status === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                                            }`}></span>
                                            {repo.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{repo.lastCheck}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white transition-colors">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* STORE PREVIEW VIEW */}
          {activeTab === 'store' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-slate-400">This is how the `plugins.json` data renders for end-users.</p>
                    <div className="flex gap-2">
                        <button className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300 border border-slate-700">Refresh Data</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {plugins.map(plugin => (
                        <PluginCard key={plugin.Id} plugin={plugin} allPlugins={plugins} />
                    ))}
                    
                    {/* Empty State / Add New Placeholder */}
                    <button onClick={handleAddRepo} className="border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-slate-900 transition-all min-h-[300px] group">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-medium">Wait for new Release</span>
                    </button>
                </div>
            </div>
          )}
        
        </div>
      </main>
    </div>
  );
}

export default App;
