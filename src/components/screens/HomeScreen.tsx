import React, { useState } from 'react';
import { ScreenId, NAV_ITEMS } from '../../types/navigation';
import { Task } from '../../types/task';
import { HistoryItem } from '../../types/history';
import { Icon } from '../common/Icon';
import { DropZone } from '../common/DropZone';

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
  tasks: Task[];
  history: HistoryItem[];
  onFilesDropped: (files: FileList | File[]) => void;
  onOpenExplorer: (path?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  tasks,
  history,
  onFilesDropped,
  onOpenExplorer,
}) => {
  const [urlInput, setUrlInput] = useState('');

  const quickActions = [
    { label: 'Creative Studio (IA)', icon: 'sparkles', target: 'creative' as ScreenId },
    { label: 'PDF para Word', icon: 'pdf2word', target: 'documents' as ScreenId },
    { label: 'Word para PDF', icon: 'word2pdf', target: 'documents' as ScreenId },
    { label: 'Baixar vídeo', icon: 'downloads', target: 'downloads' as ScreenId },
    { label: 'Converter áudio', icon: 'audio', target: 'audio' as ScreenId },
    { label: 'Criar pôster', icon: 'posters', target: 'posters' as ScreenId },
  ];

  const modules = [
    { id: 'creative' as ScreenId, meta: 'Imagens, Motion & Vídeos com IA', key: 'C' },
    { id: 'downloads' as ScreenId, meta: 'Vídeo, áudio e playlists', key: '2' },
    { id: 'documents' as ScreenId, meta: '7 ferramentas', key: '3' },
    { id: 'audio' as ScreenId, meta: 'Converter e cortar', key: '4' },
    { id: 'video' as ScreenId, meta: '6 ferramentas', key: '5' },
    { id: 'images' as ScreenId, meta: '4 ferramentas · em lote', key: '6' },
    { id: 'posters' as ScreenId, meta: 'Poster Studio', key: '7' },
  ];

  const activeTasks = tasks.filter(
    (t) => t.status === 'processing' || t.status === 'waiting'
  );

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px 48px',
        maxWidth: 1080,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
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
          toolsondesk
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
          O que vamos fazer hoje?
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Solte arquivos, cole um link ou escolha uma ferramenta.
        </p>
      </div>

      {/* Quick Actions Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => onNavigate(qa.target)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              fontFamily: 'var(--sans)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--mint-edge)';
              e.currentTarget.style.color = 'var(--mint)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.color = 'var(--fg)';
            }}
          >
            <Icon name={qa.icon} size={15} />
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Central DropZone & URL Input */}
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
        <DropZone onFilesSelected={onFilesDropped} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              height: 1,
              flex: 1,
              background: 'var(--line)',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              color: 'var(--fg-faint)',
              textTransform: 'uppercase',
            }}
          >
            ou cole um link
          </span>
          <div
            style={{
              height: 1,
              flex: 1,
              background: 'var(--line)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 36,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 8,
            }}
          >
            <Icon name="link" size={15} style={{ color: 'var(--fg-dim)' }} />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNavigate('downloads');
              }}
              placeholder="Cole um link do YouTube ou site suportado..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--fg)',
                fontSize: '13px',
              }}
            />
          </div>

          <button
            onClick={() => onNavigate('downloads')}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              background: 'var(--mint)',
              color: 'var(--bg)',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Analisar link
          </button>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--fg)',
            margin: '0 0 12px',
          }}
        >
          Ferramentas disponíveis
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {modules.map((m) => {
            const nav = NAV_ITEMS.find((n) => n.id === m.id);
            if (!nav) return null;

            return (
              <div
                key={m.id}
                onClick={() => onNavigate(m.id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--mint-edge)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--mint)',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={nav.icon} size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--fg)' }}>
                      {nav.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '10.5px',
                        color: 'var(--fg-faint)',
                      }}
                    >
                      Ctrl {m.key}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--fg-dim)',
                      marginTop: 3,
                    }}
                  >
                    {m.meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Tasks or Recent History */}
      {activeTasks.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--fg)',
              margin: '0 0 12px',
            }}
          >
            Tarefas em andamento
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Icon name={t.mod} size={16} style={{ color: 'var(--mint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--fg)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>{t.op}</div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: 'var(--mint)',
                  }}
                >
                  {t.status === 'processing'
                    ? `${Math.round((t.progress || 0) * 100)}%`
                    : 'Na fila'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--fg)',
                margin: 0,
              }}
            >
              Arquivos recentes
            </h2>
            <button
              onClick={() => onNavigate('history')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--mint)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Ver histórico completo →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.slice(0, 5).map((h) => (
              <div
                key={h.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Icon name="check" size={15} style={{ color: 'var(--mint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--fg)', fontWeight: 500 }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>
                    {h.op} · {h.date}
                  </div>
                </div>
                {h.filePath && (
                  <button
                    onClick={() => onOpenExplorer(h.filePath)}
                    title="Abrir no Explorador"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      color: 'var(--fg-dim)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Abrir pasta
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
