import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../../types/history';
import { ErrorLogEntry, ErrorLogFilter, ErrorLogStats } from '../../types/errorLog';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { TauriService } from '../../services/tauri';

interface HistoryScreenProps {
  history: HistoryItem[];
  onRefreshHistory: () => void;
  onOpenExplorer: (path?: string) => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  initialTab?: 'activities' | 'diagnostics';
  highlightTaskId?: string | null;
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
  initialTab = 'activities',
  highlightTaskId = null,
}) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'diagnostics'>(initialTab);

  // Activities tab state
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  // Diagnostics tab state
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorLogStats>({
    total: 0,
    critical: 0,
    unresolved: 0,
    databaseSizeBytes: 0,
  });
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(new Set());

  // Error filters
  const [errorSearch, setErrorSearch] = useState('');
  const [errorPeriod, setErrorPeriod] = useState<string>('all');
  const [errorModule, setErrorModule] = useState<string>('all');
  const [errorSeverity, setErrorSeverity] = useState<string>('all');
  const [errorStatus, setErrorStatus] = useState<string>('all');

  // Confirmation modal for clear errors
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync initial tab when changed externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load error logs and stats
  const loadErrorData = async () => {
    setLoadingErrors(true);
    try {
      const filterPayload: ErrorLogFilter = {};
      if (errorSearch.trim()) filterPayload.search = errorSearch.trim();
      if (errorPeriod !== 'all') filterPayload.period = errorPeriod;
      if (errorModule !== 'all') filterPayload.module = errorModule;
      if (errorSeverity !== 'all') filterPayload.severity = errorSeverity;
      if (errorStatus !== 'all') filterPayload.status = errorStatus;

      const [logs, stats] = await Promise.all([
        TauriService.getErrorLogs(filterPayload),
        TauriService.getErrorStats(),
      ]);

      setErrorLogs(logs);
      setErrorStats(stats);

      // Auto-expand highlighted task ID error if present
      if (highlightTaskId) {
        const matching = logs.find((l) => l.taskId === highlightTaskId);
        if (matching) {
          setExpandedErrorIds((prev) => new Set(prev).add(matching.id));
        }
      }
    } catch (err: any) {
      console.warn('Failed to load error logs:', err);
    } finally {
      setLoadingErrors(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      loadErrorData();
    }
  }, [activeTab, errorSearch, errorPeriod, errorModule, errorSeverity, errorStatus]);

  // Real-time listener for newly created error logs
  useEffect(() => {
    const unlisten = TauriService.onErrorLogCreated(() => {
      if (activeTab === 'diagnostics') {
        loadErrorData();
      } else {
        TauriService.getErrorStats().then(setErrorStats).catch(() => {});
      }
    });

    return () => {
      unlisten();
    };
  }, [activeTab]);

  // Activities filter
  const filteredActivities = history.filter((item) => {
    const matchesFilter =
      filter === 'Todos' || item.mod.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.op.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClearActivities = async () => {
    try {
      await TauriService.clearHistory();
      onRefreshHistory();
      onShowToast('Histórico limpo. Os arquivos gerados não foram apagados.', 'warn');
    } catch (err: any) {
      onShowToast(`Erro ao limpar histórico: ${err}`, 'err');
    }
  };

  // Toggle expand card
  const toggleExpand = (id: string) => {
    setExpandedErrorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Resolve / unresolve error log
  const handleToggleResolve = async (id: string, currentStatus: string) => {
    const isResolved = currentStatus === 'resolved';
    try {
      await TauriService.resolveErrorLog(id, !isResolved);
      setErrorLogs((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: isResolved ? 'unresolved' : 'resolved',
                resolvedAt: isResolved ? null : new Date().toISOString(),
              }
            : l
        )
      );
      setErrorStats((prev) => ({
        ...prev,
        unresolved: isResolved ? prev.unresolved + 1 : Math.max(0, prev.unresolved - 1),
      }));
      onShowToast(
        isResolved ? 'Erro reaberto como não resolvido' : 'Erro marcado como resolvido!',
        'ok'
      );
    } catch (err: any) {
      onShowToast(`Erro ao atualizar status: ${err}`, 'err');
    }
  };

  // Format single error for clipboard
  const formatErrorText = (e: ErrorLogEntry): string => {
    return [
      `=== ARCE TOOLS - REGISTRO DE ERRO ===`,
      `ID: ${e.id}`,
      `Data/Hora: ${e.createdAt}`,
      `Severidade: ${e.severity.toUpperCase()}`,
      `Módulo: ${e.module} | Operação: ${e.operation}`,
      `Código: ${e.errorCode}`,
      `Mensagem: ${e.userMessage}`,
      e.taskId ? `ID da Tarefa: ${e.taskId}` : null,
      `Status: ${e.status}`,
      e.technicalDetails ? `\n[Detalhes Técnicos]\n${e.technicalDetails}` : null,
      e.sanitizedStack ? `\n[Stack Sanitizado]\n${e.sanitizedStack}` : null,
      `=====================================`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  // Copy single error
  const handleCopySingleError = async (e: ErrorLogEntry) => {
    const text = formatErrorText(e);
    await TauriService.copyToClipboard(text);
    onShowToast(`Registro [${e.errorCode}] copiado para a área de transferência!`, 'ok');
  };

  // Copy all / filtered errors formatted
  const handleCopyAllErrors = async () => {
    if (errorLogs.length === 0) {
      onShowToast('Nenhum erro na lista atual para copiar', 'warn');
      return;
    }

    const header = [
      `=============================================================`,
      `ARCE TOOLS — RELATÓRIO DE ERROS E DIAGNÓSTICOS DO SISTEMA`,
      `Exportado em: ${new Date().toLocaleString()}`,
      `Total de registros filtrados: ${errorLogs.length}`,
      `Erros Críticos: ${errorStats.critical} | Não Resolvidos: ${errorStats.unresolved}`,
      `=============================================================\n`,
    ].join('\n');

    const body = errorLogs.map((e, idx) => `[#${idx + 1}] ${formatErrorText(e)}`).join('\n\n');
    const fullText = `${header}\n${body}\n\n[Fim do Relatório]`;

    await TauriService.copyToClipboard(fullText);
    onShowToast(`${errorLogs.length} erro(s) copiados em formato de relatório!`, 'ok');
  };

  // Export report as JSON file
  const handleExportJson = () => {
    if (errorLogs.length === 0) {
      onShowToast('Nenhum registro para exportar', 'warn');
      return;
    }

    const jsonStr = JSON.stringify(errorLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arce-tools-diagnostico-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Relatório de diagnósticos exportado como JSON!', 'ok');
  };

  // Clear error logs
  const handleConfirmClearErrors = async () => {
    try {
      const removed = await TauriService.clearErrorLogs();
      setShowClearConfirm(false);
      loadErrorData();
      onShowToast(`${removed} registros de erros removidos do banco local!`, 'warn');
    } catch (err: any) {
      onShowToast(`Erro ao limpar registros: ${err}`, 'err');
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Sub-toolbar Tabs */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-soft)',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setActiveTab('activities')}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 7,
              border: activeTab === 'activities' ? '1px solid var(--mint-edge)' : '1px solid transparent',
              background: activeTab === 'activities' ? 'var(--mint-dim)' : 'transparent',
              color: activeTab === 'activities' ? 'var(--mint)' : 'var(--fg-dim)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="history" size={14} />
            <span>Atividades Concluídas</span>
            <span style={{ fontSize: '10.5px', opacity: 0.7 }}>({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 7,
              border: activeTab === 'diagnostics' ? '1px solid var(--mint-edge)' : '1px solid transparent',
              background: activeTab === 'diagnostics' ? 'var(--mint-dim)' : 'transparent',
              color: activeTab === 'diagnostics' ? 'var(--mint)' : 'var(--fg-dim)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="alert" size={14} />
            <span>Erros e Diagnósticos</span>
            {errorStats.unresolved > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  background: 'var(--pink-dim)',
                  color: 'var(--pink)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {errorStats.unresolved}
              </span>
            )}
          </button>
        </div>

        <div>
          {activeTab === 'activities' && history.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearActivities}>
              Limpar histórico
            </Button>
          )}

          {activeTab === 'diagnostics' && errorLogs.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={handleCopyAllErrors}>
                <Icon name="copy" size={13} />
                Copiar filtrados
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportJson}>
                Exportar JSON
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(true)}>
                Limpar erros
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 48px',
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ======================================================== */}
        {/* TAB 1: ATIVIDADES */}
        {/* ======================================================== */}
        {activeTab === 'activities' && (
          <>
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
                histórico de operações
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
                Registro de Atividades
              </h1>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
                Arquivos gerados e tarefas concluídas com sucesso ou canceladas na máquina.
              </p>
            </div>

            {/* Search & Categories */}
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

            {/* List */}
            {filteredActivities.length === 0 ? (
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
                  As tarefas concluídas de download, documentos, áudio, vídeo, imagem e pôsteres aparecerão aqui.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredActivities.map((item) => {
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
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ERROS E DIAGNÓSTICOS */}
        {/* ======================================================== */}
        {activeTab === 'diagnostics' && (
          <>
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
                central de diagnósticos
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
                Histórico de Erros e Diagnósticos
              </h1>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
                Registro persistente de falhas, causas técnicas e diagnósticos protegidos com sanitização de credenciais.
              </p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>Total de Registros</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fg)', marginTop: 4 }}>
                  {errorStats.total}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--pink)' }}>Falhas Críticas</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--pink)', marginTop: 4 }}>
                  {errorStats.critical}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--amber, #f59e0b)' }}>Não Resolvidos</div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--amber, #f59e0b)',
                    marginTop: 4,
                  }}
                >
                  {errorStats.unresolved}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>Uso do Banco Local</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--fg-dim)',
                    marginTop: 8,
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {(errorStats.databaseSizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  flex: '1 1 200px',
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  gap: 6,
                }}
              >
                <Icon name="search" size={14} style={{ color: 'var(--fg-dim)' }} />
                <input
                  type="text"
                  value={errorSearch}
                  onChange={(e) => setErrorSearch(e.target.value)}
                  placeholder="Pesquisar código, mensagem ou detalhes..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--fg)',
                    fontSize: '12px',
                  }}
                />
              </div>

              {/* Module Filter */}
              <select
                value={errorModule}
                onChange={(e) => setErrorModule(e.target.value)}
                style={{
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '0 8px',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="all">Módulo: Todos</option>
                <option value="documents">Documentos</option>
                <option value="downloads">Downloads</option>
                <option value="audio">Áudio</option>
                <option value="video">Vídeo</option>
                <option value="images">Imagens</option>
                <option value="posters">Pôsteres</option>
                <option value="ui">Interface / Sistema</option>
              </select>

              {/* Severity Filter */}
              <select
                value={errorSeverity}
                onChange={(e) => setErrorSeverity(e.target.value)}
                style={{
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '0 8px',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="all">Severidade: Todas</option>
                <option value="critical">Crítico</option>
                <option value="error">Erro</option>
                <option value="warning">Aviso</option>
                <option value="info">Informativo</option>
              </select>

              {/* Status Filter */}
              <select
                value={errorStatus}
                onChange={(e) => setErrorStatus(e.target.value)}
                style={{
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '0 8px',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="all">Status: Todos</option>
                <option value="unresolved">Não resolvidos</option>
                <option value="resolved">Resolvidos</option>
              </select>

              {/* Period Filter */}
              <select
                value={errorPeriod}
                onChange={(e) => setErrorPeriod(e.target.value)}
                style={{
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '0 8px',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="all">Período: Todo histórico</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>

            {/* Error Cards List */}
            {loadingErrors ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-dim)' }}>
                Carregando registros de diagnóstico...
              </div>
            ) : errorLogs.length === 0 ? (
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
                <Icon name="check" size={36} style={{ color: 'var(--mint)', opacity: 0.6 }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)' }}>
                  Nenhum erro registrado
                </div>
                <div style={{ fontSize: '12.5px', maxWidth: 380 }}>
                  O sistema está operando perfeitamente ou os filtros aplicados não retornaram falhas.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {errorLogs.map((entry) => {
                  const isExpanded = expandedErrorIds.has(entry.id);
                  const isHighlighted = highlightTaskId && entry.taskId === highlightTaskId;

                  const severityColor =
                    entry.severity === 'critical'
                      ? 'var(--pink)'
                      : entry.severity === 'error'
                      ? '#ef4444'
                      : entry.severity === 'warning'
                      ? 'var(--amber, #f59e0b)'
                      : 'var(--mint)';

                  const severityBg =
                    entry.severity === 'critical'
                      ? 'var(--pink-dim)'
                      : entry.severity === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : entry.severity === 'warning'
                      ? 'var(--amber-dim, rgba(245, 158, 11, 0.15))'
                      : 'var(--mint-dim)';

                  return (
                    <div
                      key={entry.id}
                      style={{
                        background: 'var(--surface)',
                        border: isHighlighted
                          ? '2px solid var(--mint)'
                          : '1px solid var(--line)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      {/* Card Header */}
                      <div
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            background: severityBg,
                            color: severityColor,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name={entry.severity === 'warning' ? 'alert' : 'alert'} size={15} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--mono)',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: severityColor,
                                background: severityBg,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {entry.errorCode}
                            </span>

                            <span
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--fg-dim)',
                                textTransform: 'uppercase',
                                fontFamily: 'var(--mono)',
                              }}
                            >
                              {entry.module} · {entry.operation}
                            </span>

                            {entry.status === 'resolved' && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--mint)',
                                  background: 'var(--mint-dim)',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                Resolvido
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--fg)',
                              marginTop: 4,
                            }}
                          >
                            {entry.userMessage}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--fg-faint)', marginTop: 3 }}>
                            {new Date(entry.createdAt).toLocaleString()} · v{entry.appVersion}
                          </div>
                        </div>

                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopySingleError(entry)}
                            title="Copiar texto completo deste erro"
                          >
                            <Icon name="copy" size={13} />
                            Copiar
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleResolve(entry.id, entry.status)}
                            title={entry.status === 'resolved' ? 'Reabrir erro' : 'Marcar como resolvido'}
                          >
                            <Icon name={entry.status === 'resolved' ? 'retry' : 'check'} size={13} />
                          </Button>

                          <button
                            onClick={() => toggleExpand(entry.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--fg-dim)',
                              cursor: 'pointer',
                              padding: 6,
                              display: 'flex',
                            }}
                          >
                            <Icon
                              name="arrow-down"
                              size={14}
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s ease',
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Card Details (Expanded) */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '12px 16px 16px',
                            borderTop: '1px solid var(--line)',
                            background: 'var(--surface-2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {entry.taskId && (
                            <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>
                              <strong>ID da Tarefa:</strong>{' '}
                              <code
                                style={{
                                  fontFamily: 'var(--mono)',
                                  color: 'var(--mint)',
                                  background: 'var(--surface)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {entry.taskId}
                              </code>
                            </div>
                          )}

                          {entry.technicalDetails && (
                            <div>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: 'var(--fg)',
                                  marginBottom: 4,
                                }}
                              >
                                Detalhes Técnicos e Causa Raiz:
                              </div>
                              <pre
                                style={{
                                  fontFamily: 'var(--mono)',
                                  fontSize: '11.5px',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--line)',
                                  borderRadius: 6,
                                  padding: 10,
                                  color: 'var(--fg-dim)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  margin: 0,
                                  maxHeight: 180,
                                  overflowY: 'auto',
                                }}
                              >
                                {entry.technicalDetails}
                              </pre>
                            </div>
                          )}

                          {entry.sanitizedStack && (
                            <div>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: 'var(--fg)',
                                  marginBottom: 4,
                                }}
                              >
                                Rastreamento de Pilha (Sanitizado):
                              </div>
                              <pre
                                style={{
                                  fontFamily: 'var(--mono)',
                                  fontSize: '11px',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--line)',
                                  borderRadius: 6,
                                  padding: 10,
                                  color: 'var(--fg-faint)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  margin: 0,
                                  maxHeight: 180,
                                  overflowY: 'auto',
                                }}
                              >
                                {entry.sanitizedStack}
                              </pre>
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px',
                              color: 'var(--fg-faint)',
                              paddingTop: 4,
                            }}
                          >
                            <span>Origem: {entry.source}</span>
                            {entry.resolvedAt && (
                              <span>
                                Resolvido em: {new Date(entry.resolvedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 420,
                width: '90%',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
                Limpar histórico de diagnósticos?
              </div>
              <div style={{ fontSize: '13px', color: 'var(--fg-dim)', lineHeight: 1.45 }}>
                Esta ação apagará todos os registros de erros armazenados no banco local.
                Recomendamos copiar ou exportar o relatório antes de prosseguir.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" onClick={handleConfirmClearErrors}>
                  Apagar registros
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
