import React, { useState } from 'react';
import { HistoryItem } from '../../types/history';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { TauriService } from '../../services/tauri';

interface HistoryScreenProps {
  history: HistoryItem[];
  onRefreshHistory: () => void;
  onOpenExplorer: (path?: string) => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

const CATEGORIES = [
  'Todos',
  'Downloads',
  'Documentos',
  'Áudio',
  'Vídeo',
  'Imagens',
  'Pôsteres',
];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onRefreshHistory,
  onOpenExplorer,
  onShowToast,
}) => {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = history.filter((item) => {
    const matchesFilter = filter === 'Todos' || item.mod.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.op.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClear = async () => {
    try {
      await TauriService.clearHistory();
      onRefreshHistory();
      onShowToast('Histórico limpo. Os arquivos gerados não foram apagados.', 'warn');
    } catch (err: any) {
      onShowToast(`Erro ao limpar histórico: ${err}`, 'err');
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
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            histórico
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
            Histórico de Operações
          </h1>
          <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
            Registro real de arquivos gerados e tarefas processadas no seu computador.
          </p>
        </div>

        {history.length > 0 && (
          <Button variant="danger" size="sm" onClick={handleClear}>
            Limpar histórico
          </Button>
        )}
      </div>

      {/* Search & Filter Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            flex: '1 1 240px',
            height: 34,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: 8,
          }}
        >
          <Icon name="search" size={15} style={{ color: 'var(--fg-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou operação..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              fontSize: '12.5px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = filter === cat;
            const count =
              cat === 'Todos'
                ? history.length
                : history.filter((h) => h.mod.toLowerCase().includes(cat.toLowerCase())).length;

            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--mint-edge)' : '1px solid var(--line)',
                  background: isSelected ? 'var(--mint-dim)' : 'transparent',
                  color: isSelected ? 'var(--mint)' : 'var(--fg-dim)',
                  fontSize: '12px',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{cat}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            color: 'var(--fg-faint)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Icon name="history" size={36} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)' }}>
            Nenhum registro encontrado
          </div>
          <div style={{ fontSize: '12.5px', maxWidth: 360 }}>
            As tarefas concluídas no Poster Studio e no conversor de imagens serão registradas aqui automaticamente.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((item) => {
            const statusColor =
              item.status === 'Erro'
                ? 'var(--pink)'
                : item.status === 'Cancelado'
                ? 'var(--fg-faint)'
                : 'var(--mint)';

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    display: 'grid',
                    placeItems: 'center',
                    color: statusColor,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="check" size={16} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 2 }}>
                    {item.op} · {item.date}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      color: statusColor,
                      fontWeight: 500,
                    }}
                  >
                    {item.status}
                  </span>

                  {item.filePath && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenExplorer(item.filePath)}
                    >
                      <Icon name="folder" size={13} />
                      Abrir pasta
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
