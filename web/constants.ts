import { PluginData, RepositoryConfig, LogEntry } from './types';

export const MOCK_PLUGINS: PluginData[] = [
  {
    Id: "ShadowViewer.Plugin.Bika",
    Name: "哔咔漫画",
    Version: "1.0.0.1",
    Description: "✨ ShadowViewer 插件 | 哔咔漫画 ✨",
    Authors: "kitUIN",
    WebUri: "https://github.com/kitUIN/ShadowViewer.Plugin.Bika",
    Logo: "https://picsum.photos/seed/bika/200/200", // Placeholder for ms-plugin protocol
    PluginManage: { "CanSwitch": true, "CanOpenFolder": true },
    AffiliationTag: {
      Name: "Bika",
      BackgroundHex: "#ef97b9",
      ForegroundHex: "#000000",
      Icon: "https://picsum.photos/seed/bikaicon/50/50"
    },
    SdkVersion: "3.0.0.7",
    DllName: "ShadowViewer.Plugin.Bika",
    Dependencies: [
      { "Id": "ShadowViewer.Plugin.Local", "Need": "[1.4,2.0]" }
    ],
    ReleaseAssets: {
      PluginJson: "https://github.com/kitUIN/ShadowViewer.Plugin.Bika/releases/download/v1.0.0.1/plugin.json",
      ZipPackage: "https://github.com/kitUIN/ShadowViewer.Plugin.Bika/releases/download/v1.0.0.1/ShadowViewer.Plugin.Bika.zip"
    },
    LastUpdated: "2023-10-25"
  },
  {
    Id: "ShadowViewer.Plugin.EHentai",
    Name: "E-Hentai Viewer",
    Version: "2.1.0",
    Description: "Advanced gallery viewer for EH repositories with advanced filtering.",
    Authors: "ShadowDev",
    WebUri: "https://github.com/example/ShadowViewer.Plugin.EH",
    Logo: "https://picsum.photos/seed/eh/200/200",
    PluginManage: { "CanSwitch": true, "CanOpenFolder": false },
    AffiliationTag: {
      Name: "EH",
      BackgroundHex: "#475569",
      ForegroundHex: "#ffffff",
      Icon: "https://picsum.photos/seed/ehicon/50/50"
    },
    SdkVersion: "3.0.0.7",
    DllName: "ShadowViewer.Plugin.EH",
    Dependencies: [],
    ReleaseAssets: {
      PluginJson: "https://github.com/example/ShadowViewer.Plugin.EH/releases/download/v2.1.0/plugin.json",
      ZipPackage: "https://github.com/example/ShadowViewer.Plugin.EH/releases/download/v2.1.0/plugin.zip"
    },
    LastUpdated: "2023-11-02"
  }
];

export const MOCK_REPOS: RepositoryConfig[] = [
  { id: '1', url: 'https://github.com/kitUIN/ShadowViewer.Plugin.Bika', branch: 'main', status: 'active', lastCheck: '2 mins ago' },
  { id: '2', url: 'https://github.com/example/ShadowViewer.Plugin.EH', branch: 'master', status: 'active', lastCheck: '5 mins ago' },
  { id: '3', url: 'https://github.com/test/ShadowViewer.Plugin.Local', branch: 'dev', status: 'syncing', lastCheck: 'Just now' },
];

export const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: '10:00:01', level: 'info', message: 'Service started. Monitoring 3 repositories.' },
  { id: '2', timestamp: '10:05:22', level: 'info', message: 'Webhook received: push event on ShadowViewer.Plugin.Bika' },
  { id: '3', timestamp: '10:05:23', level: 'warning', message: 'Release not found in payload. Ignoring.' },
  { id: '4', timestamp: '10:15:00', level: 'info', message: 'Webhook received: release event on ShadowViewer.Plugin.EH' },
  { id: '5', timestamp: '10:15:02', level: 'info', message: 'Downloading release assets: plugin.json, plugin.zip...' },
  { id: '6', timestamp: '10:15:05', level: 'success', message: 'Validation successful. Updating plugins.json.' },
  { id: '7', timestamp: '10:15:06', level: 'success', message: 'PR #42 created: "Update ShadowViewer.Plugin.EH to v2.1.0"' },
];
