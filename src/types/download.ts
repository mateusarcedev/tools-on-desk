export interface DownloadFormatOption {
  formatId: string;
  extension: string;
  resolution?: string;
  note?: string;
  filesizeApprox?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface MediaDownloadInfo {
  url: string;
  title: string;
  uploader?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  formats: DownloadFormatOption[];
  isPlaylist: boolean;
}

export interface DownloadOptions {
  url: string;
  outputDir?: string;
  audioOnly: boolean;
  audioFormat?: string;
  quality?: string;
  formatId?: string;
}
