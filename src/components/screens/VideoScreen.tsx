import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';
import { TauriService } from '../../services/tauri';
import { MediaInfo } from '../../types/audio';

interface VideoScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const VideoScreen: React.FC<VideoScreenProps> = ({ onShowToast }) => {
  const [activeTool, setActiveTool] = useState('convert');
  const [files, setFiles] = useState<string[]>([]);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  // Conversion options
  const [format, setFormat] = useState('MP4');
  const [codec, setCodec] = useState('H.264 (AVC)');
  const [resolution, setResolution] = useState('1080p');
  const [crf, setCrf] = useState(23);
  const [mute, setMute] = useState(false);

  // Compression options
  const [compressPreset, setCompressPreset] = useState('Equilibrado');

  // Extract Audio options
  const [audioFormat, setAudioFormat] = useState('MP3');
  const [audioBitrate, setAudioBitrate] = useState('320 kbps');

  // Trim options
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [fastTrim, setFastTrim] = useState(true);

  // Frame Extract options
  const [frameTimestamp, setFrameTimestamp] = useState(1.0);
  const [frameFormat, setFrameFormat] = useState('JPG');

  const [processing, setProcessing] = useState(false);

  const tools = [
    { id: 'convert', label: 'Converter' },
    { id: 'compress', label: 'Comprimir' },
    { id: 'extract', label: 'Extrair áudio' },
    { id: 'trim', label: 'Cortar trecho' },
    { id: 'frames', label: 'Extrair frame' },
  ];

