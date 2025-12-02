// Matching the JSON structure provided by the user
export interface PluginDependency {
  Id: string;
  Need: string;
}

export interface AffiliationTag {
  Name: string;
  BackgroundHex: string;
  ForegroundHex: string;
  Icon: string;
  PluginId?: string;
}

export interface PluginManage {
  CanSwitch: boolean;
  CanOpenFolder: boolean;
}

export interface ReleaseAssets {
  PluginJson: string;
  ZipPackage: string;
}

export interface PluginData {
  Id: string;
  Name: string;
  Version: string;
  Description: string;
  Authors: string;
  WebUri: string;
  Logo: string;
  PluginManage?: PluginManage; // Optional in list view, present in plugin.json
  AffiliationTag: AffiliationTag;
  SdkVersion: string;
  DllName: string;
  Dependencies: PluginDependency[];
  ReleaseAssets?: ReleaseAssets; // Added by the automation script
  LastUpdated?: string; // UI Metadata
}

export interface RepositoryConfig {
  id: string;
  url: string;
  branch: string;
  status: 'active' | 'error' | 'syncing';
  lastCheck: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
