import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Task } from '../types/task';
import { HistoryItem } from '../types/history';
import { ImageConvertOptions, ImagesToPdfOptions } from '../types/images';
import { AudioConvertOptions, AudioTrimOptions, MediaInfo } from '../types/audio';
import {
  VideoCompressOptions,
  VideoConvertOptions,
  VideoExtractAudioOptions,
  VideoExtractFrameOptions,
  VideoTrimOptions,
} from '../types/video';
import { DownloadOptions, MediaDownloadInfo, YtDlpStatus } from '../types/download';
import { ExternalToolsStatus } from '../types/tools';

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

  async renderPosterPreview(options: any): Promise<string | null> {
    if (!isTauri()) return null;
    return await invoke<string>('render_poster_preview', { options });
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

  // --- AUDIO COMMANDS ---
  async probeMedia(filePath: string): Promise<MediaInfo> {
    if (!isTauri()) {
      return {
        filePath,
        formatName: 'mp3',
        durationSeconds: 120.0,
        sizeBytes: 2500000,
        videoStreams: [],
        audioStreams: [
          {
            index: 0,
            codecName: 'mp3',
            sampleRate: 44100,
            channels: 2,
            bitRate: 192000,
          },
        ],
      };
    }
    return await invoke<MediaInfo>('probe_media', { filePath });
  },

  async startAudioConvert(options: AudioConvertOptions): Promise<string> {
    if (!isTauri()) return 'mock-audio-task-id';
    return await invoke<string>('start_audio_convert', { options });
  },

  async startAudioTrim(options: AudioTrimOptions): Promise<string> {
    if (!isTauri()) return 'mock-audio-trim-id';
    return await invoke<string>('start_audio_trim', { options });
  },

  // --- VIDEO COMMANDS ---
  async startVideoConvert(options: VideoConvertOptions): Promise<string> {
    if (!isTauri()) return 'mock-video-convert-id';
    return await invoke<string>('start_video_convert', { options });
  },

  async startVideoCompress(options: VideoCompressOptions): Promise<string> {
    if (!isTauri()) return 'mock-video-compress-id';
    return await invoke<string>('start_video_compress', { options });
  },

  async startVideoTrim(options: VideoTrimOptions): Promise<string> {
    if (!isTauri()) return 'mock-video-trim-id';
    return await invoke<string>('start_video_trim', { options });
  },

  async startVideoExtractAudio(options: VideoExtractAudioOptions): Promise<string> {
    if (!isTauri()) return 'mock-video-extract-audio-id';
    return await invoke<string>('start_video_extract_audio', { options });
  },

  async startVideoExtractFrame(options: VideoExtractFrameOptions): Promise<string> {
    if (!isTauri()) return 'mock-video-extract-frame-id';
    return await invoke<string>('start_video_extract_frame', { options });
  },

  // --- DOWNLOAD COMMANDS ---
  async fetchDownloadInfo(url: string): Promise<MediaDownloadInfo> {
    if (!isTauri()) {
      return {
        url,
        title: 'Mídia de Exemplo (Ambiente Web)',
        uploader: 'Canal Oficial',
        durationSeconds: 215.0,
        formats: [
          { formatId: '1080p', extension: 'mp4', resolution: '1920x1080', hasVideo: true, hasAudio: true },
          { formatId: '720p', extension: 'mp4', resolution: '1280x720', hasVideo: true, hasAudio: true },
        ],
        isPlaylist: false,
        platform: 'youtube',
        platformName: 'YouTube',
      };
    }
    return await invoke<MediaDownloadInfo>('fetch_download_info', { url });
  },

  async getYtDlpStatus(): Promise<YtDlpStatus> {
    if (!isTauri()) {
      return {
        version: '2026.02.04',
        path: 'yt-dlp',
        origin: 'Ambiente Web Mock',
        isAvailable: true,
      };
    }
    return await invoke<YtDlpStatus>('get_ytdlp_status');
  },

  async startDownload(options: DownloadOptions): Promise<string> {
    if (!isTauri()) return 'mock-download-id';
    return await invoke<string>('start_download', { options });
  },

  // --- EXTERNAL TOOLS ---
  async checkExternalTools(): Promise<ExternalToolsStatus> {
    if (!isTauri()) {
      return {
        ffmpeg: { name: 'ffmpeg', available: true, version: '8.1.1', path: 'C:\\ffmpeg\\ffmpeg.exe', license: 'GPL v3', details: 'Navegador mock' },
        ffprobe: { name: 'ffprobe', available: true, version: '8.1.1', path: 'C:\\ffmpeg\\ffprobe.exe', license: 'GPL v3', details: 'Navegador mock' },
        ytDlp: { name: 'yt-dlp', available: true, version: '2026.10.26', path: 'C:\\yt-dlp\\yt-dlp.exe', license: 'Unlicense', details: 'Navegador mock' },
      };
    }
    return await invoke<ExternalToolsStatus>('check_external_tools');
  },

  // --- SYSTEM & PREFERENCES ---
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

  async minimizeWindow(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Failed to minimize window', e);
    }
  },

  async toggleMaximizeWindow(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.warn('Failed to toggle maximize window', e);
    }
  },

  async closeWindow(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.warn('Failed to close window', e);
    }
  },

  async isWindowMaximized(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().isMaximized();
    } catch {
      return false;
    }
  },

  async onWindowResize(callback: () => void): Promise<() => void> {
    if (!isTauri()) return () => {};
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      return await getCurrentWindow().onResized(callback);
    } catch {
      return () => {};
    }
  },
};