  useEffect(() => {
    if (files.length > 0) {
      const primary = files[0];
      TauriService.probeMedia(primary)
        .then((info) => {
          setMediaInfo(info);
          if (info.durationSeconds > 0) {
            setTrimEnd(Math.min(30, Math.floor(info.durationSeconds)));
            setFrameTimestamp(Math.min(1.0, info.durationSeconds / 2));
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
      extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v'],
      title: 'Selecionar vídeos',
    });
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
      onShowToast(`${selected.length} vídeo(s) adicionado(s)`);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRun = async () => {
    if (files.length === 0) {
      onShowToast('Adicione ao menos um vídeo para processar', 'warn');
      return;
    }

    setProcessing(true);
    try {
      if (activeTool === 'convert') {
        const vCodec = codec.includes('H.265')
          ? 'h265'
          : codec.includes('VP9')
          ? 'vp9'
          : 'h264';

        for (const f of files) {
          await TauriService.startVideoConvert({
            inputPath: f,
            format: format.toLowerCase(),
            videoCodec: vCodec,
            resolution: resolution === 'Original' ? undefined : resolution,
            crf,
            muteAudio: mute,
          });
        }
        onShowToast(`${files.length} conversão(ões) de vídeo enfileirada(s)! (Ctrl+J)`);
      } else if (activeTool === 'compress') {
        const presetCode =
          compressPreset === 'Qualidade alta'
            ? 'high'
            : compressPreset === 'Arquivo menor'
            ? 'small'
            : 'balanced';

        for (const f of files) {
          await TauriService.startVideoCompress({
            inputPath: f,
            preset: presetCode,
            crf,
            targetResolution: resolution === 'Original' ? undefined : resolution,
          });
        }
        onShowToast(`${files.length} compressão(ões) de vídeo iniciada(s)! (Ctrl+J)`);
      } else if (activeTool === 'extract') {
        const brNum = parseInt(audioBitrate.split(' ')[0], 10) || 320;
        for (const f of files) {
          await TauriService.startVideoExtractAudio({
            inputPath: f,
            format: audioFormat.toLowerCase(),
            bitrateKbps: brNum,
          });
        }
        onShowToast(`Extração de áudio iniciada para ${files.length} vídeo(s)! (Ctrl+J)`);
      } else if (activeTool === 'trim') {
        await TauriService.startVideoTrim({
          inputPath: files[0],
          startSeconds: trimStart,
          endSeconds: trimEnd,
          fastCopy: fastTrim,
        });
        onShowToast(`Corte de vídeo enfileirado! (Ctrl+J)`);
      } else if (activeTool === 'frames') {
        await TauriService.startVideoExtractFrame({
          inputPath: files[0],
          timestampSeconds: frameTimestamp,
          format: frameFormat.toLowerCase(),
        });
        onShowToast(`Extração de frame iniciada! (Ctrl+J)`);
      }
    } catch (err: any) {
      onShowToast(`Erro ao iniciar processamento: ${err}`, 'err');
    } finally {
      setProcessing(false);
    }
  };

  const primaryName =
    files.length > 0
      ? files[0].replace(/\\/g, '/').split('/').pop() || files[0]
      : 'Nenhum vídeo carregado';

  const vStream = mediaInfo?.videoStreams?.[0];

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
            Limpar lista ({files.length})
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
            const names = Array.from(fl).map((f) => (f as any).path || f.name);
            setFiles((prev) => [...prev, ...names]);
            onShowToast(`${names.length} vídeo(s) adicionado(s)`);
          }}
          accept="video/*"
          title="Arraste vídeos aqui para converter ou comprimir"
          subtitle="Suporta MP4, MOV, MKV, WEBM, AVI e M4V"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
          <Button size="sm" variant="ghost" onClick={handleSelectFiles}>
            Selecionar arquivos do disco...
          </Button>
        </div>

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
              {primaryName}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-faint)' }}>
              {mediaInfo && vStream
                ? `${vStream.width}×${vStream.height} · ${Math.round(vStream.fps)} fps · ${vStream.codecName.toUpperCase()} · ${formatDuration(mediaInfo.durationSeconds)}`
                : 'Nenhum vídeo analisado'}
            </span>
          </div>

          <div
            style={{
              height: 180,
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
          {activeTool === 'convert' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                    Contêiner de saída
                  </label>
                  <SegmentedControl
                    options={['MP4', 'MKV', 'WEBM']}
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
                    options={['H.264 (AVC)', 'H.265 (HEVC)', 'VP9']}
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
                  <span style={{ color: 'var(--fg-dim)' }}>Fator de taxa constante (CRF)</span>
                  <strong style={{ color: 'var(--fg)' }}>{crf} (recomendado: 20–28)</strong>
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
            </>
          )}

          {activeTool === 'compress' && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Preset de compressão
                </label>
                <SegmentedControl
                  options={['Qualidade alta', 'Equilibrado', 'Arquivo menor']}
                  value={compressPreset}
                  onChange={setCompressPreset}
                  size="sm"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Redimensionamento opcional
                </label>
                <SegmentedControl
                  options={['Original', '1080p', '720p', '480p']}
                  value={resolution}
                  onChange={setResolution}
                  size="sm"
                />
              </div>
            </>
          )}

          {activeTool === 'extract' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Formato de áudio extraído
                </label>
                <SegmentedControl
                  options={['MP3', 'WAV', 'AAC', 'FLAC']}
                  value={audioFormat}
                  onChange={setAudioFormat}
                  size="sm"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Taxa de bits
                </label>
                <SegmentedControl
                  options={['320 kbps', '256 kbps', '192 kbps', '128 kbps']}
                  value={audioBitrate}
                  onChange={setAudioBitrate}
                  size="sm"
                />
              </div>
            </div>
          )}

          {activeTool === 'trim' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                    Ponto inicial (segundos)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
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

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                    Ponto final (segundos)
                  </label>
                  <input
                    type="number"
                    min={trimStart + 0.1}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value) || (trimStart + 1))}
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

              <Switch
                label="Corte rápido sem recodificação (-c copy)"
                desc="Instantâneo, alinhado aos keyframes mais próximos. Desative para precisão absoluta quadro a quadro."
                checked={fastTrim}
                onChange={setFastTrim}
              />
            </div>
          )}

          {activeTool === 'frames' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--fg-dim)', display: 'block', marginBottom: 4 }}>
                  Tempo do frame (segundos)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={frameTimestamp}
                  onChange={(e) => setFrameTimestamp(parseFloat(e.target.value) || 0)}
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

              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Formato de saída da imagem
                </label>
                <SegmentedControl
                  options={['JPG', 'PNG']}
                  value={frameFormat}
                  onChange={setFrameFormat}
                  size="sm"
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" onClick={handleRun} disabled={processing || files.length === 0}>
              {processing ? 'Enfileirando...' : `Processar ${tools.find((t) => t.id === activeTool)?.label || 'Vídeo'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
