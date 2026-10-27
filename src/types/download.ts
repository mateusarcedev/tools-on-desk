export interface DownloadFormatOption {
  formatId: string;
  extension: string;
  resolution?: string;
  note?: string;
  filesizeApprox?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface PlaylistItemInfo {
  id: string;
  title: string;
  url: string;
  durationSeconds?: number;
  uploader?: string;
}

export interface MediaDownloadInfo {
  url: string;
  title: string;
  uploader?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  formats: DownloadFormatOption[];
  isPlaylist: boolean;
  playlistItems?: PlaylistItemInfo[];
  platform: string;
  platformName: string;
}

export interface DownloadOptions {
  url: string;
  outputDir?: string;
  audioOnly: boolean;
  audioFormat?: 'mp3' | 'm4a' | 'wav' | 'flac' | 'opus' | string;
  quality?: string;
  formatId?: string;
}

export interface YtDlpStatus {
  version: string;
  path: string;
  origin: string;
  isAvailable: boolean;
}
