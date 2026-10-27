export type PaperType = 'A4' | 'A3' | 'Personalizado';
export type Orientation = 'Retrato' | 'Paisagem';
export type PosterMode = 'Por páginas' | 'Por largura';
export type ColorEffect = 'Original' | 'P&B' | 'Pontilhismo' | 'Retícula';

export interface PosterConfig {
  paper: PaperType;
  customW: number; // in mm
  customH: number; // in mm
  orientation: Orientation;
  mode: PosterMode;
  cols: number;
  widthCm: number;
  margin: number; // in mm
  overlap: number; // in mm
  cropMarks: boolean;
  pageNumbers: boolean;
  grid: boolean;
  effect: ColorEffect;
  dotSize: number;
}

export interface SheetCell {
  left: string;
  top: string;
  width: string;
  height: string;
  label: string;
}

export interface PosterCalculation {
  paperW: number;
  paperH: number;
  contentW: number;
  contentH: number;
  stepW: number;
  stepH: number;
  cols: number;
  rows: number;
  totalW: number;
  totalH: number;
  pages: number;
  dpi: number;
  lowDpi: boolean;
}
