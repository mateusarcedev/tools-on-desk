export type ThemePreference = 'Escuro' | 'Claro' | 'Sistema';

export interface ComponentStatus {
  id: string;
  name: string;
  desc: string;
  ver?: string | null;
  newVer?: string | null;
  status: 'installed' | 'missing' | 'update' | 'installing';
  size: string;
  progress?: number;
}

export interface AppSettings {
  themePref: ThemePreference;
  maxConcurrency: number;
  downloadFolder: string;
  exportFolder: string;
  notifications: boolean;
  autoUpdate: boolean;
  saveInSameFolder: boolean;
  language: string;
}
