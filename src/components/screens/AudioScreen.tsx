import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';
import { TauriService } from '../../services/tauri';
import { MediaInfo } from '../../types/audio';

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
  const [files, setFiles] = useState<string[]>([]);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [format, setFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState('320 kbps');
  const [channels, setChannels] = useState('Estéreo');
  const [normalize, setNormalize] = useState(false);
  const [trim, setTrim] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(10);
  const [processing, setProcessing] = useState(false);

  // Probe media whenever primary file changes
  useEffect(() => {
    if (files.length > 0) {
      const primary = files[0];
      TauriService.probeMedia(primary)
        .then((info) => {
          setMediaInfo(info);
          if (info.durationSeconds > 0) {
            setEndSeconds(Math.min(30, Math.floor(info.durationSeconds)));
          }
        })
        .catch(() => {
          setMediaInfo(null);
        });
    } else {
      setMediaInfo(null);
    }
  }, [files]);

  const handleSelectFiles = async () => {
    const selected = await TauriService.selectFiles({
      multiple: true,
      extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'opus', 'aac', 'wma'],
      title: 'Selecionar arquivos de áudio',
    });
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
      onShowToast(`${selected.length} áudio(s) adicionado(s)`);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRun = async () => {
    if (files.length === 0) {
      onShowToast('Adicione ao menos um arquivo de áudio', 'warn');
      return;
    }

    setProcessing(true);
    try {
      const bitNum = parseInt(bitrate.split(' ')[0], 10) || 320;
      const chanNum = channels === 'Mono' ? 1 : 2;

      if (trim) {
        await TauriService.startAudioTrim({
          inputPath: files[0],
          startSeconds,
          endSeconds,
          format: format.toLowerCase(),
        });
        onShowToast(`Corte de áudio enfileirado! (Ctrl+J para acompanhar)`);
      } else {
        for (const f of files) {
          await TauriService.startAudioConvert({
            inputPath: f,
            format: format.toLowerCase(),
            bitrateKbps: bitNum,
            channels: chanNum,
            sampleRate: 44100,
            normalizeVolume: normalize,
          });
        }
        onShowToast(`${files.length} conversão(ões) de áudio iniciada(s)! (Ctrl+J)`);
      }
    } catch (err: any) {
      onShowToast(`Erro ao iniciar processamento: ${err}`, 'err');
    } finally {
      setProcessing(false);
    }
  };

  const primaryName = files.length > 0
    ? files[0].replace(/\\/g, '/').split('/').pop() || files[0]
    : 'Nenhum áudio selecionado';

  const audioStream = mediaInfo?.audioStreams?.[0];

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
          Converta, corte e ajuste arquivos de áudio em lote ou individualmente com FFmpeg 8.1.
        </p>
      </div>

      <DropZone
        onFilesSelected={(fl) => {
          const names = Array.from(fl).map((f) => (f as any).path || f.name);
          setFiles((prev) => [...prev, ...names]);
          onShowToast(`${names.length} áudio(s) adicionado(s)`);
        }}
        accept="audio/*"
        title="Arraste arquivos de áudio aqui"
        subtitle="Suporta MP3, WAV, FLAC, M4A, OGG, AAC e OPUS"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
        <Button size="sm" variant="ghost" onClick={handleSelectFiles}>
          Selecionar arquivos do disco...
        </Button>
        {files.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setFiles([])}>
            Limpar lista ({files.length})
          </Button>
        )}
      </div>

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
            Prévia de onda · {primaryName}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-faint)' }}>
            {mediaInfo
              ? `${formatDuration(mediaInfo.durationSeconds)} · ${audioStream?.sampleRate || 44100} Hz · ${audioStream?.channels === 1 ? 'Mono' : 'Estéreo'}`
              : 'Nenhum áudio analisado'}
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
                background: files.length > 0 && i < 35 ? 'var(--mint)' : 'var(--line)',
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

        {trim && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              background: 'var(--bg)',
              padding: 14,
              borderRadius: 8,
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                Início (segundos)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={startSeconds}
                onChange={(e) => setStartSeconds(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                Fim (segundos)
              </label>
              <input
                type="number"
                min={startSeconds + 0.1}
                step={0.1}
                value={endSeconds}
                onChange={(e) => setEndSeconds(parseFloat(e.target.value) || (startSeconds + 1))}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="primary" onClick={handleRun} disabled={processing || files.length === 0}>
            {processing
              ? 'Enfileirando...'
              : trim
              ? 'Cortar áudio selecionado'
              : `Converter ${files.length} arquivo(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
};
