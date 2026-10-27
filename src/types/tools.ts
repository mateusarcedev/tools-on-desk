export interface ToolStatus {
  name: string;
  available: boolean;
  version: string | null;
  path: string | null;
  license: string | null;
  details: string | null;
}

export interface ExternalToolsStatus {
  ffmpeg: ToolStatus;
  ffprobe: ToolStatus;
  ytDlp: ToolStatus;
}
