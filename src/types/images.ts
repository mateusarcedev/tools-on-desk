export type ImageTool = 'convert' | 'resize' | 'compress' | 'pdf';
export type ImageFormat = 'JPG' | 'PNG' | 'WEBP' | 'AVIF' | 'TIFF' | 'BMP';

export interface ImageItem {
  id: string;
  name: string;
  path?: string;
  w: number;
  h: number;
  kb: number;
  url?: string;
  previewUrl?: string;
}

export interface ImageConvertOptions {
  files: string[];
  format: ImageFormat;
  quality: number; // 1 to 100
  targetWidth?: number;
  targetHeight?: number;
  preserveRatio: boolean;
  outputFolder?: string;
}

export interface ImagesToPdfOptions {
  files: string[];
  pageSize: 'A4' | 'Carta' | 'Ajustar';
  margin: 'Nenhuma' | 'Pequena' | 'Grande';
  singlePdf: boolean;
  outputFolder?: string;
  outputPdf: string;
}
