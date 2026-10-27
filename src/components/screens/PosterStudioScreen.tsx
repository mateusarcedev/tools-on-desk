import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { PosterConfig, PaperType, ColorEffect } from '../../types/poster';
import { TauriService } from '../../services/tauri';

interface PosterStudioScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onOpenExplorer: (path?: string) => void;
}

const PAPERS: Record<string, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
};

const COLOR_PRESETS = [
  { name: 'Clássico P&B', dot: '#0f172a', bg: '#ffffff' },
  { name: 'Invertido Escuro', dot: '#ffffff', bg: '#0b0f10' },
  { name: 'Cyberpunk Menta', dot: '#15f5ba', bg: '#0b0f10' },
  { name: 'Retrô Âmbar', dot: '#f59e0b', bg: '#1c1917' },
  { name: 'Blueprint Azul', dot: '#38bdf8', bg: '#0f172a' },
  { name: 'Sépia Editorial', dot: '#78350f', bg: '#fef3c7' },
];

const STEPS = [
  { id: 1, label: 'Imagem', icon: 'image' },
  { id: 2, label: 'Tamanho', icon: 'grid' },
  { id: 3, label: 'Estilo', icon: 'sliders' },
  { id: 4, label: 'Cores', icon: 'droplet' },
  { id: 5, label: 'Impressão', icon: 'printer' },
  { id: 6, label: 'Exportação', icon: 'download' },
];

