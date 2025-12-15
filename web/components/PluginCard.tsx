import React, { useState, useEffect } from 'react';
import { PluginData } from '../types';
import { Download, Tag, Box, FileCode, Github, User, Link, ChevronDown, Calendar, Check } from 'lucide-react';

interface PluginCardProps {
  plugin: PluginData;
}

export const PluginCard: React.FC<PluginCardProps> = ({ plugin }) => {
  const [selectedVersion, setSelectedVersion] = useState(plugin.Version);
  const [currentPlugin, setCurrentPlugin] = useState<PluginData>(plugin);
  const [isVersionOpen, setIsVersionOpen] = useState(false);

  useEffect(() => {
    setSelectedVersion(plugin.Version);
    setCurrentPlugin(plugin);
    setIsVersionOpen(false);
  }, [plugin]);

  const handleVersionChange = async (newVersion: string) => {
    setSelectedVersion(newVersion);
    if (newVersion === plugin.Version) {
      setCurrentPlugin(plugin);
      return;
    }

    try {
      const res = await fetch('/api/store/plugins/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_id: plugin.Id, version: newVersion }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPlugin(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ width: 'calc(100% + 50px)' }} className="bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all duration-300 overflow-visible flex flex-col relative">
      {/* Header / Banner */}
      <div className="h-24 w-full relative rounded-t-xl" style={{ backgroundColor: currentPlugin.BackgroundColor || undefined }}>
        <div className="absolute inset-0 bg-black/10"></div>

        {/* GitHub Link */}
        {currentPlugin.WebUri && (
          <a
            href={currentPlugin.WebUri}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-all backdrop-blur-sm z-10"
            title="View Source"
            onClick={(e) => e.stopPropagation()}
          >
            <Github className="w-4 h-4" />
          </a>
        )}

        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-slate-700 shadow-lg p-1">
            <img src={currentPlugin.Logo} alt={currentPlugin.Name} className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="mb-1">
            <h3 className="font-bold text-lg text-white shadow-black drop-shadow-md">{currentPlugin.Name}</h3>
            <div className="flex items-center gap-2">
              {plugin.Versions ? (
                <div className="relative">
                  <button
                    onClick={() => setIsVersionOpen(!isVersionOpen)}
                    className="flex items-center gap-1 bg-black/30 hover:bg-black/50 text-white/90 text-xs px-2 py-0.5 rounded backdrop-blur-sm transition-all border border-transparent hover:border-white/10 outline-none"
                  >
                    <span>{selectedVersion}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isVersionOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isVersionOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsVersionOpen(false)} 
                      />
                      <div className="absolute top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                        {plugin.Versions.map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              handleVersionChange(v);
                              setIsVersionOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors flex items-center justify-between ${
                              v === selectedVersion ? 'text-indigo-400 font-medium bg-slate-700/30' : 'text-slate-300'
                            }`}
                          >
                            <span>{v}</span>
                            {v === selectedVersion && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Author Info & Last Updated */}
        <div className="flex items-center justify-between text-xs text-slate-400 -mt-1">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{currentPlugin.Authors}</span>
          </div>
          {currentPlugin.LastUpdated && (
            <div className="flex items-center gap-1" title={`Last updated: ${new Date(currentPlugin.LastUpdated).toLocaleDateString()}`}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(currentPlugin.LastUpdated).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed min-h-[3rem]">
          {currentPlugin.Description || 'No description provided.'}
        </p>

        <div className="flex-1"></div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 text-xs">
          {currentPlugin.Tags.map((tag, idx) => (
            <div className="px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {tag}
            </div>
          ))}
          <div className="px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1">
            <FileCode className="w-3 h-3" />
            SDK {currentPlugin.SdkVersion}
          </div>
          {currentPlugin.Dependencies.length > 0 && (
            <div
              className="relative group px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer hover:bg-slate-600 transition-colors"
            >
              <Box className="w-3 h-3" />
              {currentPlugin.Dependencies.length} Deps

              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-slate-900 border border-slate-700 rounded p-2 hidden group-hover:block z-50 shadow-xl pointer-events-none">
                <div className="text-[10px] font-bold mb-1 text-slate-300 border-b border-slate-800 pb-1">Dependencies</div>
                {currentPlugin.Dependencies.map((dep, idx) => (
                  <div key={idx} className="text-[10px] text-slate-400">
                    {dep.Id} <span className="text-slate-600">({dep.Need})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex gap-2">
          <a
            href={`shadow://pluginmanager/store/install/${currentPlugin.Id}/${currentPlugin.Version}`}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow-indigo-500/20"
          >
            <Link className="w-4 h-4" />
            Install Plugin
          </a>
          <a
            href={currentPlugin.DownloadUrl || '#'}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
            title="Download Package"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
