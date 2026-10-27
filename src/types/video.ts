export interface VideoConvertOptions {
  inputPath: string;
  outputDir?: string;
  format: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  crf?: number;
  muteAudio: boolean;
}

export interface VideoCompressOptions {
  inputPath: string;
  outputDir?: string;
  preset: string; // 'high' | 'balanced' | 'small' | 'custom'
  crf: number;
  targetResolution?: string;
}

export interface VideoTrimOptions {
  inputPath: string;
  outputDir?: string;
  startSeconds: number;
  endSeconds: number;
  fastCopy: boolean;
}

export interface VideoExtractAudioOptions {
  inputPath: string;
  outputDir?: string;
  format: string;
  bitrateKbps?: number;
}

export interface VideoExtractFrameOptions {
  inputPath: string;
  outputDir?: string;
  timestampSeconds: number;
  format: string;
}
