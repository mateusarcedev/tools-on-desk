import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon';
import { NAV_ITEMS, ScreenId } from '../../types/navigation';
import { IconName } from '../common/icons';

interface PaletteItem {
  id: string;
  label: string;
  icon: IconName | string;
  hint?: string;
  group: 'Ir para' | 'Ações';
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleTasks: () => void;
  onCycleTheme: () => void;
  onToggleCollapse: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTasks,
  onCycleTheme,
  onToggleCollapse,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const items: PaletteItem[] = [
    ...NAV_ITEMS.map((n) => ({
      id: `nav-${n.id}`,
      label: n.label,
      icon: n.icon,
      hint: `Ctrl ${n.key}`,
      group: 'Ir para' as const,
      keywords: `${n.title} ${n.desc}`,
      run: () => {
        onClose();
        onNavigate(n.id);
      },
    })),
    {
      id: 'act-pdf2word',
      label: 'PDF para Word',
      icon: 'pdf2word',
      hint: 'Documentos',
      group: 'Ações',
      keywords: 'docx converter documento texto',
      run: () => {
        onClose();
        onNavigate('documents');
      },
    },
    {
      id: 'act-word2pdf',
      label: 'Word para PDF',
      icon: 'word2pdf',
      hint: 'Documentos',
      group: 'Ações',
      keywords: 'docx converter documento texto',
      run: () => {
        onClose();
        onNavigate('documents');
      },
    },
    {
      id: 'act-merge',
      label: 'Unir PDFs',
      icon: 'documents',
      hint: 'Documentos',
      group: 'Ações',
      keywords: 'juntar mesclar pdf',
      run: () => {
        onClose();
        onNavigate('documents');
      },
    },
    {
      id: 'act-compress-pdf',
      label: 'Comprimir PDF',
      icon: 'documents',
      hint: 'Documentos',
      group: 'Ações',
      keywords: 'reduzir tamanho pdf',
      run: () => {
        onClose();
        onNavigate('documents');
      },
    },
    {
      id: 'act-dl-video',
      label: 'Baixar vídeo',
      icon: 'downloads',
      hint: 'Downloads',
      group: 'Ações',
      keywords: 'youtube download mp4 link',
      run: () => {
        onClose();
        onNavigate('downloads');
      },
    },
    {
      id: 'act-dl-audio',
      label: 'Baixar somente áudio',
      icon: 'downloads',
      hint: 'Downloads',
      group: 'Ações',
      keywords: 'mp3 link baixar musica',
      run: () => {
        onClose();
        onNavigate('downloads');
      },
    },
    {
      id: 'act-convert-audio',
      label: 'Converter áudio',
      icon: 'audio',
      hint: 'Áudio',
      group: 'Ações',
      keywords: 'mp3 wav flac ogg',
      run: () => {
        onClose();
        onNavigate('audio');
      },
    },
    {
      id: 'act-compress-video',
      label: 'Comprimir vídeo',
      icon: 'video',
      hint: 'Vídeo',
      group: 'Ações',
      keywords: 'reduzir tamanho mp4 hevc',
      run: () => {
        onClose();
        onNavigate('video');
      },
    },
    {
      id: 'act-convert-img',
      label: 'Converter imagens',
      icon: 'images',
      hint: 'Imagens',
      group: 'Ações',
      keywords: 'jpg png webp lote',
      run: () => {
        onClose();
        onNavigate('images');
      },
    },
    {
      id: 'act-poster',
      label: 'Criar pôster',
      icon: 'posters',
      hint: 'Poster Studio',
      group: 'Ações',
      keywords: 'rasterbator dividir imprimir a4',
      run: () => {
        onClose();
        onNavigate('posters');
      },
    },
    {
      id: 'act-tasks',
      label: 'Abrir central de tarefas',
      icon: 'tasks',
      hint: 'Ctrl J',
      group: 'Ações',
      keywords: 'fila progresso gerenciador',
      run: () => {
        onClose();
        onToggleTasks();
      },
    },
    {
      id: 'act-theme',
      label: 'Alternar tema claro/escuro',
      icon: 'moon',
      hint: '',
      group: 'Ações',
      keywords: 'dark light modo cor',
      run: () => {
        onClose();
        onCycleTheme();
      },
    },
    {
      id: 'act-collapse',
      label: 'Recolher/expandir menu',
      icon: 'left',
      hint: 'Ctrl B',
      group: 'Ações',
      keywords: 'sidebar menu lateral',
      run: () => {
        onClose();
        onToggleCollapse();
      },
    },
  ];

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const q = norm(query.trim());
  const filtered = q
    ? items.filter((item) =>
        norm(`${item.label} ${item.keywords || ''} ${item.hint || ''}`).includes(q)
      )
    : items;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '68vh',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Icon name="search" size={18} style={{ color: 'var(--fg-dim)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando, ferramenta ou atalho..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--sans)',
              fontSize: '14px',
              color: 'var(--fg)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--surface-2)',
              color: 'var(--fg-faint)',
            }}
          >
            Esc
          </span>
        </div>

        {/* Results List */}
        <div
          style={{
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--fg-faint)',
                fontSize: '13px',
              }}
            >
              Nenhum resultado encontrado para “{query}”
            </div>
          ) : (
            filtered.map((item, i) => {
              const isSelected = i === selectedIndex;
              const isFirstInGroup =
                i === 0 || filtered[i - 1].group !== item.group;

              return (
                <React.Fragment key={item.id}>
                  {isFirstInGroup && (
                    <div
                      style={{
                        padding: '8px 12px 4px',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        color: 'var(--fg-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.group}
                    </div>
                  )}

                  <div
                    onClick={item.run}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isSelected ? 'var(--surface-2)' : 'transparent',
                      color: isSelected ? 'var(--fg)' : 'var(--fg-dim)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <Icon name={item.icon} size={16} />
                    <span style={{ flex: 1, fontSize: '13px' }}>
                      {item.label}
                    </span>
                    {item.hint && (
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--fg-faint)',
                        }}
                      >
                        {item.hint}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
