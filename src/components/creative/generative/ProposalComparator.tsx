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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [syncPan, setSyncPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    if (newZoom === 1) {
      setSyncPan({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - syncPan.x, y: e.clientY - syncPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoomLevel <= 1) return;
    setSyncPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
            Comparação Lado a Lado de Variações
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
            Zoom síncrono e inspeção de detalhes para seleção da melhor direção visual.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Synchronized Zoom Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'var(--bg)',
              borderRadius: 6,
              border: '1px solid var(--line)',
              padding: 2,
            }}
          >
            {[1, 2, 4].map((z) => (
              <button
                key={z}
                onClick={() => handleZoomChange(z)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: zoomLevel === z ? 'var(--mint)' : 'transparent',
                  color: zoomLevel === z ? '#0B0F10' : 'var(--fg)',
                  fontWeight: zoomLevel === z ? 700 : 500,
                  fontSize: 11,
                  fontFamily: 'var(--mono, monospace)',
                  cursor: 'pointer',
                }}
              >
                {z}x
              </button>
            ))}
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(proposals.length, 1)}, 1fr)`,
          gap: 16,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: zoomLevel > 1 ? 'border-color 150ms ease' : 'all 150ms ease',
              }}
            >
              {/* Media Preview Container with Sync Zoom & Pan */}
              <div
                style={{
                  height: 280,
                  backgroundColor: '#050708',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  userSelect: 'none',
                }}
                onMouseDown={handleMouseDown}
              >
                {item.imageSrc ? (
                  <img
                    src={item.imageSrc.startsWith('file://') ? item.imageSrc : `file://${item.imageSrc}`}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${zoomLevel}) translate(${syncPan.x / zoomLevel}px, ${syncPan.y / zoomLevel}px)`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 100ms ease-out',
                      pointerEvents: 'none',
                    }}
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
                      fontFamily: 'var(--mono, monospace)',
                      zIndex: 2,
                    }}
                  >
                    {item.badge}
                  </div>
                )}
              </div>

              {/* Proposal Details */}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{item.title}</div>
                {item.subtitle && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{item.subtitle}</div>
                )}

                {item.metadata && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      fontFamily: 'var(--mono, monospace)',
                      marginTop: 8,
                    }}
                  >
                    {item.metadata}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item.id);
                    }}
                  >
                    {isSelected ? '✓ Selecionada' : 'Escolher Proposta'}
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
