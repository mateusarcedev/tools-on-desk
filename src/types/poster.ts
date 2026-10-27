export type PaperType = 'A4' | 'A3' | 'Letter' | 'Legal' | 'Personalizado';
export type Orientation = 'Retrato' | 'Paisagem';
export type PosterMode = 'Por páginas' | 'Por largura';
export type ColorEffect =
  | 'Original'
  | 'P&B'
  | 'HalftoneMono'
  | 'HalftoneColor'
  | 'FloydSteinberg'
  | 'HighContrast';
export type DotShape = 'circle' | 'square';

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
  dotShape: DotShape;
  dotPitchMm: number;
  minDotSize: number;
  maxDotSize: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  intensity: number;
  dotColor: string; // hex
  bgColor: string; // hex
  rotateDeg: number; // 0, 90, 180, 270
}

export interface SheetCell {
  left: string;
  top: string;
  width: string;
  height: string;
  label: string;
  col: number;
  row: number;
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
  humanScaleRatio: number;
}
