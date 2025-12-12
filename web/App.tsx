import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, GitBranch, Settings, Plus, Activity, Github, Eye, EyeOff, Send } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { RepositoryConfig, Author, RepositoryBasicModel, PaginatedResponse, Release } from './types';
import { ReleasesModal } from './components/ReleasesModal';
import { InstallModal } from './components/InstallModal';
import { ReposView } from './components/ReposView';
import { DashboardView } from './components/DashboardView';
import { StoreView } from './components/StoreView';

function App() {
  const [user, setUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'repos'>('store');
  const [repos, setRepos] = useState<RepositoryBasicModel[]>([]);
  
  
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
                {/* Store refresh handled inside StoreView */}
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
            <DashboardView />
          )} 

          {/* REPOS VIEW */}
          {activeTab === 'repos' && (
            <ReposView repos={repos} 
              onViewReleases={(repo) => setViewingReleasesRepo(repo)}
              onConfirmAction={updateRepoWatched} />
          )}

          {/* STORE PREVIEW VIEW */}
          {activeTab === 'store' && (
            <StoreView />
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
