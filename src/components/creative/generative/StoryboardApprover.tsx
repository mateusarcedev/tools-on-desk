import React from 'react';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

export interface StoryboardScene {
  id: string;
  order: number;
  title: string;
  durationSec: number;
  scriptText: string;
  visualCue: string;
  cameraMovement: string;
  approved: boolean;
  thumbnailUrl?: string;
}

interface StoryboardApproverProps {
  scenes: StoryboardScene[];
  onToggleApprove: (id: string) => void;
  onEditScene: (scene: StoryboardScene) => void;
  onApproveAll: () => void;
  onRenderVideo: () => void;
}

export const StoryboardApprover: React.FC<StoryboardApproverProps> = ({
  scenes,
  onToggleApprove,
  onEditScene,
  onApproveAll,
  onRenderVideo,
}) => {
  const allApproved = scenes.every((s) => s.approved);
  const totalDuration = scenes.reduce((acc, s) => acc + s.durationSec, 0);

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>
            Storyboard & Aprovação de Cenas
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
            {scenes.length} cenas planejadas · Duração total estimada: {totalDuration.toFixed(1)}s
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onApproveAll}>
            ✓ Aprovar Todas as Cenas
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onRenderVideo}
            disabled={!allApproved && scenes.length > 0}
          >
            <Icon name="video" size={14} /> Renderizar Vídeo ({totalDuration.toFixed(0)}s)
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {scenes.map((scene) => (
          <div
            key={scene.id}
            style={{
              display: 'flex',
              gap: 16,
              padding: 14,
              borderRadius: 8,
              border: scene.approved ? '1px solid rgba(21, 245, 186, 0.4)' : '1px solid var(--line)',
              backgroundColor: scene.approved ? 'rgba(21, 245, 186, 0.03)' : 'var(--bg)',
              alignItems: 'flex-start',
            }}
          >
            {/* Scene Thumbnail / Badge */}
            <div
              style={{
                width: 120,
                height: 80,
                borderRadius: 6,
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {scene.thumbnailUrl ? (
                <img
                  src={scene.thumbnailUrl}
                  alt={scene.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 4 }}>
                  Cena {scene.order}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontSize: 10,
                  color: 'var(--fg)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {scene.durationSec.toFixed(1)}s
              </div>
            </div>

            {/* Scene Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: 'var(--fg)',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  Cena {scene.order}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{scene.title}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--mint)',
                    backgroundColor: 'rgba(21, 245, 186, 0.1)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    marginLeft: 'auto',
                  }}
                >
                  {scene.cameraMovement}
                </span>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--fg)', fontStyle: 'italic' }}>
                  "{scene.scriptText}"
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  <strong>Ação Visual:</strong> {scene.visualCue}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <Button
                variant={scene.approved ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onToggleApprove(scene.id)}
              >
                {scene.approved ? '✓ Aprovada' : 'Aprovar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEditScene(scene)}>
                Editar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
