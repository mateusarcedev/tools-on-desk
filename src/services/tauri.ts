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
import {
  CreateProjectPayload,
  CreativeAsset,
  CreativeProject,
  CreativeSkill,
  CreativeTemplate,
  AgentInfo,
  EnhancePromptResult,
  GenerationMetadata,
  ImageModelCapabilities,
  ImageEditOptions,
  ImageEditResult,
  ProcessedReference,
  ReferencePurpose,
  NvidiaImageGenOptions,
  NvidiaImageGenResult,
  NvidiaKeyStatus,
  NvidiaModelInfo,
  NvidiaValidationResult,
  NvidiaVideoGenOptions,
  NvidiaVideoGenResult,
  OpenCodeStatus,
  RenderMotionOptions,
  MotionBriefing,
  MotionDirectorPlan,
} from '../types/creative';
import { MigrationProgressEvent, MigrationStatus } from '../types/migration';

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
        defaultDownloadFolder: 'C:\\Users\\User\\Downloads\\ToolsOnDesk',
        defaultExportFolder: 'C:\\Users\\User\\Documents\\ToolsOnDesk\\Exportados',
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
      return localStorage.getItem(`tod_pref_${key}`) ?? localStorage.getItem(`arce_pref_${key}`);
    }
    return await invoke<string | null>('get_preference', { key });
  },

  async setPreference(key: string, value: string): Promise<void> {
    if (!isTauri()) {
      localStorage.setItem(`tod_pref_${key}`, value);
      return;
    }
    await invoke('set_preference', { key, value });
  },

  async selectFiles(options?: {
    multiple?: boolean;
    extensions?: string[];
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string[]> {
    if (!isTauri()) return [];

    const filters = options?.filters ?? (options?.extensions
      ? [{ name: 'Arquivos suportados', extensions: options.extensions }]
      : undefined);

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
        appDataPath: 'C:\\Users\\Mock\\AppData\\Local\\ToolsOnDesk',
        binariesPath: 'C:\\Users\\Mock\\AppData\\Local\\ToolsOnDesk\\binaries',
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

  // ==========================================
  // ARCE CREATIVE STUDIO
  // ==========================================

  async saveNvidiaKey(key: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('save_nvidia_key', { key });
  },

  async getNvidiaKeyStatus(): Promise<NvidiaKeyStatus> {
    if (!isTauri()) {
      return {
        has_key: false,
        masked_key: null,
        validated: false,
        last_validated_at: null,
      };
    }
    return await invoke<NvidiaKeyStatus>('get_nvidia_key_status');
  },

  async validateNvidiaKey(key?: string): Promise<NvidiaValidationResult> {
    if (!isTauri()) {
      return {
        valid: true,
        message: 'Ambiente de desenvolvimento web',
        available_models: ['nvidia/llama-3.1-nemotron-70b-instruct', 'black-forest-labs/flux.1-schnell'],
      };
    }
    return await invoke<NvidiaValidationResult>('validate_nvidia_key', { key });
  },

  async listNvidiaModels(): Promise<NvidiaModelInfo[]> {
    if (!isTauri()) {
      return [
        {
          id: 'nvidia/llama-3.1-nemotron-70b-instruct',
          name: 'Llama 3.1 Nemotron 70B Instruct',
          category: 'llm',
          provider: 'NVIDIA / Meta',
          description: 'Modelo de raciocínio e redação criativa',
          context_length: 128000,
          supports_streaming: true,
          cost_tier: 'free_tier',
        },
        {
          id: 'black-forest-labs/flux.1-schnell',
          name: 'FLUX.1 [schnell]',
          category: 'image',
          provider: 'Black Forest Labs / NVIDIA',
          description: 'Geração ultra-rápida de imagens',
          context_length: null,
          supports_streaming: false,
          cost_tier: 'free_tier',
        },
      ];
    }
    return await invoke<NvidiaModelInfo[]>('list_nvidia_models');
  },

  async generateAiImage(options: NvidiaImageGenOptions): Promise<NvidiaImageGenResult> {
    if (!isTauri()) {
      return {
        image_paths: ['/mock/path/generated_image.png'],
        prompt: options.prompt,
        seed: 42,
        model_id: options.model_id || 'flux.1-schnell',
        duration_ms: 1200,
      };
    }
    return await invoke<NvidiaImageGenResult>('generate_ai_image', { options });
  },

  async generateAiVideo(options: NvidiaVideoGenOptions): Promise<NvidiaVideoGenResult> {
    if (!isTauri()) {
      return {
        video_path: '/mock/path/generated_video.mp4',
        duration_sec: options.duration_sec,
        model_id: options.model_id || 'svd',
      };
    }
    return await invoke<NvidiaVideoGenResult>('generate_ai_video', { options });
  },

  async generateCreativePlan(
    prompt: string,
    projectType: string,
    style: string,
    skillIds: string[]
  ): Promise<string> {
    if (!isTauri()) {
      return `### Conceito Visual\nPlano criativo para: ${prompt}\n- Estilo: ${style}\n- Cenas: 3 blocos dinâmicos`;
    }
    return await invoke<string>('generate_creative_plan', {
      prompt,
      projectType,
      style,
      skillIds,
    });
  },

  async getCreativeSkills(category?: string, query?: string): Promise<CreativeSkill[]> {
    if (!isTauri()) return [];
    return await invoke<CreativeSkill[]>('get_creative_skills', { category, query });
  },

  async getCreativeSkillById(id: string): Promise<CreativeSkill | null> {
    if (!isTauri()) return null;
    return await invoke<CreativeSkill | null>('get_creative_skill_by_id', { id });
  },

  async toggleCreativeSkill(id: string, enabled: boolean): Promise<boolean> {
    if (!isTauri()) return true;
    return await invoke<boolean>('toggle_creative_skill', { id, enabled });
  },

  async getOpenCodeStatus(): Promise<OpenCodeStatus> {
    if (!isTauri()) {
      return {
        installed: false,
        version: null,
        binary_path: null,
        running: false,
        workspace_path: '/mock/workspace',
      };
    }
    return await invoke<OpenCodeStatus>('get_opencode_status');
  },

  async createCreativeProject(payload: CreateProjectPayload): Promise<CreativeProject> {
    if (!isTauri()) {
      return {
        ...payload,
        id: 'mock-' + Date.now(),
        prompt: payload.prompt || null,
        style: payload.style || null,
        model: payload.model || null,
        output_path: null,
        thumbnail_path: null,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return await invoke<CreativeProject>('create_creative_project', { payload });
  },

  async getCreativeProject(id: string): Promise<CreativeProject | null> {
    if (!isTauri()) return null;
    return await invoke<CreativeProject | null>('get_creative_project', { id });
  },

  async listCreativeProjects(projectType?: string): Promise<CreativeProject[]> {
    if (!isTauri()) return [];
    return await invoke<CreativeProject[]>('list_creative_projects', { projectType });
  },

  async updateCreativeProject(project: CreativeProject): Promise<void> {
    if (!isTauri()) return;
    await invoke('update_creative_project', { project });
  },

  async deleteCreativeProject(id: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('delete_creative_project', { id });
  },

  async listCreativeAssets(projectId?: string): Promise<CreativeAsset[]> {
    if (!isTauri()) return [];
    return await invoke<CreativeAsset[]>('list_creative_assets', { projectId });
  },

  async importCreativeAsset(filePath: string, projectId?: string): Promise<CreativeAsset> {
    if (!isTauri()) {
      return {
        id: 'asset-' + Date.now(),
        project_id: projectId || null,
        name: 'asset.png',
        asset_type: 'image',
        file_path: filePath,
        file_size_bytes: 1024,
        width: 1080,
        height: 1080,
        duration_sec: null,
        mime_type: 'image/png',
        created_at: new Date().toISOString(),
      };
    }
    return await invoke<CreativeAsset>('import_creative_asset', { filePath, projectId });
  },

  async deleteCreativeAsset(id: string): Promise<void> {
    if (!isTauri()) return;
    await invoke('delete_creative_asset', { id });
  },

  async renderMotionProject(options: RenderMotionOptions): Promise<string> {
    if (!isTauri()) return '/mock/export.mp4';
    return await invoke<string>('render_motion_project', { options });
  },

  async exportRemotionProject(compositionJson: string): Promise<string> {
    if (!isTauri()) return '// Mock Remotion Export';
    return await invoke<string>('export_remotion_project', { compositionJson });
  },

  async listCreativeTemplates(): Promise<CreativeTemplate[]> {
    if (!isTauri()) return [];
    return await invoke<CreativeTemplate[]>('list_creative_templates');
  },

  // ==========================================
  // SUBSCRIPTION AI AGENT ENGINES (M09)
  // ==========================================

  async listAgentEngines(): Promise<AgentInfo[]> {
    if (!isTauri()) {
      return [
        {
          id: 'codex',
          name: 'OpenAI Codex',
          binary_path: '/usr/local/bin/codex',
          version: 'codex-cli 0.164.0',
          auth_status: 'authenticated',
          account_info: 'ChatGPT Subscription (Mock)',
          default_model: 'gpt-6-sol',
          available_models: [
            { id: 'gpt-6-sol', name: 'GPT-6 Sol', description: 'Direção artística avançada' },
            { id: 'o3-mini', name: 'o3-mini', description: 'Raciocínio lógico estruturado' },
          ],
          supports_streaming: true,
          is_subscription: true,
        },
        {
          id: 'antigravity',
          name: 'Google Antigravity',
          binary_path: '/usr/local/bin/agy',
          version: '1.4.10',
          auth_status: 'authenticated',
          account_info: 'Google Antigravity Subscription (Mock)',
          default_model: 'gemini-3.8-flash-high',
          available_models: [
            { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash High', description: 'Multimodal de altíssima velocidade' },
            { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', description: 'Composição visual refinada' },
          ],
          supports_streaming: true,
          is_subscription: true,
        },
        {
          id: 'claude_code',
          name: 'Claude Code',
          binary_path: null,
          version: null,
          auth_status: 'not_installed',
          account_info: null,
          default_model: 'claude-3-7-sonnet',
          available_models: [],
          supports_streaming: true,
          is_subscription: true,
        },
        {
          id: 'opencode',
          name: 'OpenCode',
          binary_path: null,
          version: null,
          auth_status: 'not_installed',
          account_info: null,
          default_model: 'opencode-default',
          available_models: [],
          supports_streaming: true,
          is_subscription: false,
        },
      ];
    }
    return await invoke<AgentInfo[]>('list_agent_engines');
  },

  async getAgentEngineStatus(agentId: string): Promise<AgentInfo> {
    if (!isTauri()) {
      const engines = await this.listAgentEngines();
      return engines.find((e) => e.id === agentId) || engines[0];
    }
    return await invoke<AgentInfo>('get_agent_engine_status', { agentId });
  },

  async executeAgentPrompt(agentId: string, prompt: string, model?: string): Promise<string> {
    if (!isTauri()) {
      return `[Mock resposta de ${agentId}]: Processamento concluído com sucesso.`;
    }
    return await invoke<string>('execute_agent_prompt', { agentId, prompt, model });
  },

  async enhanceImagePrompt(
    prompt: string,
    agentId?: string,
    model?: string,
    references?: ProcessedReference[]
  ): Promise<EnhancePromptResult> {
    if (!isTauri()) {
      return {
        original_prompt: prompt,
        enhanced_prompt: `${prompt}, ultra-detailed, cinematic lighting, 8k resolution, photorealistic, intricate textures, master art direction`,
        agent_id: agentId || 'codex',
        model: model || 'gpt-6-sol',
        reasoning: 'Adicionados modificadores de volumetria de luz e nitidez fotorrealista para o modelo FLUX/SD.',
        recommended_style: 'cinematic',
        recommended_ratio: '16:9',
      };
    }
    return await invoke<EnhancePromptResult>('enhance_image_prompt', {
      prompt,
      agentId,
      model,
      references,
    });
  },

  // ==========================================
  // MULTIMODAL REFERENCE FILES ENGINE (M09)
  // ==========================================

  async inspectReferenceFile(
    filePath: string,
    purpose?: ReferencePurpose,
    agentId?: string,
    modelId?: string
  ): Promise<ProcessedReference> {
    if (!isTauri()) {
      const isImg = filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.webp');
      const isPdf = filePath.endsWith('.pdf');
      const isDocx = filePath.endsWith('.docx');
      const isTxt = filePath.endsWith('.txt') || filePath.endsWith('.md');

      return {
        id: 'ref-' + Date.now(),
        file_path: filePath,
        file_name: filePath.split('/').pop() || 'referencia',
        file_size_bytes: 102400,
        file_type: isImg ? 'image' : isPdf ? 'pdf' : isDocx ? 'docx' : isTxt ? 'text' : 'other',
        mime_type: isImg ? 'image/png' : isPdf ? 'application/pdf' : 'text/plain',
        purpose: purpose || 'product',
        preview_data_url: null,
        width: isImg ? 1024 : null,
        height: isImg ? 1024 : null,
        page_count: isPdf ? 3 : null,
        extracted_text: isPdf || isDocx || isTxt ? 'Mock texto extraído do documento de referência.' : null,
        extraction_status: 'ready',
        compatibility: {
          agent_compatible: true,
          image_model_compatible: false,
          mode: isImg ? 'multimodal_vision' : 'text_extraction',
          notes: isImg
            ? 'OpenAI Codex / Google Antigravity aceita a imagem diretamente para análise visual.'
            : 'Texto extraído pronto para o briefing do agente.',
        },
      };
    }
    return await invoke<ProcessedReference>('inspect_reference_file', {
      filePath,
      purpose,
      agentId,
      modelId,
    });
  },

  async inspectReferenceFilesBatch(
    items: { filePath: string; purpose?: ReferencePurpose }[],
    agentId?: string,
    modelId?: string
  ): Promise<ProcessedReference[]> {
    if (!isTauri()) {
      return Promise.all(items.map((i) => this.inspectReferenceFile(i.filePath, i.purpose, agentId, modelId)));
    }
    const tupleItems = items.map((i) => [i.filePath, i.purpose || null]);
    return await invoke<ProcessedReference[]>('inspect_reference_files_batch', {
      items: tupleItems,
      agentId,
      modelId,
    });
  },

  async getGenerationMetadataByOutput(outputPath: string): Promise<GenerationMetadata | null> {
    if (!isTauri()) {
      return null;
    }
    return await invoke<GenerationMetadata | null>('get_generation_metadata_by_output', {
      outputPath,
    });
  },

  // ==========================================
  // IMAGE STUDIO 2.0 CAPABILITIES & EDITING (M09)
  // ==========================================

  async listImageModelCapabilities(): Promise<ImageModelCapabilities[]> {
    if (!isTauri()) {
      return [
        {
          id: 'black-forest-labs/flux.1-schnell',
          display_name: 'FLUX.1-schnell (Ultra Rápido)',
          provider: 'nvidia_nim',
          supports_dimensions: false,
          min_steps: 1,
          max_steps: 4,
          default_steps: 4,
          min_cfg: 1.0,
          max_cfg: 5.0,
          default_cfg: 1.0,
          supports_negative_prompt: false,
          supported_aspect_ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
        },
        {
          id: 'black-forest-labs/flux.1-dev',
          display_name: 'FLUX.1-dev (Alta Fidelidade)',
          provider: 'nvidia_nim',
          supports_dimensions: false,
          min_steps: 20,
          max_steps: 50,
          default_steps: 28,
          min_cfg: 1.0,
          max_cfg: 10.0,
          default_cfg: 3.5,
          supports_negative_prompt: false,
          supported_aspect_ratios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        },
        {
          id: 'stabilityai/stable-diffusion-3.5-large',
          display_name: 'Stable Diffusion 3.5 Large',
          provider: 'nvidia_nim',
          supports_dimensions: false,
          min_steps: 20,
          max_steps: 50,
          default_steps: 30,
          min_cfg: 1.0,
          max_cfg: 15.0,
          default_cfg: 4.5,
          supports_negative_prompt: true,
          supported_aspect_ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
        },
      ];
    }
    return await invoke<ImageModelCapabilities[]>('list_image_model_capabilities');
  },

  async editImageAsset(options: ImageEditOptions): Promise<ImageEditResult> {
    if (!isTauri()) {
      return {
        output_path: options.output_path || options.input_path,
        width: 1024,
        height: 1024,
        file_size_bytes: 512000,
      };
    }
    return await invoke<ImageEditResult>('edit_image_asset', { options });
  },

  async addAssetToMotionComposition(
    projectId: string,
    assetPath: string,
    sceneIndex?: number
  ): Promise<string> {
    if (!isTauri()) {
      return 'layer-mock-' + Date.now();
    }
    return await invoke<string>('add_asset_to_motion_composition', {
      projectId,
      assetPath,
      sceneIndex,
    });
  },

  // ==========================================
  // TOOLSONDESK MIGRATION COMMANDS
  // ==========================================

  async getMigrationStatus(): Promise<MigrationStatus> {
    if (!isTauri()) {
      return {
        hasLegacyData: false,
        isMigrated: true,
        currentStep: 'COMPLETED',
        message: 'Ambiente ToolsOnDesk validado.',
        progressPercent: 100,
        preservedProjectsCount: 0,
        preservedAssetsCount: 0,
        preservedTasksCount: 0,
        preservedHistoryCount: 0,
        preservedErrorLogsCount: 0,
        credentialsMigrated: false,
        binariesReused: false,
      };
    }
    return await invoke<MigrationStatus>('get_migration_status');
  },

  async runMigration(): Promise<MigrationStatus> {
    if (!isTauri()) {
      return {
        hasLegacyData: false,
        isMigrated: true,
        currentStep: 'COMPLETED',
        message: 'Migração concluída com sucesso (mock).',
        progressPercent: 100,
        preservedProjectsCount: 1,
        preservedAssetsCount: 1,
        preservedTasksCount: 3,
        preservedHistoryCount: 3,
        preservedErrorLogsCount: 1,
        credentialsMigrated: true,
        binariesReused: true,
      };
    }
    return await invoke<MigrationStatus>('run_migration');
  },

  async dismissMigrationPrompt(): Promise<void> {
    if (!isTauri()) return;
    await invoke('dismiss_migration_prompt');
  },

  onMigrationProgress(callback: (progress: MigrationProgressEvent) => void) {
    if (!isTauri()) return () => {};
    let unlistenFn: (() => void) | null = null;
    listen<MigrationProgressEvent>('migration:progress', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },

  // ==========================================
  // MOTION DIRECTOR (Mission 10)
  // ==========================================

  async generateMotionPlan(briefing: MotionBriefing): Promise<MotionDirectorPlan> {
    if (!isTauri()) {
      // Return a mock plan for web development
      const width = briefing.width || 1080;
      const height = briefing.height || 1920;
      const duration = briefing.duration_sec || 15;
      const fps = briefing.fps || 30;
      const sceneDuration = duration / 4;
      return {
        project: {
          title: briefing.title || 'Motion Project',
          concept: briefing.prompt,
          style: briefing.style,
          width,
          height,
          fps,
          duration_sec: duration,
          background_color: '#0B0F10',
          color_palette: ['#0B0F10', '#141A1C', '#15F5BA', '#F3F4F6'],
          typography: {
            primary_font: 'Geist',
            secondary_font: 'Geist Mono',
            heading_size: 72,
            body_size: 24,
            accent_color: '#15F5BA',
          },
        },
        scenes: [
          {
            id: 'scene-1',
            order: 1,
            title: 'Gancho / Hook',
            duration_sec: sceneDuration,
            start_time: 0,
            description: 'Abertura impactante com gancho visual e textual',
            visual_cue: 'Entrada cinética do título principal com partículas ou brilho mint',
            camera_movement: 'Dolly In Suave',
            layers: [
              {
                id: 'bg-1',
                layer_type: 'gradient',
                name: 'Background',
                content: '',
                start_time: 0,
                duration_sec: sceneDuration,
                transform: { x: 0, y: 0, width: 1, height: 1, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: 'transparent',
                  gradient: { type: 'linear', stops: [{ color: '#0B0F10', position: 0 }, { color: '#141A1C', position: 1 }], angle: 135 },
                },
                z_index: -100,
              },
              {
                id: 'headline-1',
                layer_type: 'text',
                name: 'Título Principal',
                content: 'TOOLSONDESK CREATIVE STUDIO',
                start_time: 0.3,
                duration_sec: sceneDuration - 0.3,
                transform: { x: 0.08, y: 0.25, width: 0.84, height: 0.18, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#15F5BA',
                  font_size: 72,
                  font_family: 'Geist',
                  font_weight: '700',
                  text_align: 'left',
                  line_height: 1.1,
                  letter_spacing: -0.02,
                  shadow: { offset_x: 0, offset_y: 4, blur: 20, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.y', keyframes: [{ time: 0, value: 0.33 }, { time: 0.5, value: 0.25 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_up',
                },
                z_index: 20,
              },
            ],
            transition_in: undefined,
            transition_out: { type: 'wipe', duration_sec: 0.6, easing: 'ease_in_out', direction: 'left' },
          },
          {
            id: 'scene-2',
            order: 2,
            title: 'Produto / Valor',
            duration_sec: sceneDuration * 1.5,
            start_time: sceneDuration,
            description: 'Apresentação do produto com benefícios visuais',
            visual_cue: 'Screenshot real da aplicação com zoom e pan simulado (Ken Burns)',
            camera_movement: 'Pan Lateral + Zoom',
            layers: [
              {
                id: 'bg-2',
                layer_type: 'gradient',
                name: 'Background',
                content: '',
                start_time: 0,
                duration_sec: sceneDuration * 1.5,
                transform: { x: 0, y: 0, width: 1, height: 1, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: 'transparent',
                  gradient: { type: 'linear', stops: [{ color: '#0B0F10', position: 0 }, { color: '#141A1C', position: 1 }], angle: 135 },
                },
                z_index: -100,
              },
              {
                id: 'feat-2-0',
                layer_type: 'shape',
                name: 'Feature Card',
                content: '✨ FERRAMENTAS CRIATIVAS',
                start_time: 0.3,
                duration_sec: sceneDuration * 1.5 - 0.3,
                transform: { x: 0.08, y: 0.2, width: 0.84, height: 0.2, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#F3F4F6',
                  background_color: '#141A1C',
                  font_size: 28,
                  font_family: 'Geist',
                  font_weight: '500',
                  text_align: 'left',
                  line_height: 1.3,
                  border_radius: 12,
                  border_width: 1,
                  border_color: '#1F292B',
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.x', keyframes: [{ time: 0, value: -0.02 }, { time: 0.5, value: 0.08 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_right',
                },
                z_index: 15,
              },
              {
                id: 'feat-2-1',
                layer_type: 'shape',
                name: 'Feature Card',
                content: '⚡ PRODUTIVIDADE IA',
                start_time: 0.45,
                duration_sec: sceneDuration * 1.5 - 0.45,
                transform: { x: 0.08, y: 0.45, width: 0.84, height: 0.2, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#F3F4F6',
                  background_color: '#141A1C',
                  font_size: 28,
                  font_family: 'Geist',
                  font_weight: '500',
                  text_align: 'left',
                  line_height: 1.3,
                  border_radius: 12,
                  border_width: 1,
                  border_color: '#1F292B',
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.x', keyframes: [{ time: 0, value: -0.02 }, { time: 0.5, value: 0.08 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_right',
                },
                z_index: 15,
              },
            ],
            transition_in: { type: 'fade', duration_sec: 0.5, easing: 'ease_in_out', direction: undefined },
            transition_out: { type: 'wipe', duration_sec: 0.6, easing: 'ease_in_out', direction: 'left' },
          },
          {
            id: 'scene-3',
            order: 3,
            title: 'Funcionalidades',
            duration_sec: sceneDuration * 1.2,
            start_time: sceneDuration * 2.5,
            description: 'Destaque de 3+ funcionalidades com animações independentes',
            visual_cue: 'Cards animados em cascade/stagger com ícones e métricas',
            camera_movement: 'Parallax em camadas',
            layers: [
              {
                id: 'bg-3',
                layer_type: 'gradient',
                name: 'Background',
                content: '',
                start_time: 0,
                duration_sec: sceneDuration * 1.2,
                transform: { x: 0, y: 0, width: 1, height: 1, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: 'transparent',
                  gradient: { type: 'linear', stops: [{ color: '#0B0F10', position: 0 }, { color: '#141A1C', position: 1 }], angle: 135 },
                },
                z_index: -100,
              },
              {
                id: 'feat-3-0',
                layer_type: 'shape',
                name: 'Feature Card',
                content: '🎬 MOTION DESIGN',
                start_time: 0.3,
                duration_sec: sceneDuration * 1.2 - 0.3,
                transform: { x: 0.08, y: 0.2, width: 0.84, height: 0.2, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#F3F4F6',
                  background_color: '#141A1C',
                  font_size: 28,
                  font_family: 'Geist',
                  font_weight: '500',
                  text_align: 'left',
                  line_height: 1.3,
                  border_radius: 12,
                  border_width: 1,
                  border_color: '#1F292B',
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.x', keyframes: [{ time: 0, value: -0.02 }, { time: 0.5, value: 0.08 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_right',
                },
                z_index: 15,
              },
              {
                id: 'feat-3-1',
                layer_type: 'shape',
                name: 'Feature Card',
                content: '🖼️ AI IMAGE STUDIO',
                start_time: 0.45,
                duration_sec: sceneDuration * 1.2 - 0.45,
                transform: { x: 0.08, y: 0.45, width: 0.84, height: 0.2, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#F3F4F6',
                  background_color: '#141A1C',
                  font_size: 28,
                  font_family: 'Geist',
                  font_weight: '500',
                  text_align: 'left',
                  line_height: 1.3,
                  border_radius: 12,
                  border_width: 1,
                  border_color: '#1F292B',
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.x', keyframes: [{ time: 0, value: -0.02 }, { time: 0.5, value: 0.08 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_right',
                },
                z_index: 15,
              },
              {
                id: 'feat-3-2',
                layer_type: 'shape',
                name: 'Feature Card',
                content: '📱 MULTI-PLATAFORMA',
                start_time: 0.6,
                duration_sec: sceneDuration * 1.2 - 0.6,
                transform: { x: 0.08, y: 0.7, width: 0.84, height: 0.2, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: '#F3F4F6',
                  background_color: '#141A1C',
                  font_size: 28,
                  font_family: 'Geist',
                  font_weight: '500',
                  text_align: 'left',
                  line_height: 1.3,
                  border_radius: 12,
                  border_width: 1,
                  border_color: '#1F292B',
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#000000' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.x', keyframes: [{ time: 0, value: -0.02 }, { time: 0.5, value: 0.08 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'slide_right',
                },
                z_index: 15,
              },
            ],
            transition_in: { type: 'fade', duration_sec: 0.5, easing: 'ease_in_out', direction: undefined },
            transition_out: { type: 'wipe', duration_sec: 0.6, easing: 'ease_in_out', direction: 'left' },
          },
          {
            id: 'scene-4',
            order: 4,
            title: 'CTA / Encerramento',
            duration_sec: sceneDuration,
            start_time: sceneDuration * 3.7,
            description: 'Logotipo, chamada para ação e saída animada',
            visual_cue: 'Logo com animação spring + brilho sweep + botão CTA pulsante',
            camera_movement: undefined,
            layers: [
              {
                id: 'bg-4',
                layer_type: 'gradient',
                name: 'Background',
                content: '',
                start_time: 0,
                duration_sec: sceneDuration,
                transform: { x: 0, y: 0, width: 1, height: 1, rotation: 0, scale: 1, opacity: 1, anchor_x: 0, anchor_y: 0 },
                style: {
                  color: 'transparent',
                  gradient: { type: 'linear', stops: [{ color: '#0B0F10', position: 0 }, { color: '#141A1C', position: 1 }], angle: 135 },
                },
                z_index: -100,
              },
              {
                id: 'logo-4',
                layer_type: 'svg',
                name: 'Logo ToolsOnDesk',
                content: '',
                start_time: 0.3,
                duration_sec: sceneDuration - 0.3,
                transform: { x: 0.35, y: 0.25, width: 0.3, height: 0.3, rotation: 0, scale: 1, opacity: 1, anchor_x: 0.5, anchor_y: 0.5 },
                style: {
                  color: '#15F5BA',
                  shadow: { offset_x: 0, offset_y: 0, blur: 30, color: '#15F5BA' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.scale', keyframes: [{ time: 0, value: 0.5 }, { time: 0.4, value: 1.1 }, { time: 0.6, value: 1.0 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.2, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'spring',
                },
                z_index: 50,
              },
              {
                id: 'cta-4',
                layer_type: 'text',
                name: 'Call to Action',
                content: 'BAIXE AGORA',
                start_time: 0.6,
                duration_sec: sceneDuration - 0.6,
                transform: { x: 0.2, y: 0.65, width: 0.6, height: 0.12, rotation: 0, scale: 1, opacity: 1, anchor_x: 0.5, anchor_y: 0.5 },
                style: {
                  color: '#0B0F10',
                  background_color: '#15F5BA',
                  font_size: 36,
                  font_family: 'Geist',
                  font_weight: '700',
                  text_align: 'center',
                  line_height: 1.0,
                  letter_spacing: 0.05,
                  border_radius: 50,
                  shadow: { offset_x: 0, offset_y: 8, blur: 24, color: '#15F5BA' },
                },
                animation: {
                  tracks: [
                    { property: 'transform.scale', keyframes: [{ time: 0, value: 0.9 }, { time: 0.5, value: 1.05 }, { time: 1, value: 1.0 }], easing: 'spring' },
                    { property: 'opacity', keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }], easing: 'ease_in_out' },
                  ],
                  preset: 'pulse',
                },
                z_index: 40,
              },
            ],
            transition_in: { type: 'fade', duration_sec: 0.5, easing: 'ease_in_out', direction: undefined },
            transition_out: undefined,
          },
        ],
        audio: undefined,
        metadata: {
          created_at: new Date().toISOString(),
          generator: 'local_fallback',
          skills_used: ['storyboard-creation', 'short-form-storytelling', 'advertising-design', 'kinetic-typography', 'logo-animation'],
          references_used: briefing.references.map(r => r.file_path),
          version: '1.0',
        },
      };
    }
    const planJson = await invoke<string>('generate_motion_plan', { briefing });
    return JSON.parse(planJson);
  },

  async convertPlanToComposition(planJson: string): Promise<string> {
    if (!isTauri()) return planJson; // In web, plan and composition are similar
    return await invoke<string>('convert_plan_to_composition', { planJson });
  },
};
