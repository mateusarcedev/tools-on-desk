import React, { useState } from 'react';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';

interface AudioScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

const WAVE_BARS = Array.from({ length: 80 }, (_, i) =>
  Math.max(
    0.15,
    Math.min(
      1,
      Math.abs(
        Math.sin(i * 0.37) * 0.55 +
          Math.sin(i * 1.73) * 0.28 +
          Math.sin(i * 0.083) * 0.35 +
          Math.sin(i * 4.1) * 0.12
      )
    )
  )
);

export const AudioScreen: React.FC<AudioScreenProps> = ({ onShowToast }) => {
  const [files, setFiles] = useState<string[]>(['podcast_ep42.wav']);
  const [format, setFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState('320 kbps');
  const [channels, setChannels] = useState('Estéreo');
  const [normalize, setNormalize] = useState(false);
  const [trim, setTrim] = useState(false);

  const handleRun = () => {
    if (files.length === 0) {
      onShowToast('Adicione ao menos um arquivo de áudio', 'warn');
      return;
    }

    onShowToast(
      'Módulo de Áudio preparado! O motor FFmpeg 8.1 será conectado na Missão 02 para processamento local.',
      'warn'
    );
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px 48px',
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--mint)',
            marginBottom: 6,
          }}
        >
          04 · áudio
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
          Conversão e Edição de Áudio
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Converta, corte e ajuste arquivos de áudio em lote ou individualmente.
        </p>
      </div>

      <DropZone
        onFilesSelected={(fl) => {
          const names = Array.from(fl).map((f) => f.name);
          setFiles((prev) => [...prev, ...names]);
          onShowToast(`${names.length} áudio(s) adicionado(s)`);
        }}
        accept="audio/*"
        title="Arraste arquivos de áudio aqui"
        subtitle="Suporta MP3, WAV, FLAC, M4A, OGG, AAC e OPUS"
      />

      {/* Waveform visualizer */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--fg)' }}>
            Prévia de onda · {files[0] || 'Nenhum áudio selecionado'}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-faint)' }}>
            48 kHz · 24-bit
          </span>
        </div>

        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: 'var(--bg)',
            padding: '8px 12px',
            borderRadius: 8,
          }}
        >
          {WAVE_BARS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                background: i < 35 ? 'var(--mint)' : 'var(--line)',
                borderRadius: 2,
                transition: 'height 0.1s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Settings Grid */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
              Formato de saída
            </label>
            <SegmentedControl
              options={['MP3', 'WAV', 'FLAC', 'M4A', 'OGG']}
              value={format}
              onChange={setFormat}
              size="sm"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
              Taxa de bits
            </label>
            <SegmentedControl
              options={['320 kbps', '256 kbps', '192 kbps', '128 kbps']}
              value={bitrate}
              onChange={setBitrate}
              size="sm"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
              Canais de áudio
            </label>
            <SegmentedControl
              options={['Estéreo', 'Mono']}
              value={channels}
              onChange={setChannels}
              size="sm"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Switch
            label="Normalizar volume"
            desc="Equilibra o ganho para padrão de streaming (-14 LUFS)"
            checked={normalize}
            onChange={setNormalize}
          />

          <Switch
            label="Corte de trecho"
            desc="Corte início e fim com precisão de milissegundos"
            checked={trim}
            onChange={setTrim}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="primary" onClick={handleRun}>
            Converter {files.length} arquivo(s)
          </Button>
        </div>
      </div>
    </div>
  );
};
