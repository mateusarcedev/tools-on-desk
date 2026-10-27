export type DependencyStatus =
  | 'ready'
  | 'not_installed'
  | 'update_available'
  | 'incompatible'
  | 'check_failed'
  | 'optional';

export type DependencyOrigin =
  | 'managed'
  | 'bundled'
  | 'win_get'
  | 'system_path'
  | 'custom_path'
  | 'unknown';

export interface DependencyInfo {
  id: string;
  name: string;
  description: string;
  category: 'audio_video' | 'download' | 'documents' | 'system' | string;
  status: DependencyStatus;
  version?: string;
  latestVersion?: string;
  origin: DependencyOrigin;
  path?: string;
  isManaged: boolean;
  canInstall: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  downloadSizeBytes?: number;
  installedSizeBytes?: number;
  lastCheckedAt?: string;
  errorMessage?: string;
}

export interface SystemDiagnostics {
  osVersion: string;
  arch: string;
  webview2Available: boolean;
  webview2Version?: string;
  appDataPath: string;
  binariesPath: string;
  hasWritePermission: boolean;
  availableDiskSpaceMb: number;
  internetConnected: boolean;
  dependencies: DependencyInfo[];
}

export interface DependencyInstallProgress {
  dependencyId: string;
  phase: 'downloading' | 'verifying_hash' | 'extracting' | 'validating' | 'completed' | 'failed' | string;
  bytesDownloaded: number;
  totalBytes?: number;
  percentage: number;
  message: string;
}

export interface FirstRunStatus {
  isFirstRun: boolean;
  completed: boolean;
  dismissed: boolean;
  allEssentialReady: boolean;
}
