import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';

interface DownloadsScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({ onShowToast }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'Vídeo' | 'Somente áudio'>('Vídeo');
  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('MP4');
  const [audioFormat, setAudioFormat] = useState('MP3');
  const [audioBitrate, setAudioBitrate] = useState('320 kbps');
  const [includeSubs, setIncludeSubs] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        onShowToast('Link colado da área de transferência');
      }
    } catch {
      onShowToast('Não foi possível acessar a área de transferência', 'warn');
    }
  };

  const handleStartDownload = () => {
    if (!url.trim() && !batchUrls.trim()) {
      onShowToast('Insira ao menos um link para baixar', 'warn');
      return;
    }

    onShowToast(
      'Módulo preparado! O motor yt-dlp será conectado na Missão 02 com verificação de direitos autorais.',
      'warn'
    );
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 32px 48px',
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
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
          02 · downloads
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            margin: '0 0 6px',
          }}
        >
          Downloads de Mídia
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Baixe vídeos e áudios de fontes permitidas, um por vez, em lote ou playlists inteiras.
        </p>
      </div>

      {/* Input Box */}
      <div
        style={{
          background: 'var(--bg-soft)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SegmentedControl
            options={['Vídeo', 'Somente áudio']}
            value={mode}
            onChange={(val) => setMode(val as any)}
          />

          <Switch
            label="Download em lote"
            checked={batchMode}
            onChange={setBatchMode}
          />
        </div>

        {!batchMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 42,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 10,
              }}
            >
              <Icon name="link" size={17} style={{ color: 'var(--fg-dim)' }} />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Cole um link do YouTube, Vimeo ou plataforma permitida..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--fg)',
                  fontSize: '13.5px',
                }}
              />
            </div>

            <Button variant="secondary" onClick={handlePaste}>
              Colar
            </Button>
          </div>
        ) : (
          <textarea
            rows={4}
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            placeholder="Cole os links aqui, um por linha..."
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--fg)',
              fontFamily: 'var(--sans)',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        )}

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {mode === 'Vídeo' ? (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Qualidade máxima
                </label>
                <SegmentedControl
                  options={['1080p', '720p', '480p']}
                  value={resolution}
                  onChange={setResolution}
                  size="sm"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Formato de contêiner
                </label>
                <SegmentedControl
                  options={['MP4', 'MKV']}
                  value={format}
                  onChange={setFormat}
                  size="sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Formato de áudio
                </label>
                <SegmentedControl
                  options={['MP3', 'M4A', 'FLAC']}
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
                  options={['320 kbps', '256 kbps', '128 kbps']}
                  value={audioBitrate}
                  onChange={setAudioBitrate}
                  size="sm"
                />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Switch
            label="Baixar legendas disponíveis"
            checked={includeSubs}
            onChange={setIncludeSubs}
          />

          <Button variant="primary" onClick={handleStartDownload}>
            Adicionar à fila de downloads
          </Button>
        </div>
      </div>

      {/* Contract & Status Note */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          gap: 12,
        }}
      >
        <Icon name="alert" size={18} style={{ color: 'var(--mint)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '12px', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
          <strong>Política de conformidade e motor:</strong> Este módulo utilizará o binário estruturado{' '}
          <code>yt-dlp</code> gerenciado localmente sem bypass de DRM e respeitando estritamente os direitos autorais.
          Os parâmetros estruturados e isolamento de processo já estão definidos na arquitetura backend.
        </div>
      </div>
    </div>
  );
};
