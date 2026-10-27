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
import {
  LibreOfficeStatus,
  PdfCompressOptions,
  PdfInfo,
  PdfMergeOptions,
  PdfOrganizeOptions,
  PdfSplitOptions,
  PdfToDocxOptions,
  WordToPdfOptions,
} from '../types/document';
import {
  CreateErrorLogPayload,
  ErrorLogEntry,
  ErrorLogFilter,
  ErrorLogStats,
} from '../types/errorLog';
import {
  DependencyInfo,
  DependencyInstallProgress,
  FirstRunStatus,
  SystemDiagnostics,
} from '../types/dependencies';

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

  async selectFile(options?: {
    extensions?: string[];
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null> {
    if (!isTauri()) return null;
    const filters = options?.filters ?? (options?.extensions ? [{ name: 'Arquivos suportados', extensions: options.extensions }] : undefined);
    const selected = await openDialog({
      multiple: false,
      directory: false,
      title: options?.title ?? 'Selecionar arquivo',
      filters,
    });
    if (!selected) return null;
    if (Array.isArray(selected)) return selected[0] || null;
    return selected;
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

  // --- DOCUMENT COMMANDS ---
  async inspectPdf(path: string): Promise<PdfInfo> {
    if (!isTauri()) {
      return {
        path,
        pageCount: 1,
        fileSizeBytes: 1024,
        fileSizeFormatted: '1.0 KB',
        isEncrypted: false,
        hasSelectableText: true,
        pages: [{ pageNumber: 1, widthPt: 595, heightPt: 842, rotationDeg: 0 }],
      };
    }
    return await invoke<PdfInfo>('inspect_pdf', { path });
  },

  async checkLibreOfficeStatus(): Promise<LibreOfficeStatus> {
    if (!isTauri()) {
      return {
        isAvailable: false,
        path: null,
        version: null,
        notes: 'LibreOffice não detectado neste ambiente de teste',
      };
    }
    return await invoke<LibreOfficeStatus>('check_libreoffice_status');
  },

  async startPdfMerge(options: PdfMergeOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_pdf_merge', { options });
  },

  async startPdfSplit(options: PdfSplitOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_pdf_split', { options });
  },

  async startPdfOrganize(options: PdfOrganizeOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_pdf_organize', { options });
  },

  async startPdfCompress(options: PdfCompressOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_pdf_compress', { options });
  },

  async startWordToPdf(options: WordToPdfOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_word_to_pdf', { options });
  },

  async startPdfToDocx(options: PdfToDocxOptions): Promise<string> {
    if (!isTauri()) return 'mock-task-id';
    return await invoke<string>('start_pdf_to_docx', { options });
  },

  // --- ERROR & DIAGNOSTICS COMMANDS ---
  async getErrorLogs(filter: ErrorLogFilter = {}): Promise<ErrorLogEntry[]> {
    if (!isTauri()) return [];
    return await invoke<ErrorLogEntry[]>('get_error_logs', { filter });
  },

  async getAllErrorLogsForExport(filter?: ErrorLogFilter): Promise<ErrorLogEntry[]> {
    if (!isTauri()) return [];
    return await invoke<ErrorLogEntry[]>('get_all_error_logs_for_export', { filter });
  },

  async getErrorStats(): Promise<ErrorLogStats> {
    if (!isTauri()) {
      return { total: 0, critical: 0, unresolved: 0, databaseSizeBytes: 0 };
    }
    return await invoke<ErrorLogStats>('get_error_stats');
  },

  async getErrorLogById(id: string): Promise<ErrorLogEntry | null> {
    if (!isTauri()) return null;
    return await invoke<ErrorLogEntry | null>('get_error_log_by_id', { id });
  },

  async getErrorLogByTaskId(taskId: string): Promise<ErrorLogEntry | null> {
    if (!isTauri()) return null;
    return await invoke<ErrorLogEntry | null>('get_error_log_by_task_id', { taskId });
  },

  async resolveErrorLog(id: string, resolved: boolean = true): Promise<void> {
    if (!isTauri()) return;
    await invoke('resolve_error_log', { id, resolved });
  },

  async clearErrorLogs(retentionDays?: number): Promise<number> {
    if (!isTauri()) return 0;
    return await invoke<number>('clear_error_logs', { retentionDays });
  },

  async logFrontendError(payload: CreateErrorLogPayload): Promise<string> {
    if (!isTauri()) return 'mock-error-id';
    return await invoke<string>('log_frontend_error', { payload });
  },

  async copyToClipboard(text: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('copy_to_clipboard', { text });
        return;
      } catch (e) {
        console.warn('Native clipboard failed, falling back to navigator.clipboard', e);
      }
    }
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  },

  onErrorLogCreated(callback: (payload: { id: string; errorCode: string; userMessage: string; severity: string }) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<{ id: string; errorCode: string; userMessage: string; severity: string }>(
      'error-log-created',
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

  // --- DEPENDENCY MANAGER & SETUP CENTER COMMANDS ---
  async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    if (!isTauri()) {
      return {
        osVersion: 'Windows 11 (x64 Mock)',
        arch: 'x86_64',
        webview2Available: true,
        webview2Version: '120.0',
        appDataPath: 'C:\\Users\\Mock\\AppData\\Local\\ArceTools',
        binariesPath: 'C:\\Users\\Mock\\AppData\\Local\\ArceTools\\binaries',
        hasWritePermission: true,
        availableDiskSpaceMb: 45000,
        internetConnected: true,
        dependencies: [
          {
            id: 'ffmpeg',
            name: 'FFmpeg Multimídia',
            description: 'Conversão, compressão e recorte de áudio e vídeo',
            category: 'audio_video',
            status: 'not_installed',
            origin: 'unknown',
            isManaged: false,
            canInstall: true,
            canUpdate: false,
            canRemove: false,
          },
          {
            id: 'ffprobe',
            name: 'ffprobe Inspector',
            description: 'Inspeção de metadados, codecs e durações de mídia',
            category: 'audio_video',
            status: 'not_installed',
            origin: 'unknown',
            isManaged: false,
            canInstall: true,
            canUpdate: false,
            canRemove: false,
          },
          {
            id: 'yt-dlp',
            name: 'yt-dlp Downloader',
            description: 'Motor de download de fontes permitidas sem DRM',
            category: 'download',
            status: 'not_installed',
            origin: 'unknown',
            isManaged: false,
            canInstall: true,
            canUpdate: false,
            canRemove: false,
          },
          {
            id: 'libreoffice',
            name: 'LibreOffice Headless',
            description: 'Conversão Word (.docx) para PDF (opcional)',
            category: 'documents',
            status: 'optional',
            origin: 'unknown',
            isManaged: false,
            canInstall: true,
            canUpdate: false,
            canRemove: false,
          },
          {
            id: 'webview2',
            name: 'WebView2 Runtime',
            description: 'Ambiente de renderização visual da interface',
            category: 'system',
            status: 'ready',
            version: '120.0',
            origin: 'system_path',
            isManaged: false,
            canInstall: false,
            canUpdate: false,
            canRemove: false,
          },
        ],
      };
    }
    return await invoke<SystemDiagnostics>('get_system_diagnostics');
  },

  async getDependenciesStatus(): Promise<DependencyInfo[]> {
    if (!isTauri()) {
      const diag = await this.getSystemDiagnostics();
      return diag.dependencies;
    }
    return await invoke<DependencyInfo[]>('get_dependencies_status');
  },

  async installDependency(name: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('install_dependency', { name });
  },

  async updateDependency(name: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('update_dependency', { name });
  },

  async removeManagedDependency(name: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('remove_managed_dependency', { name });
  },

  async verifyDependency(name: string): Promise<DependencyInfo> {
    if (!isTauri()) {
      const deps = await this.getDependenciesStatus();
      return deps.find((d) => d.id === name) || deps[0];
    }
    return await invoke<DependencyInfo>('verify_dependency', { name });
  },

  async setCustomLibreOfficePath(path: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('set_custom_libreoffice_path', { path });
  },

  async getFirstRunStatus(): Promise<FirstRunStatus> {
    if (!isTauri()) {
      return {
        isFirstRun: true,
        completed: false,
        dismissed: false,
        allEssentialReady: false,
      };
    }
    return await invoke<FirstRunStatus>('get_first_run_status');
  },

  async completeFirstRun(status: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('complete_first_run', { status });
  },

  onDependencyInstallProgress(callback: (progress: DependencyInstallProgress) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<DependencyInstallProgress>('dependency-install-progress', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },
};
