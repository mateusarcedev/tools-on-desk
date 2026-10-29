import React, { useState } from 'react';
import { ImageEditOptions, ImageEditResult } from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface ImageEditorModalProps {
  imagePath: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  onClose: () => void;
  onSaved: (result: ImageEditResult) => void;
  onShowToast?: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  imagePath,
  imageWidth = 1024,
  imageHeight = 1024,
  onClose,
  onSaved,
  onShowToast,
}) => {
  const [rotateDeg, setRotateDeg] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [cropPreset, setCropPreset] = useState<string>('free'); // 'free', '1:1', '16:9', '9:16'
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Resize controls
  const [customWidth, setCustomWidth] = useState<number>(imageWidth || 1024);
  const [customHeight, setCustomHeight] = useState<number>(imageHeight || 1024);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  const handleWidthChange = (w: number) => {
    setCustomWidth(w);
    if (lockAspect && imageWidth && imageHeight) {
      setCustomHeight(Math.round((w * imageHeight) / imageWidth));
    }
  };

  const handleHeightChange = (h: number) => {
    setCustomHeight(h);
    if (lockAspect && imageWidth && imageHeight) {
      setCustomWidth(Math.round((h * imageWidth) / imageHeight));
    }
  };

  const handleRotate = () => {
    setRotateDeg((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setRotateDeg(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setCropPreset('free');
    setCustomWidth(imageWidth || 1024);
    setCustomHeight(imageHeight || 1024);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      // Calculate crop if preset is selected
      let cropArea = undefined;
      const baseW = imageWidth || 1024;
      const baseH = imageHeight || 1024;

      if (cropPreset === '1:1') {
        const side = Math.min(baseW, baseH);
        cropArea = {
          x: Math.round((baseW - side) / 2),
          y: Math.round((baseH - side) / 2),
          width: side,
          height: side,
        };
      } else if (cropPreset === '16:9') {
        let w = baseW;
        let h = Math.round((baseW * 9) / 16);
        if (h > baseH) {
          h = baseH;
          w = Math.round((baseH * 16) / 9);
        }
        cropArea = {
          x: Math.round((baseW - w) / 2),
          y: Math.round((baseH - h) / 2),
          width: w,
          height: h,
        };
      } else if (cropPreset === '9:16') {
        let h = baseH;
        let w = Math.round((baseH * 9) / 16);
        if (w > baseW) {
          w = baseW;
          h = Math.round((baseW * 16) / 9);
        }
        cropArea = {
          x: Math.round((baseW - w) / 2),
          y: Math.round((baseH - h) / 2),
          width: w,
          height: h,
        };
      }

      const options: ImageEditOptions = {
        input_path: imagePath,
        crop: cropArea,
        rotate_deg: rotateDeg !== 0 ? rotateDeg : undefined,
        flip_h: flipH ? true : undefined,
        flip_v: flipV ? true : undefined,
        brightness: brightness !== 0 ? brightness : undefined,
        contrast: contrast !== 0 ? contrast : undefined,
        saturation: saturation !== 0 ? saturation : undefined,
        resize_width: customWidth !== baseW ? customWidth : undefined,
        resize_height: customHeight !== baseH ? customHeight : undefined,
        format,
      };

      const result = await TauriService.editImageAsset(options);
      onShowToast?.('Imagem editada e salva com sucesso!', 'ok');
      onSaved(result);
    } catch (err: any) {
      console.error('Falha ao editar imagem:', err);
      onShowToast?.(`Falha ao editar imagem: ${err?.message || err}`, 'err');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview CSS filter
  const filterStyle = `
    brightness(${1 + brightness / 100})
    contrast(${1 + contrast / 100})
    saturate(${1 + saturation / 100})
  `.trim();

  const transformStyle = `
    rotate(${rotateDeg}deg)
    scaleX(${flipH ? -1 : 1})
    scaleY(${flipV ? -1 : 1})
  `.trim();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 980,
          maxHeight: '90vh',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>
              Editor Nativo de Imagem
            </h3>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
              {imagePath.split('/').pop()} · Original: {imageWidth}x{imageHeight}px
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body: Canvas Preview + Controls Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, minHeight: 0 }}>
          {/* Canvas Preview Area */}
          <div
            style={{
              backgroundColor: '#050708',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={`file://${imagePath}`}
                alt="Edição"
                style={{
                  maxWidth: '100%',
                  maxHeight: '520px',
                  objectFit: 'contain',
                  filter: filterStyle,
                  transform: transformStyle,
                  transition: 'transform 150ms ease, filter 150ms ease',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </div>

            {cropPreset !== 'free' && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  backgroundColor: 'rgba(21, 245, 186, 0.15)',
                  border: '1px solid var(--mint)',
                  color: 'var(--mint)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--mono, monospace)',
                }}
              >
                Corte Ativo: {cropPreset}
              </div>
            )}
          </div>

          {/* Controls Sidebar */}
          <div
            style={{
              borderLeft: '1px solid var(--line)',
              backgroundColor: 'var(--surface-2, #141A1C)',
              padding: 20,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Transform Controls */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
                Orientação & Corte
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <Button size="sm" variant="secondary" onClick={handleRotate} style={{ flex: 1 }}>
                  <Icon name="refresh" size={13} /> Girar 90°
                </Button>
                <Button
                  size="sm"
                  variant={flipH ? 'primary' : 'secondary'}
                  onClick={() => setFlipH(!flipH)}
                  style={{ flex: 1 }}
                >
                  Espelhar H
                </Button>
                <Button
                  size="sm"
                  variant={flipV ? 'primary' : 'secondary'}
                  onClick={() => setFlipV(!flipV)}
                  style={{ flex: 1 }}
                >
                  Espelhar V
                </Button>
              </div>

              {/* Crop Ratio Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {['free', '1:1', '16:9', '9:16'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCropPreset(preset)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 4,
                      fontSize: 11,
                      textAlign: 'center',
                      border: cropPreset === preset ? '1px solid var(--mint)' : '1px solid var(--line)',
                      backgroundColor: cropPreset === preset ? 'rgba(21, 245, 186, 0.1)' : 'var(--bg)',
                      color: cropPreset === preset ? 'var(--mint)' : 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset === 'free' ? 'Sem Corte' : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustments: Brightness, Contrast, Saturation */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>
                Ajustes de Cor & Luz
              </div>

              {/* Brightness */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
                  <span>Brilho</span>
                  <span style={{ fontFamily: 'var(--mono, monospace)' }}>{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--mint)' }}
                />
              </div>

              {/* Contrast */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
                  <span>Contraste</span>
                  <span style={{ fontFamily: 'var(--mono, monospace)' }}>{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--mint)' }}
                />
              </div>

              {/* Saturation */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
                  <span>Saturação</span>
                  <span style={{ fontFamily: 'var(--mono, monospace)' }}>{saturation > 0 ? `+${saturation}` : saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--mint)' }}
                />
              </div>
            </div>

            {/* Resize & Output Format */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
                Dimensões & Formato
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--muted)' }}>Largura (px)</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      color: 'var(--fg)',
                      fontSize: 12,
                      fontFamily: 'var(--mono, monospace)',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLockAspect(!lockAspect)}
                  title={lockAspect ? 'Proporção bloqueada' : 'Proporção livre'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: lockAspect ? 'var(--mint)' : 'var(--muted)',
                    cursor: 'pointer',
                    marginTop: 14,
                  }}
                >
                  <Icon name={lockAspect ? 'lock' : 'unlock'} size={14} />
                </button>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--muted)' }}>Altura (px)</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      color: 'var(--fg)',
                      fontSize: 12,
                      fontFamily: 'var(--mono, monospace)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {(['png', 'jpeg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      fontFamily: 'var(--mono, monospace)',
                      border: format === fmt ? '1px solid var(--mint)' : '1px solid var(--line)',
                      backgroundColor: format === fmt ? 'rgba(21, 245, 186, 0.1)' : 'var(--bg)',
                      color: format === fmt ? 'var(--mint)' : 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={isProcessing}>
                Redefinir Ajustes
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                disabled={isProcessing}
                style={{ width: '100%' }}
              >
                {isProcessing ? 'Processando Edição...' : 'Salvar como Nova Versão'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
