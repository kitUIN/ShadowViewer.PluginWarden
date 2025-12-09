import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, GitBranch, Settings, Plus, Activity, Github, Eye, EyeOff, Send, RefreshCw } from 'lucide-react';
import { MOCK_PLUGINS, MOCK_REPOS, MOCK_LOGS } from './constants';
import { PluginCard } from './components/PluginCard';
import { LogTerminal } from './components/LogTerminal';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { PluginData, RepositoryConfig, LogEntry, Author, RepositoryBasicModel, PaginatedResponse, Release } from './types';

function App() {
  const [user, setUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'repos'>('store');
  const [plugins, setPlugins] = useState<PluginData[]>(MOCK_PLUGINS);
  const [pluginsLoading, setPluginsLoading] = useState<boolean>(false);
  const [repos, setRepos] = useState<RepositoryBasicModel[]>([]);
  const [stats, setStats] = useState<{ total_plugins: number; installed_repos: number; watched_repos: number }>({ total_plugins: MOCK_PLUGINS.length, installed_repos: 0, watched_repos: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [confirmingRepo, setConfirmingRepo] = useState<RepositoryBasicModel | null>(null);
  const [confirmingWatchedValue, setConfirmingWatchedValue] = useState<boolean>(true);
  const [isUpdatingWatched, setIsUpdatingWatched] = useState<boolean>(false);
  const [viewingReleasesRepo, setViewingReleasesRepo] = useState<RepositoryBasicModel | null>(null);

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
        setActiveTab('dashboard'); // Switch to dashboard if logged in
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
        fetch('/api/repositories/installed_exists')
            .then(res => res.json())
            .then(data => {
                if (data.installed_repo_exists === false) {
                    setShowInstallModal(true);
                }
            })
            .catch(err => console.error("Failed to check installation status", err));
    }
  }, [user]);

  useEffect(() => {
    if (showInstallModal && user) {
        const interval = setInterval(() => {
            fetch('/api/repositories/installed_exists')
                .then(res => res.json())
                .then(data => {
                    if (data.installed_repo_exists === true) {
                        setShowInstallModal(false);
                    }
                })
                .catch(err => console.error("Failed to check installation status", err));
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [showInstallModal, user]);

  // Fetch webhook logs from backend and map numeric level to UI level strings
  const mapLevel = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return 'warning' as const;
      case 2:
        return 'error' as const;
      case 3:
        return 'success' as const;
      case 0:
      default:
        return 'info' as const;
    }
  };

  const fetchWebhookLogs = async (day?: string) => {
    try {
      const qs = day ? `?day=${encodeURIComponent(day)}` : '';
      const res = await fetch(`/api/webhook_logs${qs}`);
      if (!res.ok) {
        console.error('Failed to fetch webhook logs', await res.text());
        return;
      }
      const data = await res.json();
      // backend returns array of WebhookLogModel
      const mapped: LogEntry[] = (data || []).map((l: any) => ({
        id: String(l.id),
        timestamp: l.created_at ? new Date(l.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
        level: mapLevel(typeof l.level === 'number' ? l.level : 0),
        message: l.payload || `${l.event}${l.action ? `:${l.action}` : ''}${l.repository && l.repository.full_name ? ` (${l.repository.full_name})` : ''}`
      }));

      // Merge previous logs with newly fetched logs, dedupe by id (keep newest occurrence),
      // keep order oldest->newest and limit to last 50 entries (最新在最下面)
      setLogs(prev => {
        const combined = [...prev, ...mapped];
        const seen = new Set<string>();
        const rev: LogEntry[] = [];
        // iterate from newest to oldest so we keep the newest occurrence
        for (let i = combined.length - 1; i >= 0; i--) {
          const item = combined[i];
          if (!seen.has(item.id)) {
            seen.add(item.id);
            rev.push(item);
          }
        }
        // rev currently newest->oldest, reverse to oldest->newest and keep last 50
        return rev.reverse().slice(-50);
      });
    } catch (err) {
      console.error('Error fetching webhook logs', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    let interval: any | null = null;
    // fetch immediately when dashboard opened
    if (activeTab === 'dashboard') {
      fetchWebhookLogs();
      interval = setInterval(() => fetchWebhookLogs(), 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'repos' && user) {
      fetch('/api/repositories/?page=1&limit=100')
        .then(res => res.json())
        .then((data: PaginatedResponse<RepositoryBasicModel>) => {
          setRepos(data.items);
        })
        .catch(err => console.error("Failed to fetch repositories", err));
    }
  }, [activeTab, user]);

  const fetchStorePlugins = async (page = 1, limit = 40) => {
    try {
      setPluginsLoading(true);
      const res = await fetch(`/api/store/plugins?page=${page}&limit=${limit}`);
      if (!res.ok) {
        console.error('Failed to fetch store plugins', await res.text());
        setPluginsLoading(false);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        setPlugins(data.items as PluginData[]);
      } else {
        setPlugins([]);
      }
    } catch (err) {
      console.error('Error fetching store plugins', err);
    } finally {
      setPluginsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'store') {
      fetchStorePlugins();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) {
        console.error('Failed to fetch stats', await res.text());
        return;
      }
      const data = await res.json();
      setStats({
        total_plugins: typeof data.total_plugins === 'number' ? data.total_plugins : 0,
        installed_repos: typeof data.installed_repos === 'number' ? data.installed_repos : 0,
        watched_repos: typeof data.watched_repos === 'number' ? data.watched_repos : 0,
      });
    } catch (err) {
      console.error('Error fetching stats', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    let interval: any | null = null;
    if (activeTab === 'dashboard') {
      fetchStats();
      interval = setInterval(() => fetchStats(), 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, user]);

  const handleAddRepo = () => {
     const url = prompt("Enter GitHub Repository URL:");
     if (url) {
         // Extract name and full_name from URL for mock display
         const parts = url.split('/').filter(Boolean);
         const name = parts[parts.length - 1] || 'unknown';
         const full_name = parts.slice(-2).join('/') || name;

         const newRepo: RepositoryBasicModel = {
             id: Date.now(),
             name,
             full_name,
             html_url: url,
             watched: false,
             releases: []
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

  const updateRepoWatched = async (repoId: number, watched: boolean) => {
    try {
      setIsUpdatingWatched(true);
      const res = await fetch(`/api/repositories/${repoId}/watched`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to update watched: ${res.status} ${txt}`);
      }
      const data = await res.json();

      // Refresh repository list from server to ensure latest data
      await fetchRepos();

      setConfirmingRepo(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update watch state. See console for details.');
    } finally {
      setIsUpdatingWatched(false);
    }
  };

  const toggleReleaseVisible = async (releaseId: number, currentVisible: boolean) => {
    try {
      const res = await fetch(`/api/releases/${releaseId}/visible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !currentVisible })
      });
      if (!res.ok) {
        throw new Error('Failed to update release visibility');
      }
      
      // Update local state
      setRepos(prevRepos => prevRepos.map(repo => {
        if (repo.releases.some(r => r.id === releaseId)) {
          return {
            ...repo,
            releases: repo.releases.map(r => r.id === releaseId ? { ...r, visible: !currentVisible } : r)
          };
        }
        return repo;
      }));

      // Also update the viewingReleasesRepo if it's the one being viewed
      if (viewingReleasesRepo && viewingReleasesRepo.releases.some(r => r.id === releaseId)) {
          setViewingReleasesRepo(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  releases: prev.releases.map(r => r.id === releaseId ? { ...r, visible: !currentVisible } : r)
              };
          });
      }

    } catch (err) {
      console.error('Error updating release visibility', err);
      alert('Failed to update release visibility');
    }
  };

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repositories/?page=1&limit=100');
      if (!res.ok) {
        console.error('Failed to fetch repositories', await res.text());
        return;
      }
      const data = await res.json();
      // Expecting PaginatedResponse<RepositoryBasicModel>
      if (data && data.items) {
        setRepos(data.items);
      }
    } catch (err) {
      console.error('Error fetching repositories', err);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-200">Loading...</div>;
  }

  if (showLogin && !user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      {user && (
      <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-6 flex items-center gap-3">
          <img src="/app.png" alt="Logo" className="w-8 h-8 rounded shadow-lg shadow-indigo-500/20" />
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
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
            {user ? (
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                {activeTab === 'store' && (
                  <button
                    onClick={() => fetchStorePlugins()}
                    disabled={pluginsLoading}
                    title="刷新插件列表"
                    className="ml-2 flex items-center justify-center w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-60 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img src="/app.png" alt="Logo" className="w-8 h-8 rounded shadow-lg shadow-indigo-500/20" />
                <h1 className="font-bold text-lg tracking-tight">ShadowViewer <span className="text-indigo-400">PluginStore</span></h1>
              </div>
            )}
            <div className="flex items-center gap-4">
               {user && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-400">System Online</span>
               </div>
               )}
               {user ? (
                 <UserMenu user={user} />
               ) : (
                 <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                   <Github className="w-4 h-4" />
                   Login
                 </button>
               )}
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
                                            onClick={() => setViewingReleasesRepo(repo)}
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
                                                onClick={() => { setConfirmingRepo(repo); setConfirmingWatchedValue(true); }}
                                                className="px-3 py-1 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-md transition-colors flex items-center gap-1"
                                              >
                                                <Send className="w-3 h-3" />
                                                Apply
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => { setConfirmingRepo(repo); setConfirmingWatchedValue(false); }}
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
          )}

          {/* STORE PREVIEW VIEW */}
          {activeTab === 'store' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-slate-400">Browse available plugins in the store.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {plugins.length === 0 && !pluginsLoading ? (
                    <div className="col-span-full text-center text-slate-500 py-12">No plugins available yet.</div>
                  ) : (
                    // Group plugins by ID and only show the latest version, but pass all versions to the card
                    Object.values(
                      plugins.reduce((acc, plugin) => {
                        if (!acc[plugin.Id]) {
                          acc[plugin.Id] = [];
                        }
                        acc[plugin.Id].push(plugin);
                        return acc;
                      }, {} as Record<string, PluginData[]>)
                    ).map((versions: PluginData[]) => {
                      // Sort versions descending (assuming semantic versioning or simple string comparison works for now)
                      // For robust semver sorting, a library like 'semver' would be better, but simple sort might suffice if format is consistent
                      versions.sort((a, b) => b.Version.localeCompare(a.Version, undefined, { numeric: true, sensitivity: 'base' }));
                      const latest = versions[0];
                      
                      return (
                        <PluginCard 
                          key={latest.Id} 
                          plugin={latest} 
                          allPlugins={plugins} 
                          versions={versions}
                        />
                      );
                    })
                  )}
                </div>
            </div>
          )}
        
        </div>
      </main>

      {/* Installation Modal */}
      {showInstallModal && (
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
      )}

      {/* Confirmation Modal */}
      {confirmingRepo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-indigo-500/10">
                <h3 className="text-xl font-bold text-white mb-4">{confirmingWatchedValue ? 'Confirm Application' : 'Confirm Unwatch'}</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  {confirmingWatchedValue ? (
                    <>Please confirm to apply the current repository <span className="text-indigo-400 font-mono">{confirmingRepo.name}</span> as a plugin. If successful, releases published by this repository will be automatically merged into the Plugin Store as new versions.</>
                  ) : (
                    <>Please confirm to stop watching the repository <span className="text-indigo-400 font-mono">{confirmingRepo.name}</span>. If successful, releases from this repository will no longer be automatically merged into the Plugin Store.</>
                  )}
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setConfirmingRepo(null)}
                    disabled={isUpdatingWatched}
                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => confirmingRepo && updateRepoWatched(confirmingRepo.id, confirmingWatchedValue)}
                    disabled={isUpdatingWatched}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {confirmingWatchedValue ? 'Confirm Apply' : 'Confirm Unwatch'}
                  </button>
                </div>
            </div>
        </div>
      )}

      {/* Releases Modal */}
      {viewingReleasesRepo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-indigo-500/10 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">
                        Releases for <span className="text-indigo-400 font-mono">{viewingReleasesRepo.name}</span>
                    </h3>
                    <button onClick={() => setViewingReleasesRepo(null)} className="text-slate-400 hover:text-white text-xl font-bold px-2">
                        ✕
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scrollbar">
                    {viewingReleasesRepo.releases.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No releases found.</p>
                    ) : (
                        viewingReleasesRepo.releases.map(release => (
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
                                            onClick={() => toggleReleaseVisible(release.id, release.visible)}
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
      )}
    </div>
  );
}

export default App;
