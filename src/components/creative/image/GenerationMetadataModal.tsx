import React, { useState, useEffect } from 'react';
import { GenerationMetadata } from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface GenerationMetadataModalProps {
  imagePath: string;
  onClose: () => void;
  onSendToMotion?: (imagePath: string) => void;
  onShowToast?: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const GenerationMetadataModal: React.FC<GenerationMetadataModalProps> = ({
  imagePath,
  onClose,
  onSendToMotion,
  onShowToast,
}) => {
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    TauriService.getGenerationMetadataByOutput(imagePath)
      .then((data) => {
        if (!isMounted) return;
        setMetadata(data);
      })
      .catch((err) => {
        console.warn('Erro ao obter metadados:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [imagePath]);

  const fileName = imagePath.split('/').pop() || 'imagem.png';

  const handleCopyJson = () => {
    if (!metadata) return;
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    onShowToast?.('Metadados copiados para a área de transferência!', 'ok');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '88vh',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>
                Rastreabilidade & Metadados da Geração
              </h3>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--mint)',
                  backgroundColor: 'rgba(21, 245, 186, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'var(--mono, monospace)',
                }}
              >
                Audit Trail
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
              {fileName}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Carregando metadados de geração...
            </div>
          ) : !metadata ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhum histórico detalhado associado a este arquivo (imagem importada diretamente ou gerada antes da rastreabilidade).
            </div>
          ) : (
            <>
              {/* Image Preview & Key Attributes */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    height: 140,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#050708',
                    border: '1px solid var(--line)',
                  }}
                >
                  <img
                    src={`file://${imagePath}`}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ backgroundColor: 'var(--surface-2, #141A1C)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Operação</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint)' }}>{metadata.operation}</div>
                    </div>

                    <div style={{ backgroundColor: 'var(--surface-2, #141A1C)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Modelo Visual</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--mono, monospace)' }}>
                        {metadata.model}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--surface-2, #141A1C)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Tempo de Geração</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--mono, monospace)' }}>
                        {metadata.duration_ms} ms
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
                    Gerado em: {new Date(metadata.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Prompt Evolution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Instrução do Usuário (Prompt Original)</div>
                <div
                  style={{
                    backgroundColor: 'var(--bg)',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    fontSize: 12,
                    color: 'var(--fg)',
                    lineHeight: 1.4,
                  }}
                >
                  "{metadata.prompt}"
                </div>
              </div>

              {metadata.enhanced_prompt && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint)' }}>
                    Prompt Final Enriquecido com IA {metadata.agent_used ? `(${metadata.agent_used})` : ''}
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(21, 245, 186, 0.04)',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid rgba(21, 245, 186, 0.25)',
                      fontSize: 12,
                      color: 'var(--fg)',
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                    }}
                  >
                    "{metadata.enhanced_prompt}"
                  </div>
                </div>
              )}

              {/* Associated Reference Files */}
              {metadata.references && metadata.references.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                    Arquivos de Referência Utilizados ({metadata.references.length})
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {metadata.references.map((ref) => (
                      <div
                        key={ref.id}
                        style={{
                          backgroundColor: 'var(--surface-2, #141A1C)',
                          border: '1px solid var(--line)',
                          borderRadius: 6,
                          padding: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 4,
                            backgroundColor: '#050708',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {ref.file_type === 'image' ? (
                            <img
                              src={`file://${ref.file_path}`}
                              alt={ref.file_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--mono, monospace)' }}>
                              {ref.file_type.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ref.file_name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {ref.purpose} · {ref.file_type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-2, #141A1C)',
          }}
        >
          <Button size="sm" variant="secondary" onClick={handleCopyJson} disabled={!metadata}>
            Copiar Metadados JSON
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            {onSendToMotion && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onSendToMotion(imagePath);
                  onClose();
                }}
              >
                Enviar ao Motion Studio →
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
