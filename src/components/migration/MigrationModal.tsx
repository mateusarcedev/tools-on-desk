import React, { useState, useEffect } from 'react';
import { MigrationStatus, MigrationProgressEvent } from '../../types/migration';
import { TauriService } from '../../services/tauri';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (status: MigrationStatus) => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<MigrationProgressEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      TauriService.getMigrationStatus().then((s) => {
        setStatus(s);
        if (s.isMigrated && s.currentStep === 'COMPLETED') {
          setIsSuccess(true);
        }
      });

      const unlisten = TauriService.onMigrationProgress((evt) => {
        setCurrentEvent(evt);
      });

      return () => {
        unlisten();
      };
    }
  }, [isOpen]);

  if (!isOpen || !status) return null;

  const handleStartMigration = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await TauriService.runMigration();
      setStatus(res);
      setIsSuccess(true);
      onCompleted(res);
    } catch (e: any) {
      setErrorMsg(e?.message || e?.toString() || 'Erro inesperado durante a migração.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDismiss = async () => {
    await TauriService.dismissMigrationPrompt();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#141A1C',
          border: '1px solid #1F292B',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header with Mint Accent Line */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #15F5BA 0%, #076B39 100%)' }} />

        <div style={{ padding: '32px' }}>
          {/* Brand & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(21, 245, 186, 0.1)',
                  border: '1px solid rgba(21, 245, 186, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#15F5BA',
                }}
              >
                <Icon name="wand" size={18} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 600,
                  color: '#15F5BA',
                  fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                }}
              >
                ToolsOnDesk · Migração Segura
              </span>
            </div>

            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#1A2326',
                border: '1px solid #283538',
                color: '#9CA3AF',
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
              }}
            >
              Missão 07 · M07-v1
            </span>
          </div>

          {!isSuccess ? (
            <>
              {/* Welcome Title */}
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#F3F4F6',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.3px',
                }}
              >
                Bem-vindo ao ToolsOnDesk
              </h2>

              <p
                style={{
                  fontSize: '14px',
                  color: '#9CA3AF',
                  margin: '0 0 24px 0',
                  lineHeight: '1.5',
                }}
              >
                Encontramos dados de uma versão anterior do aplicativo (Arce Tools).
                Vamos preservar seus projetos, histórico e configurações de forma 100% segura e não-destrutiva.
              </p>

              {/* Progress Bar (when running) */}
              {isRunning && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#15F5BA', fontWeight: 500 }}>
                      {currentEvent?.stepName || 'Processando...'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                      }}
                    >
                      {currentEvent?.percent ? `${Math.round(currentEvent.percent)}%` : '0%'}
                    </span>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      backgroundColor: '#1F292B',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${currentEvent?.percent || 10}%`,
                        backgroundColor: '#15F5BA',
                        borderRadius: '3px',
                        transition: 'width 0.25s ease-out',
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      marginTop: '8px',
                      fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                    }}
                  >
                    {currentEvent?.message || 'Aguarde...'}
                  </p>
                </div>
              )}

              {/* Error Message if any */}
              {errorMsg && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ color: '#EF4444', fontSize: '13px' }}>
                    Não foi possível concluir a migração: {errorMsg}. Seus dados originais foram integralmente preservados.
                  </span>
                </div>
              )}

              {/* Details Collapsible */}
              <div style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#15F5BA',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{showDetails ? 'Ocultar detalhes' : 'Ver detalhes dos dados encontrados'}</span>
                  <span style={{ fontSize: '10px' }}>{showDetails ? '▲' : '▼'}</span>
                </button>

                {showDetails && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px 16px',
                      backgroundColor: '#0B0F10',
                      border: '1px solid #1F292B',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#9CA3AF',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                    }}
                  >
                    <div>• Projetos criativos: <strong style={{ color: '#F3F4F6' }}>{status.preservedProjectsCount}</strong></div>
                    <div>• Assets de mídia: <strong style={{ color: '#F3F4F6' }}>{status.preservedAssetsCount}</strong></div>
                    <div>• Tarefas históricas: <strong style={{ color: '#F3F4F6' }}>{status.preservedTasksCount}</strong></div>
                    <div>• Histórico de operações: <strong style={{ color: '#F3F4F6' }}>{status.preservedHistoryCount}</strong></div>
                    <div>• Registros de erro/log: <strong style={{ color: '#F3F4F6' }}>{status.preservedErrorLogsCount}</strong></div>
                    <div>• Ferramentas externas: <strong style={{ color: '#15F5BA' }}>{status.binariesReused ? 'Detectadas e prontas' : 'Padrão'}</strong></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isRunning}
                >
                  Configurar depois
                </Button>

                <Button
                  variant="primary"
                  onClick={handleStartMigration}
                  disabled={isRunning}
                  style={{
                    backgroundColor: '#15F5BA',
                    color: '#0B0F10',
                    fontWeight: 600,
                  }}
                >
                  {isRunning ? 'Migrando dados...' : 'Migrar meus dados'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Success Screen */}
              <div style={{ textAlign: 'center', padding: '12px 0 24px 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(21, 245, 186, 0.1)',
                    border: '1px solid #15F5BA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    color: '#15F5BA',
                  }}
                >
                  <Icon name="check" size={28} />
                </div>

                <h2
                  style={{
                    fontSize: '22px',
                    fontWeight: 600,
                    color: '#F3F4F6',
                    margin: '0 0 8px 0',
                  }}
                >
                  Seus dados foram migrados com sucesso!
                </h2>

                <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 24px 0' }}>
                  Todos os seus projetos, tarefas e histórico foram transferidos e validados no ToolsOnDesk.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '28px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ backgroundColor: '#0B0F10', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1F292B' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Projetos Preservados</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#15F5BA', marginTop: '4px' }}>
                      {status.preservedProjectsCount}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0B0F10', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1F292B' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Tarefas & Histórico</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#15F5BA', marginTop: '4px' }}>
                      {status.preservedTasksCount + status.preservedHistoryCount}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0B0F10', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1F292B' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Credenciais</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#15F5BA', marginTop: '4px' }}>
                      {status.credentialsMigrated ? 'DPAPI Ativa' : 'Segura'}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    backgroundColor: '#15F5BA',
                    color: '#0B0F10',
                    fontWeight: 600,
                    padding: '12px 24px',
                  }}
                >
                  Começar a usar o ToolsOnDesk
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
