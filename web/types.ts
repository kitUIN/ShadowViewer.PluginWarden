// Matching the JSON structure provided by the user
export interface PluginDependency {
  Id: string;
  Need: string;
}

export interface Author {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
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
  Versions: string[];
  Description: string;
  Authors: string;
  WebUri: string;
  Logo: string;
  Tags: string[];
  SdkVersion: string;
  Dependencies: PluginDependency[];
  DownloadUrl?: string;
  LastUpdated?: string;
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

export interface Release {
  id: number;
  github_id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  visible: boolean;
  assets: any[];
  author: Author;
}

export interface RepositoryBasicModel {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  watched: boolean;
  releases: Release[];
  author?: Author;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: T[];
}
