import React, { useState } from 'react';
import { PluginData } from '../types';
import { Download, ShieldCheck, Tag, Sparkles, Box, FileCode } from 'lucide-react';
import { generateMarketingDescription, analyzeDependencies } from '../services/geminiService';

interface PluginCardProps {
  plugin: PluginData;
  allPlugins: PluginData[];
}

export const PluginCard: React.FC<PluginCardProps> = ({ plugin, allPlugins }) => {
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAiEnhance = async () => {
    if (!process.env.API_KEY) {
      alert("Please set API_KEY in environment variables to use AI features.");
      return;
    }
    setLoading(true);
    const desc = await generateMarketingDescription(plugin);
    setAiDescription(desc);
    setLoading(false);
  };

  const handleDependencyCheck = async () => {
    if (!process.env.API_KEY) {
      alert("Please set API_KEY in environment variables.");
      return;
    }
    setLoading(true);
    const analysis = await analyzeDependencies(plugin, allPlugins);
    setAiAnalysis(analysis);
    setLoading(false);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Header / Banner */}
      <div className="h-24 w-full relative overflow-hidden" style={{ backgroundColor: plugin.AffiliationTag.BackgroundHex }}>
         <div className="absolute inset-0 bg-black/10"></div>
         <div className="absolute bottom-3 left-4 flex items-end gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-slate-700 shadow-lg p-1">
               <img src={plugin.Logo} alt={plugin.Name} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="mb-1">
                <h3 className="font-bold text-lg text-white shadow-black drop-shadow-md">{plugin.Name}</h3>
                <span className="text-xs text-white/90 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">v{plugin.Version}</span>
            </div>
         </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed min-h-[3rem]">
          {aiDescription ? (
            <span className="text-indigo-300 animate-pulse">{aiDescription}</span>
          ) : (
            plugin.Description
          )}
        </p>

        {/* AI Actions */}
        <div className="flex gap-2">
           <button 
             onClick={handleAiEnhance}
             disabled={loading}
             className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
           >
             <Sparkles className="w-3 h-3" />
             {loading ? 'Thinking...' : 'AI Enhance'}
           </button>
           <button 
             onClick={handleDependencyCheck}
             disabled={loading}
             className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
           >
             <ShieldCheck className="w-3 h-3" />
             Check Deps
           </button>
        </div>

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
              {plugin.AffiliationTag.Name}
           </div>
           <div className="px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              SDK {plugin.SdkVersion}
           </div>
           {plugin.Dependencies.length > 0 && (
             <div className="px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1">
                <Box className="w-3 h-3" />
                {plugin.Dependencies.length} Deps
             </div>
           )}
        </div>

        {/* Action Button */}
        <a 
          href={plugin.ReleaseAssets?.ZipPackage || '#'} 
          className="mt-2 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Install Plugin
        </a>
      </div>
    </div>
  );
};