export const PosterStudioScreen: React.FC<PosterStudioScreenProps> = ({
  onShowToast,
  onOpenExplorer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // App mode: 'quick' or 'advanced'
  const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>('quick');
  const [currentStep, setCurrentStep] = useState(1);

  // Image state
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgPath, setImgPath] = useState<string | null>(null);
  const [imgName, setImgName] = useState('exemplo_poster.jpg');
  const [imgW, setImgW] = useState(3840);
  const [imgH, setImgH] = useState(2160);
  const [imgSizeMb, setImgSizeMb] = useState<number | null>(null);

  // Processed preview from Rust backend
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [showProcessed, setShowProcessed] = useState(true);
  const [showHumanScale, setShowHumanScale] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Stage dimensions
  const [stageW, setStageW] = useState(700);
  const [stageH, setStageH] = useState(500);

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<string | null>(null);

  // Main configuration
  const [config, setConfig] = useState<PosterConfig>({
    paper: 'A4',
    customW: 210,
    customH: 297,
    orientation: 'Retrato',
    mode: 'Por páginas',
    cols: 4,
    widthCm: 80,
    margin: 10,
    overlap: 5,
    cropMarks: true,
    pageNumbers: true,
    grid: true,
    effect: 'Original',
    dotShape: 'circle',
    dotPitchMm: 4.0,
    minDotSize: 0.05,
    maxDotSize: 0.95,
    brightness: 0,
    contrast: 0,
    invert: false,
    intensity: 1.0,
    dotColor: '#0f172a',
    bgColor: '#ffffff',
    rotateDeg: 0,
  });

  // Track stage container size
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 50 && height > 50) {
        setStageW(width);
        setStageH(height);
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  // Update backend preview when options change (debounced)
  useEffect(() => {
    if (!imgPath) return;
    const timer = setTimeout(async () => {
      try {
        const preview = await TauriService.renderPosterPreview({
          paper: config.paper,
          customWMm: config.paper === 'Personalizado' ? config.customW : undefined,
          customHMm: config.paper === 'Personalizado' ? config.customH : undefined,
          orientation: config.orientation,
          mode: config.mode,
          cols: config.cols,
          widthCm: config.widthCm,
          marginMm: config.margin,
          overlapMm: config.overlap,
          cropMarks: config.cropMarks,
          pageNumbers: config.pageNumbers,
          effect: config.effect,
          dotShape: config.dotShape,
          dotPitchMm: config.dotPitchMm,
          minDotSize: config.minDotSize,
          maxDotSize: config.maxDotSize,
          brightness: config.brightness,
          contrast: config.contrast,
          invert: config.invert,
          intensity: config.intensity,
          dotColor: config.dotColor,
          bgColor: config.bgColor,
          rotateDeg: config.rotateDeg,
          sourcePath: imgPath,
          targetPdf: '',
        });
        if (preview) {
          setPreviewSrc(preview);
        }
      } catch {
        // fallback to client-side display
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [
    imgPath,
    config.effect,
    config.dotShape,
    config.dotPitchMm,
    config.minDotSize,
    config.maxDotSize,
    config.brightness,
    config.contrast,
    config.invert,
    config.dotColor,
    config.bgColor,
    config.rotateDeg,
  ]);

  const handleSelectLocalImage = async () => {
    try {
      const files = await TauriService.selectFiles({
        multiple: false,
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
        title: 'Selecionar imagem para o Poster Studio',
      });
      if (files && files.length > 0) {
        const path = files[0];
        setImgPath(path);
        const name = path.split(/[\\/]/).pop() || 'imagem.jpg';
        setImgName(name);

        const img = new Image();
        img.onload = () => {
          setImgW(img.naturalWidth);
          setImgH(img.naturalHeight);
          onShowToast(`Imagem carregada: ${name} (${img.naturalWidth}×${img.naturalHeight}px)`);
        };
        const localAssetUrl = `https://asset.localhost/${path}`;
        img.src = localAssetUrl;
        setImgSrc(localAssetUrl);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleNativeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Selecione um arquivo de imagem válido (PNG, JPG ou WebP)', 'err');
      return;
    }

    setImgSizeMb(Number((file.size / (1024 * 1024)).toFixed(2)));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgW(img.naturalWidth);
      setImgH(img.naturalHeight);
      setImgName(file.name);
      setImgSrc(url);
      setImgPath(null);
      onShowToast(`Imagem carregada: ${file.name}`);
    };
    img.src = url;
  };

  const handleRotate = () => {
    setConfig((prev) => ({
      ...prev,
      rotateDeg: (prev.rotateDeg + 90) % 360,
    }));
    onShowToast(`Imagem girada para ${(config.rotateDeg + 90) % 360}°`);
  };

  const handleResetImage = () => {
    setConfig((prev) => ({
      ...prev,
      rotateDeg: 0,
      brightness: 0,
      contrast: 0,
      invert: false,
    }));
    onShowToast('Ajustes de imagem redefinidos');
  };

  // Math calculations for paper, margins, step and sheets
  let [pw, ph] =
    config.paper === 'Personalizado'
      ? [Math.max(50, config.customW), Math.max(50, config.customH)]
      : PAPERS[config.paper] || PAPERS.A4;

  if (config.orientation === 'Paisagem') {
    [pw, ph] = [ph, pw];
  }

  const m = Math.max(0, config.margin);
  const ov = Math.max(0, Math.min(config.overlap, (pw - 2 * m) / 3));
  const cw = Math.max(10, pw - 2 * m);
  const ch = Math.max(10, ph - 2 * m);
  const sw = Math.max(5, cw - ov);
  const sh = Math.max(5, ch - ov);

  const effectiveImgW = config.rotateDeg % 180 === 90 ? imgH : imgW;
  const effectiveImgH = config.rotateDeg % 180 === 90 ? imgW : imgH;
  const ar = effectiveImgW / effectiveImgH;

  const cols =
    config.mode === 'Por páginas'
      ? Math.max(1, Math.min(30, config.cols))
      : Math.max(1, Math.min(40, Math.ceil((config.widthCm * 10 - ov) / sw)));

  const totalWmm =
    config.mode === 'Por páginas' ? cols * sw + ov : Math.max(10, config.widthCm * 10);
  const totalHmm = totalWmm / ar;
  const rows = Math.max(1, Math.ceil((totalHmm - ov) / sh));
  const totalPages = cols * rows;

  const finalWidthCm = (totalWmm / 10).toFixed(1);
  const finalHeightCm = (totalHmm / 10).toFixed(1);

  const effectiveDpi = Math.round(effectiveImgW / (totalWmm / 25.4));
  const isLowDpi = effectiveDpi < 100;
  const isOptimalDpi = effectiveDpi >= 150;

  // Viewport scale in stage
  const pad = 60;
  const avW = Math.max(100, stageW - pad * 2);
  const avH = Math.max(100, stageH - pad * 2);
  const baseScale = Math.min(avW / totalWmm, avH / totalHmm);
  const sc = baseScale * zoomLevel;

  const posterRenderW = totalWmm * sc;
  const posterRenderH = totalHmm * sc;

  // Human scale 1.80 m (1800 mm)
  const humanHeightPx = 1800 * sc;

  // Generate sheet cell rectangles for stage preview
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        l: c * sw * sc,
        t: r * sh * sc,
        w: cw * sc,
        h: ch * sc,
        label: `${String.fromCharCode(65 + (r % 26))}${c + 1}`,
        col: c + 1,
        row: r + 1,
      });
    }
  }

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      let src = imgPath;
      if (!src) {
        onShowToast('Selecione uma imagem válida no disco para gerar o PDF', 'warn');
        setIsGenerating(false);
        return;
      }

      const downloadsDir = await TauriService.getSystemInfo().then((s) => s.defaultDownloadFolder);
      const outName = `${imgName.replace(/\.[^/.]+$/, '')}_poster_${cols}x${rows}.pdf`;
      const targetPdf = `${downloadsDir}\\${outName}`;

      await TauriService.startPosterTask({
        paper: config.paper,
        customWMm: config.paper === 'Personalizado' ? config.customW : undefined,
        customHMm: config.paper === 'Personalizado' ? config.customH : undefined,
        orientation: config.orientation,
        mode: config.mode,
        cols,
        widthCm: Number(finalWidthCm),
        marginMm: config.margin,
        overlapMm: config.overlap,
        cropMarks: config.cropMarks,
        pageNumbers: config.pageNumbers,
        effect: config.effect,
        dotShape: config.dotShape,
        dotPitchMm: config.dotPitchMm,
        minDotSize: config.minDotSize,
        maxDotSize: config.maxDotSize,
        brightness: config.brightness,
        contrast: config.contrast,
        invert: config.invert,
        intensity: config.intensity,
        dotColor: config.dotColor,
        bgColor: config.bgColor,
        rotateDeg: config.rotateDeg,
        sourcePath: src,
        targetPdf,
      });

      setLastGeneratedPdf(targetPdf);
      onShowToast(`Geração de pôster iniciada! ${totalPages} páginas em fila (Ctrl+J)`);
    } catch (err: any) {
      onShowToast(`Erro ao gerar pôster: ${err}`, 'err');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeDisplaySrc = (showProcessed && previewSrc) ? previewSrc : (imgSrc || undefined);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeInput}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
      />

      {/* Header with Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--mint)',
            }}
          >
            <span>06 · impressões</span>
            <span>/</span>
            <span>rasterbator desktop</span>
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '2px 0 0',
              color: 'var(--fg)',
            }}
          >
            Poster Studio
          </h1>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SegmentedControl
            options={['Modo Rápido', 'Modo Avançado']}
            value={studioMode === 'quick' ? 'Modo Rápido' : 'Modo Avançado'}
            onChange={(val) => setStudioMode(val === 'Modo Rápido' ? 'quick' : 'advanced')}
          />
        </div>
      </div>

      {/* Stepper (Advanced Mode only) */}
      {studioMode === 'advanced' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 24px',
            background: 'var(--bg-soft)',
            borderBottom: '1px solid var(--line)',
            gap: 16,
          }}
        >
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: isActive
                      ? 'var(--mint)'
                      : isCompleted
                      ? 'var(--fg)'
                      : 'var(--fg-dim)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '12px',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isActive
                        ? 'var(--mint)'
                        : isCompleted
                        ? 'var(--surface-2)'
                        : 'transparent',
                      color: isActive ? 'var(--bg)' : 'inherit',
                      border: isActive || isCompleted ? 'none' : '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '10px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                    }}
                  >
                    {isCompleted ? '✓' : step.id}
                  </span>
                  <span>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 24,
                      height: 1,
                      background: isCompleted ? 'var(--mint)' : 'var(--line)',
                      opacity: isCompleted ? 0.8 : 0.4,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Main Workspace: Left Controls + Center Stage */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Sidebar Controls */}
        <div
          style={{
            width: 320,
            borderRight: '1px solid var(--line)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Mode Controls */}
            {studioMode === 'quick' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-dim)' }}>
                    1. Imagem
                  </label>
                  <Button
                    variant="secondary"
                    onClick={handleSelectLocalImage}
                    icon={<Icon name="upload" size={14} />}
                    style={{ justifyContent: 'center' }}
                  >
                    Trocar Imagem
                  </Button>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>
                    {imgName} ({effectiveImgW}×{effectiveImgH}px)
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-dim)' }}>
                      2. Quantidade de Folhas na Largura
                    </label>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mint)' }}>
                      {cols} colunas
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={cols}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, mode: 'Por páginas', cols: Number(e.target.value) }))
                    }
                    style={{ width: '100%', accentColor: 'var(--mint)' }}
                  />

                  {/* Presets */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {[
                      { label: '2×2 (4 f)', c: 2 },
                      { label: '3×3 (9 f)', c: 3 },
                      { label: '4×3 (12 f)', c: 4 },
                    ].map((p) => (
                      <button
                        key={p.c}
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, mode: 'Por páginas', cols: p.c }))
                        }
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: 6,
                          border: cols === p.c ? '1px solid var(--mint)' : '1px solid var(--line)',
                          background: cols === p.c ? 'var(--mint-soft)' : 'var(--bg-soft)',
                          color: cols === p.c ? 'var(--mint)' : 'var(--fg-dim)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--bg-soft)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
                    Resumo do Pôster
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Tamanho final:</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      {finalWidthCm} × {finalHeightCm} cm
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Total de folhas:</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--mint)' }}>
                      {totalPages} folhas ({cols}×{rows})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Papel:</span>
                    <span style={{ fontFamily: 'var(--mono)' }}>{config.paper} {config.orientation}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Qualidade estimada:</span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        color: isLowDpi ? 'var(--pink)' : 'var(--mint)',
                      }}
                    >
                      {effectiveDpi} DPI {isLowDpi ? '(Baixo)' : isOptimalDpi ? '(Ótimo)' : '(Bom)'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Advanced Stepper Controls */
              <>
                {currentStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 1: Imagem de Origem</div>
                    <Button
                      variant="secondary"
                      onClick={handleSelectLocalImage}
                      icon={<Icon name="upload" size={14} />}
                      style={{ justifyContent: 'center' }}
                    >
                      Carregar Imagem Local
                    </Button>
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: 'var(--bg-soft)',
                        border: '1px solid var(--line)',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div><strong>Arquivo:</strong> {imgName}</div>
                      <div><strong>Resolução original:</strong> {imgW} × {imgH} px</div>
                      <div><strong>Orientação atual:</strong> {config.rotateDeg}°</div>
                      {imgSizeMb && <div><strong>Tamanho:</strong> {imgSizeMb} MB</div>}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={handleRotate} style={{ flex: 1 }}>
                        Girar 90°
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleResetImage} style={{ flex: 1 }}>
                        Redefinir
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 2: Tamanho e Papel</div>

                    <div>
                      <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                        Formato do Papel
                      </label>
                      <SegmentedControl
                        options={['A4', 'A3', 'Letter', 'Legal']}
                        value={config.paper}
                        onChange={(p) => setConfig((prev) => ({ ...prev, paper: p as PaperType }))}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                        Orientação
                      </label>
                      <SegmentedControl
                        options={['Retrato', 'Paisagem']}
                        value={config.orientation}
                        onChange={(o) => setConfig((prev) => ({ ...prev, orientation: o as any }))}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                          Margem (mm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          value={config.margin}
                          onChange={(e) => setConfig((prev) => ({ ...prev, margin: Number(e.target.value) }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'var(--bg)',
                            border: '1px solid var(--line)',
                            borderRadius: 6,
                            color: 'var(--fg)',
                            fontFamily: 'var(--mono)',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                          Sobreposição (mm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="25"
                          value={config.overlap}
                          onChange={(e) => setConfig((prev) => ({ ...prev, overlap: Number(e.target.value) }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'var(--bg)',
                            border: '1px solid var(--line)',
                            borderRadius: 6,
                            color: 'var(--fg)',
                            fontFamily: 'var(--mono)',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>Largura em Folhas</label>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mint)' }}>
                          {cols} colunas
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={cols}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, mode: 'Por páginas', cols: Number(e.target.value) }))
                        }
                        style={{ width: '100%', accentColor: 'var(--mint)' }}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 3: Estilo Artístico</div>

                    <div>
                      <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                        Estilo de Pôster
                      </label>
                      <select
                        value={config.effect}
                        onChange={(e) => setConfig((prev) => ({ ...prev, effect: e.target.value as ColorEffect }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          borderRadius: 6,
                          color: 'var(--fg)',
                          fontFamily: 'var(--sans)',
                        }}
                      >
                        <option value="Original">Original (Foto sem retícula)</option>
                        <option value="P&B">Preto e Branco</option>
                        <option value="HalftoneMono">Halftone Monocromático (Rasterbator)</option>
                        <option value="HalftoneColor">Halftone Colorido (Pop-Art)</option>
                        <option value="FloydSteinberg">Dithering Floyd-Steinberg</option>
                        <option value="HighContrast">Alto Contraste</option>
                      </select>
                    </div>

                    {(config.effect === 'HalftoneMono' || config.effect === 'HalftoneColor') && (
                      <>
                        <div>
                          <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                            Formato dos Pontos
                          </label>
                          <SegmentedControl
                            options={['Círculo', 'Quadrado']}
                            value={config.dotShape === 'circle' ? 'Círculo' : 'Quadrado'}
                            onChange={(v) =>
                              setConfig((prev) => ({ ...prev, dotShape: v === 'Círculo' ? 'circle' : 'square' }))
                            }
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>Espaçamento (Pitch)</label>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mint)' }}>
                              {config.dotPitchMm} mm
                            </span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="15"
                            step="0.5"
                            value={config.dotPitchMm}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, dotPitchMm: Number(e.target.value) }))
                            }
                            style={{ width: '100%', accentColor: 'var(--mint)' }}
                          />
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px' }}>Inverter Tons</span>
                      <Switch
                        checked={config.invert}
                        onChange={(inv) => setConfig((prev) => ({ ...prev, invert: inv }))}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 4: Paleta de Cores</div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                          Cor dos Pontos
                        </label>
                        <input
                          type="color"
                          value={config.dotColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, dotColor: e.target.value }))}
                          style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid var(--line)', background: 'none' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                          Cor do Fundo
                        </label>
                        <input
                          type="color"
                          value={config.bgColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, bgColor: e.target.value }))}
                          style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid var(--line)', background: 'none' }}
                        />
                      </div>
                    </div>

                    <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>Presets Rápidos</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => setConfig((prev) => ({ ...prev, dotColor: p.dot, bgColor: p.bg }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: 'var(--bg-soft)',
                            border: '1px solid var(--line)',
                            cursor: 'pointer',
                            color: 'var(--fg)',
                            fontSize: '11.5px',
                          }}
                        >
                          <span>{p.name}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.dot, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.bg, border: '1px solid rgba(0,0,0,0.2)' }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 5: Impressão e Montagem</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px' }}>Marcas de Corte</span>
                      <Switch
                        checked={config.cropMarks}
                        onChange={(v) => setConfig((prev) => ({ ...prev, cropMarks: v }))}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px' }}>Numeração e Coordenadas</span>
                      <Switch
                        checked={config.pageNumbers}
                        onChange={(v) => setConfig((prev) => ({ ...prev, pageNumbers: v }))}
                      />
                    </div>

                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: 'var(--bg-soft)',
                        border: '1px solid var(--line)',
                        fontSize: '11px',
                        lineHeight: 1.5,
                        color: 'var(--fg-dim)',
                      }}
                    >
                      <strong style={{ color: 'var(--fg)' }}>Dica de Montagem:</strong> Ao imprimir o PDF, configure sua impressora com <strong>Escala: 100% (Sem redimensionar)</strong> para garantir que as margens de {config.margin} mm e sobreposição de {config.overlap} mm casem com exatidão física.
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Etapa 6: Resumo da Exportação</div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'var(--bg-soft)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-dim)' }}>Dimensões:</span>
                        <strong>{finalWidthCm} × {finalHeightCm} cm</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-dim)' }}>Grade de folhas:</span>
                        <strong>{cols} colunas × {rows} linhas</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-dim)' }}>Total de páginas:</span>
                        <strong style={{ color: 'var(--mint)' }}>{totalPages} folhas</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-dim)' }}>DPI Estimado:</span>
                        <strong>{effectiveDpi} DPI</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-dim)' }}>Estilo:</span>
                        <span>{config.effect}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Actions Footer */}
          <div
            style={{
              padding: '14px 18px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {lastGeneratedPdf && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenExplorer(lastGeneratedPdf)}
                style={{ width: '100%', justifyContent: 'center' }}
                icon={<Icon name="folder" size={14} />}
              >
                Abrir PDF Gerado no Explorer
              </Button>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {studioMode === 'quick' ? (
                <Button
                  variant="primary"
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  icon={<Icon name="printer" size={15} />}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isGenerating ? 'Gerando Pôster...' : `Exportar PDF (${totalPages} folhas)`}
                </Button>
              ) : (
                <>
                  {currentStep > 1 && (
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentStep((s) => s - 1)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Voltar
                    </Button>
                  )}
                  {currentStep < 6 ? (
                    <Button
                      variant="primary"
                      onClick={() => setCurrentStep((s) => s + 1)}
                      style={{ flex: 2, justifyContent: 'center' }}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleGeneratePdf}
                      disabled={isGenerating}
                      icon={<Icon name="printer" size={15} />}
                      style={{ flex: 2, justifyContent: 'center' }}
                    >
                      {isGenerating ? 'Exportando...' : 'Gerar PDF Final'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center Stage: Preview Workspace */}
        <div
          ref={stageRef}
          style={{
            flex: 1,
            position: 'relative',
            background: 'var(--bg-dark, #06090a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Top Stage Floating Toolbar */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(20, 26, 28, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--line)',
            }}
          >
            {/* Original vs Processed Toggle */}
            <button
              onClick={() => setShowProcessed((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 6,
                background: showProcessed ? 'var(--mint-soft)' : 'transparent',
                color: showProcessed ? 'var(--mint)' : 'var(--fg-dim)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--mono)',
              }}
            >
              <Icon name="eye" size={13} />
              <span>{showProcessed ? 'Estilo Processado' : 'Original'}</span>
            </button>

            <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

            {/* Human Scale Toggle */}
            <button
              onClick={() => setShowHumanScale((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 6,
                background: showHumanScale ? 'var(--surface-2)' : 'transparent',
                color: showHumanScale ? 'var(--fg)' : 'var(--fg-dim)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--mono)',
              }}
            >
              <span>🧍</span>
              <span>Silhueta (1,80 m)</span>
            </button>

            <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

            {/* Zoom Controls */}
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
              style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 4 }}
              title="Diminuir Zoom"
            >
              <Icon name="zoom-out" size={14} />
            </button>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
              style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 4 }}
              title="Aumentar Zoom"
            >
              <Icon name="zoom-in" size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mint)',
                cursor: 'pointer',
                fontSize: '10.5px',
                fontFamily: 'var(--mono)',
                marginLeft: 4,
              }}
            >
              Ajustar
            </button>

            <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

            {/* DPI Badge */}
            <span
              style={{
                fontSize: '10.5px',
                fontFamily: 'var(--mono)',
                padding: '2px 6px',
                borderRadius: 4,
                background: isLowDpi ? 'rgba(239, 68, 68, 0.15)' : 'rgba(21, 245, 186, 0.15)',
                color: isLowDpi ? '#ef4444' : 'var(--mint)',
              }}
            >
              {effectiveDpi} DPI {isLowDpi ? '⚠ Baixa resolução' : isOptimalDpi ? '✓ Alta definição' : '✓ Boa definição'}
            </span>
          </div>

          {/* Poster Stage Viewport */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 32,
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.15s ease',
            }}
          >
            {/* Poster Canvas / Grid Box */}
            <div
              style={{
                width: posterRenderW,
                height: posterRenderH,
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                border: '1px solid var(--line)',
                background: config.bgColor,
                overflow: 'hidden',
              }}
            >
              {/* Background Art */}
              {activeDisplaySrc && (
                <img
                  src={activeDisplaySrc}
                  alt="Poster preview"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `rotate(${config.rotateDeg}deg)`,
                  }}
                />
              )}

              {/* Grid Lines and Sheet Labels */}
              {config.grid && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {cells.map((cell, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: cell.l,
                        top: cell.t,
                        width: cell.w,
                        height: cell.h,
                        border: '1px dashed rgba(21, 245, 186, 0.55)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        padding: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '10px',
                          color: '#fff',
                          background: 'rgba(0, 0, 0, 0.75)',
                          padding: '1px 5px',
                          borderRadius: 3,
                        }}
                      >
                        {cell.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Human Silhouette (1.80m mathematically proportional) */}
            {showHumanScale && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: humanHeightPx,
                  position: 'relative',
                }}
              >
                {/* 1.80m Mark line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: -20,
                    right: -20,
                    borderTop: '1px dashed rgba(255, 255, 255, 0.4)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '9px',
                      color: 'var(--fg-dim)',
                      background: 'rgba(0,0,0,0.8)',
                      padding: '1px 4px',
                      borderRadius: 3,
                      marginTop: -8,
                    }}
                  >
                    1,80 m
                  </span>
                </div>

                {/* SVG Silhouette */}
                <svg
                  width={humanHeightPx * 0.3}
                  height={humanHeightPx}
                  viewBox="0 0 100 300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ opacity: 0.65, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                >
                  {/* Head */}
                  <circle cx="50" cy="25" r="16" fill="var(--mint)" />
                  {/* Body / Torso */}
                  <path
                    d="M30 52 C30 46, 70 46, 70 52 L78 140 C78 145, 74 150, 68 150 L64 150 L66 285 C66 295, 54 295, 54 285 L52 180 L48 180 L46 285 C46 295, 34 295, 34 285 L36 150 L32 150 C26 150, 22 145, 22 140 Z"
                    fill="var(--mint)"
                  />
                  {/* Arms */}
                  <path d="M22 60 L14 140 C13 148, 20 152, 24 145 L30 85 Z" fill="var(--mint)" opacity="0.9" />
                  <path d="M78 60 L86 140 C87 148, 80 152, 76 145 L70 85 Z" fill="var(--mint)" opacity="0.9" />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    color: 'var(--fg-dim)',
                    marginTop: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Pessoa (1,80 m)
                </span>
              </div>
            )}
          </div>

          {/* Bottom Floating Dimension Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              display: 'flex',
              gap: 16,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(20, 26, 28, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--line)',
              fontSize: '11.5px',
              fontFamily: 'var(--mono)',
              color: 'var(--fg)',
            }}
          >
            <span>
              Dimensão Real: <strong style={{ color: 'var(--mint)' }}>{finalWidthCm} × {finalHeightCm} cm</strong>
            </span>
            <span>•</span>
            <span>
              Folhas: <strong>{totalPages} páginas ({cols}×{rows})</strong>
            </span>
            <span>•</span>
            <span>
              Papel: <strong>{config.paper}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
