import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PluginCard } from './PluginCard';
import { PluginData } from '../types';

export const StoreView: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStorePlugins = async (page = 1, limit = 40) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/plugins?page=${page}&limit=${limit}`);
      if (!res.ok) {
        console.error('Failed to fetch store plugins', await res.text());
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data && data.items) {
        setPlugins(data.items);
      } else {
        setPlugins([]);
      }
    } catch (err) {
      console.error('Error fetching store plugins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorePlugins();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">Browse available plugins in the store.</p>
        <div>
          <button
            onClick={() => fetchStorePlugins()}
            disabled={loading}
            title="刷新插件列表"
            className="ml-2 flex items-center justify-center w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
