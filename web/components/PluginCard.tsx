import React, { useState, useEffect } from 'react';
import { PluginData } from '../types';
import { Download, ShieldCheck, Tag, Sparkles, Box, FileCode, Github, User, Link, ChevronDown } from 'lucide-react';
import { generateMarketingDescription, analyzeDependencies } from '../services/geminiService';

interface PluginCardProps {
  plugin: PluginData;
  allPlugins: PluginData[];
  versions?: PluginData[];
}

export const PluginCard: React.FC<PluginCardProps> = ({ plugin, allPlugins, versions }) => {
  const [selectedVersion, setSelectedVersion] = useState(plugin.Version);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedVersion(plugin.Version);
  }, [plugin.Version]);

  const currentPlugin = versions?.find(v => v.Version === selectedVersion) || plugin;

  const handleAiEnhance = async () => {
    if (!process.env.API_KEY) {
      alert("Please set API_KEY in environment variables to use AI features.");
      return;
    }
    setLoading(true);
    const desc = await generateMarketingDescription(currentPlugin);
    setAiDescription(desc);
    setLoading(false);
  };

  const handleDependencyCheck = async () => {
    if (!process.env.API_KEY) {
      alert("Please set API_KEY in environment variables.");
      return;
    }
    setLoading(true);
    const analysis = await analyzeDependencies(currentPlugin, allPlugins);
    setAiAnalysis(analysis);
    setLoading(false);
  };

  return (
    <div style={{ width: 'calc(100% + 50px)' }} className="bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Header / Banner */}
      <div className="h-24 w-full relative overflow-hidden" style={{ backgroundColor: currentPlugin.AffiliationTag.BackgroundHex }}>
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
                  {versions && versions.length > 1 ? (
                    <div className="relative group">
                      <select
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        className="appearance-none bg-black/30 text-white/90 text-xs px-2 py-0.5 rounded backdrop-blur-sm border-none outline-none cursor-pointer pr-6 hover:bg-black/50 transition-colors"
                      >
                        {versions.map((v) => (
                          <option key={v.Version} value={v.Version} className="bg-slate-800 text-white">
                            v{v.Version}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/90 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <span className="text-xs text-white/90 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">v{currentPlugin.Version}</span>
                  )}
                </div>
            </div>
         </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Author Info */}
        <div className="flex items-center gap-2 text-xs text-slate-400 -mt-1">
            <User className="w-3 h-3" />
            <span className="truncate">{currentPlugin.Authors}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed min-h-[3rem]">
          {aiDescription ? (
            <span className="text-indigo-300 animate-pulse">{aiDescription}</span>
          ) : (
            currentPlugin.Description
          )}
        </p>

        {/* Analysis Result Box */}
        {aiAnalysis && (
            <div className="bg-slate-900/50 p-2 rounded border border-slate-700 text-xs text-slate-400">
                <span className="font-bold text-emerald-500">Analysis: </span>{aiAnalysis}
            </div>
        )}

        <div className="flex-1"></div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 text-xs">
           <div className="px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {currentPlugin.AffiliationTag.Name}
           </div>
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
              href={`shadow://plugin-manager/install/${currentPlugin.Id}/${currentPlugin.Version}`}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow-indigo-500/20"
            >
              <Link className="w-4 h-4" />
              Install Plugin
            </a>
            <a 
              href={currentPlugin.ReleaseAssets?.ZipPackage || '#'} 
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
