import React, { useState } from 'react';
import { Task, TaskStatus } from '../../types/task';
import { Icon } from '../common/Icon';
import { TauriService } from '../../services/tauri';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onTaskUpdated: () => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onNavigateToError?: (taskId: string) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  onTaskUpdated,
  onShowToast,
  onNavigateToError,
}) => {
  const [filter, setFilter] = useState<'Todas' | 'Ativas' | 'Concluídas' | 'Falhas'>('Todas');

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'Ativas') return t.status === 'processing' || t.status === 'waiting';
    if (filter === 'Concluídas') return t.status === 'done';
    if (filter === 'Falhas') return t.status === 'failed' || t.status === 'canceled';
    return true;
  });

  const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
    waiting: { label: 'Aguardando', color: 'var(--fg-faint)' },
    processing: { label: 'Processando', color: 'var(--mint)' },
    done: { label: 'Concluído', color: 'var(--fg-dim)' },
    canceled: { label: 'Cancelado', color: 'var(--fg-faint)' },
    failed: { label: 'Erro', color: 'var(--pink)' },
  };

  const handleCancel = async (id: string, name: string) => {
    try {
      await TauriService.cancelTask(id);
      onShowToast(`Cancelado: ${name}`, 'warn');
      onTaskUpdated();
    } catch (err: any) {
      onShowToast(`Erro ao cancelar: ${err}`, 'err');
    }
  };

  const handleRetry = async (id: string, name: string) => {
    try {
      await TauriService.retryTask(id);
      onShowToast(`Repetindo tarefa: ${name}`);
      onTaskUpdated();
    } catch (err: any) {
      onShowToast(`Erro ao repetir: ${err}`, 'err');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await TauriService.removeTask(id);
      onTaskUpdated();
    } catch (err: any) {
      onShowToast(`Erro ao remover: ${err}`, 'err');
    }
  };

  const handleOpenPath = async (path?: string) => {
    if (!path) return;
    try {
      await TauriService.openPathInExplorer(path);
    } catch (err: any) {
      onShowToast(`Erro ao abrir caminho: ${err}`, 'err');
    }
  };

  const handleClearCompleted = async () => {
    try {
      await TauriService.clearCompletedTasks();
      onTaskUpdated();
      onShowToast('Tarefas concluídas removidas da lista');
    } catch (err: any) {
      onShowToast(`Erro ao limpar: ${err}`, 'err');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="tasks" size={17} style={{ color: 'var(--mint)' }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>
              Central de tarefas
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-dim)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 12px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--bg-soft)',
          }}
        >
          {(['Todas', 'Ativas', 'Concluídas', 'Falhas'] as const).map((tab) => {
            const isSelected = filter === tab;
            const count = tasks.filter((t) => {
              if (tab === 'Ativas') return t.status === 'processing' || t.status === 'waiting';
              if (tab === 'Concluídas') return t.status === 'done';
              if (tab === 'Falhas') return t.status === 'failed' || t.status === 'canceled';
              return true;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--line)' : '1px solid transparent',
                  background: isSelected ? 'var(--surface-2)' : 'transparent',
                  color: isSelected ? 'var(--fg)' : 'var(--fg-dim)',
                  fontSize: '11.5px',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span>{tab}</span>
                <span style={{ fontSize: '10.5px', color: 'var(--fg-faint)', opacity: 0.8 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Task List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filteredTasks.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fg-faint)',
                textAlign: 'center',
                gap: 8,
              }}
            >
              <Icon name="tasks" size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '13px' }}>Nenhuma tarefa nesta categoria</span>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const conf = statusConfig[t.status] || statusConfig.waiting;
              const pct = Math.round((t.progress || 0) * 100);

              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--bg-soft)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--fg-dim)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={t.mod} size={15} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: '12.5px',
                          color: 'var(--fg)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--fg-dim)',
                          marginTop: 1,
                        }}
                      >
                        {t.op}
                      </div>
                    </div>

                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: conf.color,
                        fontWeight: 500,
                      }}
                    >
                      {t.status === 'processing' ? `${pct}%` : conf.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {(t.status === 'processing' || t.status === 'waiting') && (
                    <div
                      style={{
                        height: 4,
                        background: 'var(--surface-2)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--mint)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {t.error && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--pink)',
                        background: 'var(--pink-dim)',
                        padding: '4px 8px',
                        borderRadius: 5,
                        lineHeight: 1.35,
                      }}
                    >
                      {t.error}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    {t.status === 'done' && t.targetPath && (
                      <button
                        onClick={() => handleOpenPath(t.targetPath)}
                        title="Abrir arquivo"
                        style={{
                          height: 24,
                          padding: '0 8px',
                          borderRadius: 5,
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="open" size={12} />
                        Abrir
                      </button>
                    )}

                    {t.status === 'done' && (
                      <button
                        onClick={() => handleOpenPath(t.targetPath)}
                        title="Abrir pasta no Explorador"
                        style={{
                          height: 24,
                          padding: '0 8px',
                          borderRadius: 5,
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="folder" size={12} />
                        Pasta
                      </button>
                    )}

                    {(t.status === 'processing' || t.status === 'waiting') && (
                      <button
                        onClick={() => handleCancel(t.id, t.name)}
                        style={{
                          height: 24,
                          padding: '0 8px',
                          borderRadius: 5,
                          border: '1px solid rgba(233, 100, 121, 0.3)',
                          background: 'var(--pink-dim)',
                          color: 'var(--pink)',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    )}

                    {(t.status === 'failed' || t.status === 'canceled') && (
                      <button
                        onClick={() => handleRetry(t.id, t.name)}
                        style={{
                          height: 24,
                          padding: '0 8px',
                          borderRadius: 5,
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="retry" size={12} />
                        Repetir
                      </button>
                    )}

                    {t.status === 'failed' && (
                      <>
                        <button
                          onClick={async () => {
                            const errText = t.error || `Erro na tarefa ${t.name} (ID: ${t.id})`;
                            await TauriService.copyToClipboard(errText);
                            onShowToast('Mensagem de erro copiada!', 'ok');
                          }}
                          title="Copiar mensagem do erro"
                          style={{
                            height: 24,
                            padding: '0 8px',
                            borderRadius: 5,
                            border: '1px solid var(--line)',
                            background: 'transparent',
                            color: 'var(--fg)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon name="copy" size={12} />
                          Copiar erro
                        </button>

                        {onNavigateToError && (
                          <button
                            onClick={() => {
                              onNavigateToError(t.id);
                              onClose();
                            }}
                            title="Ver detalhes na Central de Erros e Diagnósticos"
                            style={{
                              height: 24,
                              padding: '0 8px',
                              borderRadius: 5,
                              border: '1px solid var(--pink)',
                              background: 'var(--pink-dim)',
                              color: 'var(--pink)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Icon name="alert" size={12} />
                            Ver detalhes do erro
                          </button>
                        )}
                      </>
                    )}

                    {t.status !== 'processing' && t.status !== 'waiting' && (
                      <button
                        onClick={() => handleRemove(t.id)}
                        title="Remover da lista"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--fg-faint)',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'var(--fg-faint)' }}>
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} no total
          </span>

          <button
            onClick={handleClearCompleted}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-dim)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--fg)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--fg-dim)';
            }}
          >
            Limpar concluídas
          </button>
        </div>
      </div>
    </div>
  );
};
