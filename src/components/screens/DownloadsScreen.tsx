import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { TauriService } from '../../services/tauri';
import { MediaDownloadInfo, YtDlpStatus } from '../../types/download';

interface DownloadsScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: '#ff3333' },
  { id: 'shorts', name: 'Shorts', color: '#ff0000' },
  { id: 'instagram', name: 'Instagram', color: '#e1306c' },
  { id: 'reels', name: 'Reels', color: '#fd1d1d' },
  { id: 'tiktok', name: 'TikTok', color: '#00f2fe' },
  { id: 'facebook', name: 'Facebook', color: '#1877f2' },
  { id: 'twitter', name: 'X / Twitter', color: '#1da1f2' },
  { id: 'reddit', name: 'Reddit', color: '#ff4500' },
  { id: 'pinterest', name: 'Pinterest', color: '#e60023' },
  { id: 'vimeo', name: 'Vimeo', color: '#1ab7ea' },
  { id: 'twitch', name: 'Twitch', color: '#9146ff' },
  { id: 'soundcloud', name: 'SoundCloud', color: '#ff5500' },
  { id: 'dailymotion', name: 'Dailymotion', color: '#0066dc' },
];

function detectPlatformQuick(rawUrl: string): { id: string; name: string; color: string } | null {
  const lower = rawUrl.toLowerCase().trim();
  if (!lower) return null;
  if (lower.includes('youtube.com/shorts') || lower.includes('youtu.be/shorts')) {
    return { id: 'shorts', name: 'YouTube Shorts', color: '#ff0000' };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { id: 'youtube', name: 'YouTube', color: '#ff3333' };
  }
  if (lower.includes('instagram.com/reel') || lower.includes('instagram.com/reels')) {
    return { id: 'reels', name: 'Instagram Reels', color: '#fd1d1d' };
  }
  if (lower.includes('instagram.com')) {
    return { id: 'instagram', name: 'Instagram', color: '#e1306c' };
  }
  if (lower.includes('tiktok.com')) {
    return { id: 'tiktok', name: 'TikTok', color: '#00f2fe' };
  }
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
    return { id: 'facebook', name: 'Facebook', color: '#1877f2' };
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return { id: 'twitter', name: 'X / Twitter', color: '#1da1f2' };
  }
  if (lower.includes('reddit.com') || lower.includes('v.redd.it')) {
    return { id: 'reddit', name: 'Reddit', color: '#ff4500' };
  }
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) {
    return { id: 'pinterest', name: 'Pinterest', color: '#e60023' };
  }
  if (lower.includes('vimeo.com')) {
    return { id: 'vimeo', name: 'Vimeo', color: '#1ab7ea' };
  }
  if (lower.includes('twitch.tv')) {
    return { id: 'twitch', name: 'Twitch', color: '#9146ff' };
  }
  if (lower.includes('soundcloud.com')) {
    return { id: 'soundcloud', name: 'SoundCloud', color: '#ff5500' };
  }
  if (lower.includes('dailymotion.com') || lower.includes('dai.ly')) {
    return { id: 'dailymotion', name: 'Dailymotion', color: '#0066dc' };
  }
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return { id: 'generic', name: 'Plataforma Compatível', color: 'var(--mint)' };
  }
  return null;
}

