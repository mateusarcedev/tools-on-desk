import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';

interface VideoScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const VideoScreen: React.FC<VideoScreenProps> = ({ onShowToast }) => {
  const [activeTool, setActiveTool] = useState('convert');
  const [files, setFiles] = useState<string[]>(['ferias_praia.mov']);
  const [format, setFormat] = useState('MP4');
  const [codec, setCodec] = useState('H.265 (HEVC)');
  const [resolution, setResolution] = useState('1080p');
  const [crf, setCrf] = useState(24);
  const [mute, setMute] = useState(false);

  const tools = [
    { id: 'convert', label: 'Converter' },
    { id: 'compress', label: 'Comprimir' },
    { id: 'extract', label: 'Extrair áudio' },
    { id: 'trim', label: 'Cortar trecho' },
    { id: 'frames', label: 'Extrair frames' },
  ];

  const handleRun = () => {
    if (files.length === 0) {
      onShowToast('Adicione ao menos um vídeo para processar', 'warn');
      return;
    }

    onShowToast(
      'Módulo de Vídeo preparado! O motor FFmpeg com aceleração de hardware será conectado na Missão 02.',
      'warn'
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-soft)',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {tools.map((t) => {
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 7,
                  border: isSelected ? '1px solid var(--mint-edge)' : '1px solid transparent',
                  background: isSelected ? 'var(--mint-dim)' : 'transparent',
                  color: isSelected ? 'var(--mint)' : 'var(--fg-dim)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {files.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setFiles([])}>
            Limpar lista
          </Button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <DropZone
          onFilesSelected={(fl) => {
            const names = Array.from(fl).map((f) => f.name);
            setFiles((prev) => [...prev, ...names]);
            onShowToast(`${names.length} vídeo(s) adicionado(s)`);
          }}
          accept="video/*"
          title="Arraste vídeos aqui para converter ou comprimir"
          subtitle="Suporta MP4, MOV, MKV, WEBM, AVI e M4V"
        />

        {/* Video Preview Frame */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
              {files[0] || 'Nenhum vídeo carregado'}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-faint)' }}>
              3840×2160 · 60 fps · H.264
            </span>
          </div>

          <div
            style={{
              height: 200,
              background: '#0a0a0a',
              borderRadius: 8,
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--fg-dim)',
            }}
          >
            <Icon name="video" size={36} style={{ opacity: 0.4 }} />
          </div>
        </div>

        {/* Settings Box */}
        <div
          style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Contêiner
              </label>
              <SegmentedControl
                options={['MP4', 'MKV', 'WEBM', 'GIF']}
                value={format}
                onChange={setFormat}
                size="sm"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Codec de vídeo
              </label>
              <SegmentedControl
                options={['H.265 (HEVC)', 'H.264 (AVC)', 'AV1']}
                value={codec}
                onChange={setCodec}
                size="sm"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Resolução
              </label>
              <SegmentedControl
                options={['Original', '1080p', '720p', '480p']}
                value={resolution}
                onChange={setResolution}
                size="sm"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Qualidade constante (CRF)</span>
              <strong style={{ color: 'var(--fg)' }}>{crf} (recomendado: 23–28)</strong>
            </div>
            <input
              type="range"
              min={16}
              max={36}
              value={crf}
              onChange={(e) => setCrf(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--mint)' }}
            />
          </div>

          <Switch
            label="Remover faixa de áudio (Mudo)"
            checked={mute}
            onChange={setMute}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" onClick={handleRun}>
              Processar {files.length} vídeo(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
