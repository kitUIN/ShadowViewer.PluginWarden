import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, GitBranch, Settings, Plus, Activity, Github, Eye, EyeOff, Send, RefreshCw } from 'lucide-react';
import { PluginCard } from './components/PluginCard';
import { LogTerminal } from './components/LogTerminal';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { PluginData, RepositoryConfig, LogEntry, Author, RepositoryBasicModel, PaginatedResponse, Release } from './types';
import { ReleasesModal } from './components/ReleasesModal';
import { InstallModal } from './components/InstallModal';
import { ReposView } from './components/ReposView';
import { DashboardView } from './components/DashboardView';

function App() {
  const [user, setUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'repos'>('store');
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState<boolean>(false);
  const [repos, setRepos] = useState<RepositoryBasicModel[]>([]);
  const [stats, setStats] = useState<{ total_plugins: number; installed_repos: number; watched_repos: number }>({ total_plugins: 0, installed_repos: 0, watched_repos: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
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
      // Backend may return either a flat array of PluginData or a grouped array like { id: string, version: PluginData[] }
      if (data && data.items) {
        setPlugins(data.items);
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

  const updateRepoWatched = async (repoId: number, watched: boolean) => {
    try {
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
    } catch (err) {
      console.error(err);
      alert('Failed to update watch state. See console for details.');
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
            <DashboardView stats={stats} logs={logs} />
          )} 

          {/* REPOS VIEW */}
          {activeTab === 'repos' && (
            <ReposView repos={repos} 
              onViewReleases={(repo) => setViewingReleasesRepo(repo)}
              onConfirmAction={updateRepoWatched} />
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
                    plugins.map((plugin: PluginData) => (
                      <PluginCard key={plugin.Id} plugin={plugin} />
                    ))
                    )}
                </div>
            </div>
          )}
        
        </div>
      </main>

      {/* Installation Modal */}
      {showInstallModal && ( <InstallModal /> )}

      {/* Releases Modal */}
      {viewingReleasesRepo && (
        <ReleasesModal repo={viewingReleasesRepo} onClose={() => setViewingReleasesRepo(null)} onToggleVisible={toggleReleaseVisible} />
      )}
    </div>
  );
}

export default App;
