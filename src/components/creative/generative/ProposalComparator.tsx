import React, { useState } from 'react';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

export interface ProposalItem {
  id: string;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  badge?: string;
  metadata?: string;
}

interface ProposalComparatorProps {
  proposals: ProposalItem[];
  onSelect: (selectedId: string) => void;
  onCancel?: () => void;
}

export const ProposalComparator: React.FC<ProposalComparatorProps> = ({
  proposals,
  onSelect,
  onCancel,
}) => {
  const [selectedId, setSelectedId] = useState<string>(proposals[0]?.id || '');

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
            Comparação de Variações Geradas
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
            Escolha a proposta que melhor atende aos objetivos da sua campanha.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${proposals.length}, 1fr)`,
          gap: 16,
        }}
      >
        {proposals.map((item, index) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                borderRadius: 10,
                border: isSelected ? '2px solid var(--mint)' : '1px solid var(--line)',
                backgroundColor: isSelected ? 'rgba(21, 245, 186, 0.04)' : 'var(--bg)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 150ms ease',
              }}
            >
              {/* Media Preview Container */}
              <div
                style={{
                  height: 220,
                  backgroundColor: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {item.imageSrc ? (
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, #141A1C 0%, ${index === 0 ? '#15F5BA' : index === 1 ? '#0284C7' : '#7C3AED'} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--fg)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Variação {index + 1}
                  </div>
                )}

                {item.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(11, 15, 16, 0.85)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      color: 'var(--mint)',
                      border: '1px solid rgba(21, 245, 186, 0.4)',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    {item.badge}
                  </div>
                )}
              </div>

              {/* Proposal Details */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{item.title}</div>
                {item.subtitle && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{item.subtitle}</div>
                )}

                {item.metadata && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono, monospace)',
                      marginTop: 8,
                    }}
                  >
                    {item.metadata}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item.id);
                    }}
                  >
                    {isSelected ? '✓ Escolher Esta Proposta' : 'Selecionar'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
