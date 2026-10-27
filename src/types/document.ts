export type DocumentTool =
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'organize-pdf'
  | 'compress-pdf';

export interface PdfPageInfo {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  rotationDeg: number;
  textSnippet?: string | null;
}

export interface PdfInfo {
  path: string;
  pageCount: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  isEncrypted: boolean;
  hasSelectableText: boolean;
  title?: string | null;
  author?: string | null;
  creator?: string | null;
  pageWidthPt?: number | null;
  pageHeightPt?: number | null;
  orientation?: string | null;
  pages: PdfPageInfo[];
}

export interface PdfMergeOptions {
  sourcePaths: string[];
  targetPath: string;
}

export interface PdfSplitOptions {
  sourcePath: string;
  targetDir: string;
  mode: 'all' | 'ranges' | 'every_n';
  ranges?: string | null;
  everyN?: number | null;
  exportSingle?: boolean | null;
  outputFilename?: string | null;
}

export interface PdfPageAction {
  originalPage: number;
  rotationDeg: number;
}

export interface PdfOrganizeOptions {
  sourcePath: string;
  targetPath: string;
  pages: PdfPageAction[];
}

export interface PdfCompressOptions {
  sourcePath: string;
  targetPath: string;
  level: 'lossless' | 'recommended' | 'extreme';
}

export interface WordToPdfOptions {
  sourcePath: string;
  targetPath?: string | null;
}

export interface PdfToDocxOptions {
  sourcePath: string;
  targetPath?: string | null;
  mode: 'editable_text' | 'layout_preserve';
}

export interface DocumentOperationResult {
  success: boolean;
  outputPath: string;
  outputSizeBytes: number;
  originalSizeBytes?: number | null;
  savedPercent?: number | null;
  pageCount?: number | null;
  message: string;
}

export interface LibreOfficeStatus {
  isAvailable: boolean;
  path?: string | null;
  version?: string | null;
  notes: string;
}
