import React from 'react';
import { PluginCard } from './PluginCard';
import { PluginData } from '../types';

interface StoreViewProps {
  plugins: PluginData[];
  loading: boolean;
}

export const StoreView: React.FC<StoreViewProps> = ({ plugins, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">Browse available plugins in the store.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plugins.length === 0 && !loading ? (
          <div className="col-span-full text-center text-slate-500 py-12">No plugins available yet.</div>
        ) : (
          plugins.map((plugin: PluginData) => (
            <PluginCard key={plugin.Id} plugin={plugin} />
          ))
        )}
      </div>
    </div>
  );
};
