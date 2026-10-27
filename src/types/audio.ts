export interface VideoStreamInfo {
  index: number;
  codecName: string;
  width: number;
  height: number;
  fps: number;
  bitRate?: number;
}

export interface AudioStreamInfo {
  index: number;
  codecName: string;
  sampleRate: number;
  channels: number;
  bitRate?: number;
}

export interface MediaInfo {
  filePath: string;
  formatName: string;
  durationSeconds: number;
  sizeBytes: number;
  bitRate?: number;
  videoStreams: VideoStreamInfo[];
  audioStreams: AudioStreamInfo[];
}

export interface AudioConvertOptions {
  inputPath: string;
  outputDir?: string;
  format: string;
  bitrateKbps?: number;
  channels?: number;
  sampleRate?: number;
  normalizeVolume: boolean;
}

export interface AudioTrimOptions {
  inputPath: string;
  outputDir?: string;
  startSeconds: number;
  endSeconds: number;
  format?: string;
}
