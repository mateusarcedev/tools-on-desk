import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { TauriService } from '../../services/tauri';
import { MediaDownloadInfo } from '../../types/download';

interface DownloadsScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({ onShowToast }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'Vídeo' | 'Somente áudio'>('Vídeo');
  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('MP4');
  const [audioFormat, setAudioFormat] = useState('MP3');
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [targetFolder, setTargetFolder] = useState<string | null>(null);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaDownloadInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        onShowToast('Link colado da área de transferência');
        fetchInfo(text.trim());
      }
    } catch {
      onShowToast('Não foi possível acessar a área de transferência', 'warn');
    }
  };

  const fetchInfo = async (targetUrl: string) => {
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return;
    }
    setLoadingInfo(true);
    try {
      const info = await TauriService.fetchDownloadInfo(targetUrl);
      setMediaInfo(info);
      onShowToast(`Informações obtidas: ${info.title}`);
    } catch (err: any) {
      onShowToast(`Não foi possível obter metadados prévios: ${err}`, 'warn');
      setMediaInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSelectFolder = async () => {
    const folder = await TauriService.selectFolder('Selecionar pasta de destino');
    if (folder) {
      setTargetFolder(folder);
      onShowToast(`Pasta de destino: ${folder}`);
    }
  };

  const handleStartDownload = async () => {
    const urlsToDownload = batchMode
      ? batchUrls.split('\n').map((u) => u.trim()).filter((u) => u.length > 0)
      : [url.trim()].filter((u) => u.length > 0);

    if (urlsToDownload.length === 0) {
      onShowToast('Insira ao menos um link válido para baixar', 'warn');
      return;
    }

    setDownloading(true);
    try {
      for (const singleUrl of urlsToDownload) {
        await TauriService.startDownload({
          url: singleUrl,
          outputDir: targetFolder || undefined,
          audioOnly: mode === 'Somente áudio',
          audioFormat: mode === 'Somente áudio' ? audioFormat.toLowerCase() : undefined,
          quality: mode === 'Vídeo' ? resolution : undefined,
        });
      }

      onShowToast(
        `${urlsToDownload.length} download(s) iniciado(s)! Acompanhe o progresso no painel de tarefas (Ctrl+J).`
      );
    } catch (err: any) {
      onShowToast(`Erro ao iniciar download: ${err}`, 'err');
    } finally {
      setDownloading(false);
    }
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
          Baixe vídeos e áudios de fontes permitidas com o motor yt-dlp integrado ao TaskManager.
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchInfo(url.trim());
                }}
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
            <Button
              variant="secondary"
              onClick={() => fetchInfo(url.trim())}
              disabled={loadingInfo || !url.trim()}
            >
              {loadingInfo ? 'Consultando...' : 'Consultar'}
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

        {/* Media Preview Card */}
        {mediaInfo && (
          <div
            style={{
              display: 'flex',
              gap: 14,
              padding: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            {mediaInfo.thumbnailUrl ? (
              <img
                src={mediaInfo.thumbnailUrl}
                alt={mediaInfo.title}
                style={{ width: 90, height: 56, objectFit: 'cover', borderRadius: 6 }}
              />
            ) : (
              <div
                style={{
                  width: 90,
                  height: 56,
                  background: 'var(--bg)',
                  borderRadius: 6,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--fg-dim)',
                }}
              >
                <Icon name="video" size={24} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: 'var(--fg)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {mediaInfo.title}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 4 }}>
                {mediaInfo.uploader || 'Fonte autorizada'}
                {mediaInfo.durationSeconds
                  ? ` · ${Math.floor(mediaInfo.durationSeconds / 60)}:${Math.floor(mediaInfo.durationSeconds % 60) < 10 ? '0' : ''}${Math.floor(mediaInfo.durationSeconds % 60)}`
                  : ''}
              </div>
            </div>
          </div>
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
            </>
          )}

          <div>
            <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
              Destino do arquivo
            </label>
            <Button size="sm" variant="secondary" onClick={handleSelectFolder}>
              {targetFolder
                ? targetFolder.replace(/\\/g, '/').split('/').pop() || 'Pasta padrão'
                : 'Pasta de Downloads'}
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
          <Button
            variant="primary"
            onClick={handleStartDownload}
            disabled={downloading || (!url.trim() && !batchUrls.trim())}
          >
            {downloading ? 'Iniciando...' : 'Adicionar à fila de downloads'}
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
          <strong>Conformidade e motor nativo yt-dlp:</strong> O Arce Tools opera respeitando integralmente os direitos autorais e termos de serviço das plataformas. Não são implementados mecanismos de quebra de DRM ou remoção de proteções.
        </div>
      </div>
    </div>
  );
};