function isPrivateOrLocal(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function formatDuration(sec?: number): string {
  if (!sec || isNaN(sec)) return '';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({ onShowToast }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'Vídeo' | 'Somente áudio'>('Vídeo');
  const [resolution, setResolution] = useState('1080p');
  const [videoContainer, setVideoContainer] = useState('MP4');
  const [audioFormat, setAudioFormat] = useState<'MP3' | 'M4A' | 'WAV' | 'FLAC' | 'OPUS'>('MP3');
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [targetFolder, setTargetFolder] = useState<string | null>(null);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaDownloadInfo | null>(null);
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  // Status yt-dlp
  const [ytdlpStatus, setYtdlpStatus] = useState<YtDlpStatus | null>(null);

  useEffect(() => {
    TauriService.getYtDlpStatus()
      .then((status) => setYtdlpStatus(status))
      .catch((err) => console.warn('Não foi possível verificar status do yt-dlp:', err));
  }, []);

  const detectedPlatform = detectPlatformQuick(url);
  const isSsrfWarning = isPrivateOrLocal(url);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setUrl(trimmed);
        onShowToast('Link colado da área de transferência');
        fetchInfo(trimmed);
      }
    } catch {
      onShowToast('Não foi possível acessar a área de transferência', 'warn');
    }
  };

  const fetchInfo = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      onShowToast('Insira um link HTTP/HTTPS válido', 'warn');
      return;
    }
    if (isPrivateOrLocal(clean)) {
      onShowToast('Endereços locais ou IPs privados são bloqueados por segurança', 'err');
      return;
    }

    setLoadingInfo(true);
    try {
      const info = await TauriService.fetchDownloadInfo(clean);
      setMediaInfo(info);

      // Pre-select all playlist items if playlist
      if (info.playlistItems && info.playlistItems.length > 0) {
        setSelectedPlaylistItems(new Set(info.playlistItems.map((item) => item.id)));
      } else {
        setSelectedPlaylistItems(new Set());
      }

      onShowToast(
        info.isPlaylist
          ? `Playlist detectada: ${info.playlistItems?.length || 0} itens`
          : `Metadados obtidos: ${info.title}`
      );
    } catch (err: any) {
      onShowToast(`Não foi possível obter metadados: ${err}`, 'warn');
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

  const toggleSelectAllPlaylist = () => {
    if (!mediaInfo?.playlistItems) return;
    if (selectedPlaylistItems.size === mediaInfo.playlistItems.length) {
      setSelectedPlaylistItems(new Set());
    } else {
      setSelectedPlaylistItems(new Set(mediaInfo.playlistItems.map((i) => i.id)));
    }
  };

  const togglePlaylistItem = (id: string) => {
    const next = new Set(selectedPlaylistItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlaylistItems(next);
  };

  const handleStartDownload = async () => {
    // If playlist mode
    if (mediaInfo?.isPlaylist && mediaInfo.playlistItems && mediaInfo.playlistItems.length > 0) {
      const itemsToDownload = mediaInfo.playlistItems.filter((item) =>
        selectedPlaylistItems.has(item.id)
      );

      if (itemsToDownload.length === 0) {
        onShowToast('Nenhum item da playlist selecionado', 'warn');
        return;
      }

      setDownloading(true);
      try {
        let count = 0;
        for (const item of itemsToDownload) {
          await TauriService.startDownload({
            url: item.url,
            outputDir: targetFolder || undefined,
            audioOnly: mode === 'Somente áudio',
            audioFormat: mode === 'Somente áudio' ? audioFormat.toLowerCase() : undefined,
            quality: mode === 'Vídeo' ? resolution : undefined,
          });
          count++;
        }
        onShowToast(
          `${count} download(s) da playlist iniciados! Acompanhe no painel de tarefas (Ctrl+J).`,
          'ok'
        );
      } catch (err: any) {
        onShowToast(`Erro ao enfileirar downloads da playlist: ${err}`, 'err');
      } finally {
        setDownloading(false);
      }
      return;
    }

    // Normal or batch mode
    const urlsToDownload = batchMode
      ? batchUrls
          .split('\n')
          .map((u) => u.trim())
          .filter((u) => u.length > 0 && !isPrivateOrLocal(u))
      : [url.trim()].filter((u) => u.length > 0 && !isPrivateOrLocal(u));

    if (urlsToDownload.length === 0) {
      onShowToast('Insira ao menos um link válido e público para baixar', 'warn');
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
        `${urlsToDownload.length} download(s) enfileirados com sucesso! Acompanhe o progresso no painel de tarefas (Ctrl+J).`,
        'ok'
      );
    } catch (err: any) {
      onShowToast(`Erro ao iniciar download: ${err}`, 'err');
    } finally {
      setDownloading(false);
    }
  };

  const parsedBatchCount = batchUrls
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0).length;

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
      {/* Header */}
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
          02 · downloads multiplataforma
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
          Downloads de Mídia & Áudio
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Baixe vídeos, áudios e playlists de dezenas de plataformas suportadas com o motor nativo yt-dlp.
        </p>
      </div>

      {/* Supported Platforms Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--bg-soft)',
          border: '1px solid var(--line)',
          borderRadius: 10,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--mono)',
            color: 'var(--fg-dim)',
            marginRight: 4,
            textTransform: 'uppercase',
          }}
        >
          Plataformas:
        </span>
        {SUPPORTED_PLATFORMS.map((plat) => (
          <span
            key={plat.id}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--fg-dim)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: plat.color,
                display: 'inline-block',
              }}
            />
            {plat.name}
          </span>
        ))}
      </div>

      {/* Main Download Card */}
      <div
        style={{
          background: 'var(--bg-soft)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <SegmentedControl
            options={['Vídeo', 'Somente áudio']}
            value={mode}
            onChange={(val) => setMode(val as any)}
          />

          <Switch
            label="Download em lote (vários links)"
            checked={batchMode}
            onChange={setBatchMode}
          />
        </div>

        {/* Single URL or Batch Textarea */}
        {!batchMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 44,
                  background: 'var(--surface)',
                  border: isSsrfWarning ? '1px solid #ff4444' : '1px solid var(--line)',
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
                  placeholder="Cole o link (YouTube, Shorts, Instagram, Reels, TikTok, X, SoundCloud...)"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--fg)',
                    fontSize: '13.5px',
                  }}
                />

                {detectedPlatform && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      color: detectedPlatform.color,
                      fontWeight: 600,
                      fontFamily: 'var(--mono)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {detectedPlatform.name}
                  </span>
                )}
              </div>

              <Button variant="secondary" onClick={handlePaste}>
                Colar
              </Button>
              <Button
                variant="secondary"
                onClick={() => fetchInfo(url.trim())}
                disabled={loadingInfo || !url.trim() || isSsrfWarning}
              >
                {loadingInfo ? 'Consultando...' : 'Consultar'}
              </Button>
            </div>

            {isSsrfWarning && (
              <div style={{ fontSize: '11.5px', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alert" size={14} />
                <span>Bloqueio de segurança: URLs locais ou privadas não são permitidas.</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              rows={5}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder="Cole os links das mídias aqui, um por linha...&#10;https://www.youtube.com/watch?v=...&#10;https://www.instagram.com/reel/...&#10;https://tiktok.com/@..."
              style={{
                width: '100%',
                padding: 12,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--fg)',
                fontFamily: 'var(--mono)',
                fontSize: '12.5px',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--fg-dim)' }}>
              <span>{parsedBatchCount} link(s) detectado(s)</span>
              {parsedBatchCount > 0 && (
                <button
                  type="button"
                  onClick={() => setBatchUrls('')}
                  style={{ background: 'none', border: 'none', color: 'var(--mint)', cursor: 'pointer', fontSize: '11.5px' }}
                >
                  Limpar lista
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media Preview Card */}
        {mediaInfo && !batchMode && (
          <div
            style={{
              padding: 16,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {mediaInfo.thumbnailUrl ? (
                <img
                  src={mediaInfo.thumbnailUrl}
                  alt={mediaInfo.title}
                  style={{ width: 110, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 110,
                    height: 68,
                    background: 'var(--bg)',
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--fg-dim)',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={mode === 'Somente áudio' ? 'audio' : 'video'} size={28} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontFamily: 'var(--mono)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-soft)',
                      color: 'var(--mint)',
                      border: '1px solid var(--line)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {mediaInfo.platformName || mediaInfo.platform}
                  </span>
                  {mediaInfo.isPlaylist && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontFamily: 'var(--mono)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(21, 245, 186, 0.15)',
                        color: 'var(--mint)',
                        fontWeight: 600,
                      }}
                    >
                      PLAYLIST ({mediaInfo.playlistItems?.length || 0} ITENS)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mediaInfo.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: 4 }}>
                  {mediaInfo.uploader || 'Fonte autorizada'}
                  {mediaInfo.durationSeconds ? ` · ${formatDuration(mediaInfo.durationSeconds)}` : ''}
                </div>
              </div>
            </div>

            {/* Playlist Items Sub-list */}
            {mediaInfo.isPlaylist && mediaInfo.playlistItems && mediaInfo.playlistItems.length > 0 && (
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
                    Itens da playlist ({selectedPlaylistItems.size} de {mediaInfo.playlistItems.length} selecionados)
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllPlaylist}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--mint)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {selectedPlaylistItems.size === mediaInfo.playlistItems.length
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    background: 'var(--bg)',
                  }}
                >
                  {mediaInfo.playlistItems.map((item, idx) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 10px',
                        borderBottom: idx < mediaInfo.playlistItems!.length - 1 ? '1px solid var(--line)' : 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        userSelect: 'none',
                        background: selectedPlaylistItems.has(item.id) ? 'rgba(21, 245, 186, 0.04)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylistItems.has(item.id)}
                        onChange={() => togglePlaylistItem(item.id)}
                        style={{ accentColor: 'var(--mint)' }}
                      />
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-dim)', width: 24, fontSize: '11px' }}>
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: selectedPlaylistItems.has(item.id) ? 'var(--fg)' : 'var(--fg-dim)',
                        }}
                      >
                        {item.title}
                      </span>
                      {item.durationSeconds && (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-dim)' }}>
                          {formatDuration(item.durationSeconds)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Options Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {mode === 'Vídeo' ? (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Qualidade de vídeo
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
                  value={videoContainer}
                  onChange={setVideoContainer}
                  size="sm"
                />
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Formato de áudio
              </label>
              <SegmentedControl
                options={['MP3', 'M4A', 'WAV', 'FLAC', 'OPUS']}
                value={audioFormat}
                onChange={(val) => setAudioFormat(val as any)}
                size="sm"
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
              Pasta de destino
            </label>
            <Button size="sm" variant="secondary" onClick={handleSelectFolder} style={{ width: '100%' }}>
              {targetFolder
                ? targetFolder.replace(/\\/g, '/').split('/').pop() || 'Pasta selecionada'
                : 'Pasta de Downloads'}
            </Button>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>
            {batchMode
              ? `${parsedBatchCount} link(s) pronto(s)`
              : mediaInfo?.isPlaylist
              ? `${selectedPlaylistItems.size} vídeo(s)/faixa(s) selecionado(s)`
              : mode === 'Somente áudio'
              ? `Extração para ${audioFormat}`
              : `Download em ${resolution} (${videoContainer})`}
          </span>

          <Button
            variant="primary"
            onClick={handleStartDownload}
            disabled={
              downloading ||
              (!batchMode && !url.trim()) ||
              (batchMode && parsedBatchCount === 0) ||
              (!batchMode && mediaInfo?.isPlaylist && selectedPlaylistItems.size === 0) ||
              isSsrfWarning
            }
          >
            {downloading
              ? 'Enfileirando...'
              : mediaInfo?.isPlaylist
              ? `Baixar selecionados (${selectedPlaylistItems.size})`
              : batchMode
              ? `Baixar lote (${parsedBatchCount})`
              : `Baixar ${mode === 'Somente áudio' ? 'Áudio' : 'Vídeo'}`}
          </Button>
        </div>
      </div>

      {/* Engine Status & Legal Compliance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {/* yt-dlp Status Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: ytdlpStatus?.isAvailable ? '#15F5BA' : '#ff4444',
                boxShadow: ytdlpStatus?.isAvailable ? '0 0 8px rgba(21, 245, 186, 0.4)' : 'none',
              }}
            />
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>
              Motor nativo yt-dlp
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--mono)',
                color: 'var(--mint)',
                marginLeft: 'auto',
              }}
            >
              v{ytdlpStatus?.version || '2026.02.04'}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
            {ytdlpStatus?.origin || 'Binário empacotado e validado nativamente'}. Atualizações são verificadas mantendo compatibilidade contínua com as plataformas.
          </div>
        </div>

        {/* Compliance Note */}
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
          <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
            <strong>Conformidade e Segurança:</strong> O Arce Tools é offline-first e respeita os termos de serviço e direitos autorais. URLs apontando para redes privadas locais (SSRF) são estritamente bloqueadas.
          </div>
        </div>
      </div>
    </div>
  );
};
