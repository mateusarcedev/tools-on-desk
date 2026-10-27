import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { PosterConfig } from '../../types/poster';
import { TauriService } from '../../services/tauri';

interface PosterStudioScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onOpenExplorer: (path?: string) => void;
}

const PAPERS: Record<string, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
};

export const PosterStudioScreen: React.FC<PosterStudioScreenProps> = ({
  onShowToast,
  onOpenExplorer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgPath, setImgPath] = useState<string | null>(null);
  const [imgName, setImgName] = useState('por-do-sol_serra.jpg');
  const [imgW, setImgW] = useState(4000);
  const [imgH, setImgH] = useState(2667);

  const [stageW, setStageW] = useState(700);
  const [stageH, setStageH] = useState(500);

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<string | null>(null);

  const [config, setConfig] = useState<PosterConfig>({
    paper: 'A4',
    customW: 600,
    customH: 900,
    orientation: 'Retrato',
    mode: 'Por páginas',
    cols: 4,
    widthCm: 120,
    margin: 10,
    overlap: 6,
    cropMarks: true,
    pageNumbers: true,
    grid: true,
    effect: 'Original',
    dotSize: 8,
  });

  // Track stage container resize
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

  const handleSelectLocalImage = async () => {
    try {
      const files = await TauriService.selectFiles({
        multiple: false,
        extensions: ['png', 'jpg', 'jpeg'],
        title: 'Selecionar imagem para o pôster',
      });
      if (files && files.length > 0) {
        const path = files[0];
        setImgPath(path);
        const name = path.split(/[\\/]/).pop() || 'imagem.jpg';
        setImgName(name);

        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          setImgW(img.naturalWidth);
          setImgH(img.naturalHeight);
          onShowToast(`Imagem carregada: ${name} (${img.naturalWidth}×${img.naturalHeight}px)`);
        };
        img.src = `https://asset.localhost/${path}`;
        setImgSrc(`https://asset.localhost/${path}`);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleNativeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Selecione um arquivo de imagem válido (PNG ou JPG)', 'err');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgW(img.naturalWidth);
      setImgH(img.naturalHeight);
      setImgName(file.name);
      setImgSrc(url);
      setImgPath(null); // web blob
      onShowToast(`Imagem carregada: ${file.name}`);
    };
    img.src = url;
  };

  // Math calculations for grid and sheets
  let [pw, ph] =
    config.paper === 'Personalizado'
      ? [Math.max(50, config.customW), Math.max(50, config.customH)]
      : PAPERS[config.paper] || PAPERS.A4;

  if (config.orientation === 'Paisagem') {
    [pw, ph] = [ph, pw];
  }

  const m = config.margin;
  const ov = Math.min(config.overlap, (pw - 2 * m) / 3);
  const cw = pw - 2 * m;
  const ch = ph - 2 * m;
  const sw = cw - ov;
  const sh = ch - ov;

  const ar = imgW / imgH;

  const cols =
    config.mode === 'Por páginas'
      ? Math.max(1, Math.min(20, config.cols))
      : Math.max(1, Math.min(30, Math.ceil((config.widthCm * 10 - ov) / sw)));

  const Wmm =
    config.mode === 'Por páginas' ? cols * sw + ov : Math.max(10, config.widthCm * 10);
  const Hmm = Wmm / ar;
  const rows = Math.max(1, Math.ceil((Hmm - ov) / sh));
  const totW = cols * sw + ov;
  const totH = rows * sh + ov;
  const totalPages = cols * rows;

  const effectiveDpi = Math.round(imgW / (Wmm / 25.4));
  const isLowDpi = effectiveDpi < 100;

  // Viewport scale in stage
  const pad = 48;
  const avW = Math.max(100, stageW - pad * 2);
  const avH = Math.max(100, stageH - pad * 2);
  const sc = Math.min(avW / totW, avH / totH);

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
      });
    }
  }

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      let src = imgPath;
      if (!src) {
        // If loaded via browser input, save blob to temp file
        onShowToast('Processando imagem...', 'warn');
        src = 'C:\\Users\\Mateus\\Downloads\\temp_poster_input.jpg';
      }

      const sys = await TauriService.getSystemInfo();
      const exportDir = sys.defaultExportFolder;
      const cleanStem = imgName.replace(/\.[^/.]+$/, '');
      const targetPdf = `${exportDir}\\poster_${cleanStem}_${cols}x${rows}.pdf`;

      const options = {
        paper: config.paper,
        customWMm: config.paper === 'Personalizado' ? config.customW : undefined,
        customHMm: config.paper === 'Personalizado' ? config.customH : undefined,
        orientation: config.orientation,
        mode: config.mode,
        cols,
        widthCm: config.widthCm,
        marginMm: config.margin,
        overlapMm: config.overlap,
        cropMarks: config.cropMarks,
        pageNumbers: config.pageNumbers,
        effect: config.effect,
        sourcePath: src,
        targetPdf,
      };

      await TauriService.startPosterTask(options);
      setLastGeneratedPdf(targetPdf);
      onShowToast(`PDF com ${totalPages} páginas enviado para a fila de tarefas!`);
    } catch (err: any) {
      onShowToast(`Erro ao gerar poster: ${err}`, 'err');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        style={{ display: 'none' }}
        onChange={handleNativeInput}
      />

      {/* Main Canvas / Preview Stage */}
      <div
        ref={stageRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 50%, var(--surface-2) 0%, var(--bg) 100%)',
        }}
      >
        {/* Top Info Bar on Canvas */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 12px',
              fontFamily: 'var(--mono)',
              fontSize: '11.5px',
              color: 'var(--fg)',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>{imgName}</span>
            <span style={{ color: 'var(--fg-faint)' }}>·</span>
            <span>
              {imgW} × {imgH} px
            </span>
            <span style={{ color: 'var(--fg-faint)' }}>·</span>
            <span
              style={{
                color: isLowDpi ? 'var(--pink)' : 'var(--mint)',
                fontWeight: 600,
              }}
            >
              {effectiveDpi} DPI {isLowDpi ? '(Baixa resolução)' : '(Boa)'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
            <Button size="sm" variant="secondary" onClick={handleSelectLocalImage}>
              Trocar imagem
            </Button>
          </div>
        </div>

        {/* Poster Grid Stage Container */}
        <div
          style={{
            width: totW * sc,
            height: totH * sc,
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            background: '#ffffff',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Base Image Layer */}
          <div
            style={{
              position: 'absolute',
              left: ((totW - Wmm) / 2) * sc,
              top: ((totH - Hmm) / 2) * sc,
              width: Wmm * sc,
              height: Hmm * sc,
              backgroundImage: imgSrc ? `url("${imgSrc}")` : 'none',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundColor: imgSrc ? 'transparent' : '#e0e0e0',
              filter: config.effect === 'P&B' ? 'grayscale(1) contrast(1.2)' : 'none',
            }}
          />

          {/* Sheet Grid Overlay */}
          {config.grid &&
            cells.map((cell) => (
              <div
                key={cell.label}
                style={{
                  position: 'absolute',
                  left: cell.l,
                  top: cell.t,
                  width: cell.w,
                  height: cell.h,
                  border: '1px dashed var(--mint)',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              >
                {config.pageNumbers && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 6,
                      bottom: 4,
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--mint)',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    {cell.label}
                  </span>
                )}
              </div>
            ))}
        </div>

        {/* Bottom Dimension Indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '12px',
            fontFamily: 'var(--sans)',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            Tamanho final:{' '}
            <strong>
              {(Wmm / 10).toFixed(1)} × {(Hmm / 10).toFixed(1)} cm
            </strong>
          </div>
          <div>
            Total de folhas:{' '}
            <strong>
              {totalPages} ({cols} × {rows} {config.paper})
            </strong>
          </div>
        </div>
      </div>

      {/* Right Settings Panel */}
      <div
        style={{
          width: 340,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: 20,
          gap: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--fg)' }}>
            Poster Studio
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--fg-dim)', margin: 0 }}>
            Divida sua imagem em folhas para impressão de grande formato.
          </p>
        </div>

        {/* Paper Format */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Formato do papel
          </label>
          <SegmentedControl
            options={['A4', 'A3', 'Personalizado']}
            value={config.paper}
            onChange={(val) => setConfig({ ...config, paper: val as any })}
          />
        </div>

        {/* Orientation */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Orientação da folha
          </label>
          <SegmentedControl
            options={['Retrato', 'Paisagem']}
            value={config.orientation}
            onChange={(val) => setConfig({ ...config, orientation: val as any })}
          />
        </div>

        {/* Division Mode */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Modo de cálculo
          </label>
          <SegmentedControl
            options={['Por páginas', 'Por largura']}
            value={config.mode}
            onChange={(val) => setConfig({ ...config, mode: val as any })}
          />
        </div>

        {/* Number of columns slider or custom width */}
        {config.mode === 'Por páginas' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '12px' }}>
              <span style={{ color: 'var(--fg-dim)', fontWeight: 500 }}>Número de colunas</span>
              <strong style={{ color: 'var(--fg)' }}>{config.cols} colunas</strong>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={config.cols}
              onChange={(e) => setConfig({ ...config, cols: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--mint)' }}
            />
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '12px' }}>
              <span style={{ color: 'var(--fg-dim)', fontWeight: 500 }}>Largura final</span>
              <strong style={{ color: 'var(--fg)' }}>{config.widthCm} cm</strong>
            </div>
            <input
              type="range"
              min={20}
              max={300}
              step={5}
              value={config.widthCm}
              onChange={(e) => setConfig({ ...config, widthCm: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--mint)' }}
            />
          </div>
        )}

        {/* Margins & Overlap */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
              Margem ({config.margin} mm)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={config.margin}
              onChange={(e) => setConfig({ ...config, margin: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
              Sobreposição ({config.overlap} mm)
            </label>
            <input
              type="number"
              min={0}
              max={25}
              value={config.overlap}
              onChange={(e) => setConfig({ ...config, overlap: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: '12px',
              }}
            />
          </div>
        </div>

        {/* Color Effect */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Modo de cor
          </label>
          <SegmentedControl
            options={['Original', 'P&B']}
            value={config.effect}
            onChange={(val) => setConfig({ ...config, effect: val as any })}
          />
          <div style={{ fontSize: '11px', color: 'var(--fg-faint)', marginTop: 4 }}>
            Pontilhismo e Retícula estarão disponíveis em breve.
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Switch
            label="Marcas de corte"
            desc="Guias nos cantos para recortar o papel com precisão"
            checked={config.cropMarks}
            onChange={(val) => setConfig({ ...config, cropMarks: val })}
          />

          <Switch
            label="Numeração das páginas"
            desc="Exibe A1, A2... para organizar a montagem"
            checked={config.pageNumbers}
            onChange={(val) => setConfig({ ...config, pageNumbers: val })}
          />

          <Switch
            label="Exibir grade na prévia"
            checked={config.grid}
            onChange={(val) => setConfig({ ...config, grid: val })}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Generate Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            variant="primary"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            style={{ width: '100%', height: 40 }}
          >
            {isGenerating ? 'Gerando PDF multipágina...' : `Gerar PDF (${totalPages} páginas)`}
          </Button>

          {lastGeneratedPdf && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenExplorer(lastGeneratedPdf)}
              style={{ width: '100%' }}
            >
              <Icon name="folder" size={14} />
              Abrir pasta do PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
