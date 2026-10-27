import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Task } from '../types/task';
import { HistoryItem } from '../types/history';
import { ImageConvertOptions, ImagesToPdfOptions } from '../types/images';

export interface SystemInfo {
  os: string;
  defaultDownloadFolder: string;
  defaultExportFolder: string;
}

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const TauriService = {
  async getTasks(): Promise<Task[]> {
    if (!isTauri()) return [];
    return await invoke<Task[]>('get_tasks');
  },

  async cancelTask(id: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('cancel_task', { id });
  },

  async retryTask(id: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('retry_task', { id });
  },

  async removeTask(id: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('remove_task', { id });
  },

  async clearCompletedTasks(): Promise<void> {
    if (!isTauri()) return;
    await invoke('clear_completed_tasks');
  },

  async getHistory(): Promise<HistoryItem[]> {
    if (!isTauri()) return [];
    return await invoke<HistoryItem[]>('get_history');
  },

  async clearHistory(): Promise<void> {
    if (!isTauri()) return;
    await invoke('clear_history');
  },

  async calculatePosterSpec(options: any): Promise<any> {
    if (!isTauri()) return null;
    return await invoke('calculate_poster_spec', { options });
  },

  async startPosterTask(options: any): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_poster_task', { options });
  },

  async startImageConversionTask(options: ImageConvertOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_image_conversion_task', { options });
  },

  async startImagesToPdfTask(options: ImagesToPdfOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_images_to_pdf_task', { options });
  },

  async getSystemInfo(): Promise<SystemInfo> {
    if (!isTauri()) {
      return {
        os: 'windows',
        defaultDownloadFolder: 'C:\\Users\\Mateus\\Downloads\\Arce Tools',
        defaultExportFolder: 'C:\\Users\\Mateus\\Documents\\Arce Tools\\Exportados',
      };
    }
    return await invoke<SystemInfo>('get_system_info');
  },

  async openPathInExplorer(path: string): Promise<void> {
    if (!isTauri()) {
      console.log('Open explorer:', path);
      return;
    }
    await invoke('open_path_in_explorer', { path });
  },

  async getPreference(key: string): Promise<string | null> {
    if (!isTauri()) {
      return localStorage.getItem(`arce_pref_${key}`);
    }
    return await invoke<string | null>('get_preference', { key });
  },

  async setPreference(key: string, value: string): Promise<void> {
    if (!isTauri()) {
      localStorage.setItem(`arce_pref_${key}`, value);
      return;
    }
    await invoke('set_preference', { key, value });
  },

  async selectFiles(options?: {
    multiple?: boolean;
    extensions?: string[];
    title?: string;
  }): Promise<string[]> {
    if (!isTauri()) return [];

    const filters = options?.extensions
      ? [{ name: 'Arquivos suportados', extensions: options.extensions }]
      : undefined;

    const selected = await openDialog({
      multiple: options?.multiple ?? true,
      directory: false,
      title: options?.title ?? 'Selecionar arquivos',
      filters,
    });

    if (!selected) return [];
    if (Array.isArray(selected)) return selected;
    return [selected];
  },

  async selectFolder(title?: string): Promise<string | null> {
    if (!isTauri()) return null;
    const selected = await openDialog({
      multiple: false,
      directory: true,
      title: title ?? 'Selecionar pasta de destino',
    });
    return typeof selected === 'string' ? selected : null;
  },

  onTaskCreated(callback: (task: Task) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<Task>('task-created', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },

  onTaskProgress(callback: (payload: { id: string; progress: number }) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<{ id: string; progress: number }>('task-progress', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },

  onTaskStatusChanged(
    callback: (payload: {
      id: string;
      status: string;
      progress?: number;
      error?: string;
    }) => void
  ) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<{ id: string; status: string; progress?: number; error?: string }>(
      'task-status-changed',
      (event) => {
        callback(event.payload);
      }
    ).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },

  onTaskCompleted(callback: (payload: { id: string; status: string }) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<{ id: string; status: string }>('task-completed', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },
};
