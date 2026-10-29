import React, { useState, useEffect } from 'react';
import { AgentInfo } from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface AiAgentsSettingsProps {
  onShowToast?: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onNavigateToImageStudio?: (prompt: string) => void;
}

export const AiAgentsSettings: React.FC<AiAgentsSettingsProps> = ({
  onShowToast,
  onNavigateToImageStudio,
}) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('codex');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState<string>(
    'Crie uma descrição detalhada e cinematográfica de um comercial de lançamento de café premium artesanal.'
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const data = await TauriService.listAgentEngines();
      setAgents(data);
      const authAgent = data.find((a) => a.auth_status === 'authenticated');
      if (authAgent) {
        setSelectedAgentId(authAgent.id);
        setSelectedModel(authAgent.default_model || authAgent.available_models[0]?.id || '');
      } else if (data.length > 0) {
        setSelectedAgentId(data[0].id);
        setSelectedModel(data[0].default_model || data[0].available_models[0]?.id || '');
      }
    } catch (err: any) {
      console.warn('Erro ao carregar agentes:', err);
      onShowToast?.(`Erro ao detectar agentes: ${err?.message || err}`, 'err');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    const ag = agents.find((a) => a.id === agentId);
    if (ag) {
      setSelectedModel(ag.default_model || ag.available_models[0]?.id || '');
    }
  };

  const handleExecutePrompt = async () => {
    if (!testPrompt.trim()) return;
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      const res = await TauriService.executeAgentPrompt(
        selectedAgentId,
        testPrompt.trim(),
        selectedModel || undefined
      );
      setExecutionOutput(res);
      onShowToast?.('Execução do agente concluída!', 'ok');
    } catch (err: any) {
      console.error('Falha na execução do agente:', err);
      setExecutionOutput(`Erro na execução: ${err?.message || err}`);
      onShowToast?.(`Erro: ${err?.message || err}`, 'err');
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusBadge = (agent: AgentInfo) => {
    switch (agent.auth_status) {
      case 'authenticated':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: 'rgba(21, 245, 186, 0.12)',
              color: 'var(--mint)',
              border: '1px solid rgba(21, 245, 186, 0.3)',
              fontFamily: 'var(--mono, monospace)',
            }}
          >
            ✓ Autenticado ({agent.is_subscription ? 'Assinatura Ativa' : 'Pronto'})
          </span>
        );
      case 'unauthenticated':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontFamily: 'var(--mono, monospace)',
            }}
          >
            ⚠ Requer Login Oficial
          </span>
        );
      case 'not_installed':
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              color: 'var(--muted)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--mono, monospace)',
            }}
          >
            Binário não detectado
          </span>
        );
    }
  };

  const currentAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              Agentes de IA por Assinatura
            </h2>
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
              Mausbot Architecture
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: 4 }}>
            Harness local oficial para OpenAI Codex, Google Antigravity, Claude Code e OpenCode. Conecte assinaturas ativas sem intermediários ou APIs pagas avulsas.
          </div>
        </div>

        <Button size="sm" variant="secondary" onClick={loadAgents} disabled={isLoading}>
          <Icon name="refresh" size={13} /> {isLoading ? 'Detectando...' : 'Reescanear Agentes'}
        </Button>
      </div>

      {/* Agents Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {agents.map((ag) => {
          const isSelected = ag.id === selectedAgentId;
          return (
            <div
              key={ag.id}
              onClick={() => handleAgentSelect(ag.id)}
              style={{
                borderRadius: 8,
                border: isSelected ? '2px solid var(--mint)' : '1px solid var(--line)',
                backgroundColor: isSelected ? 'rgba(21, 245, 186, 0.04)' : 'var(--surface-2, rgba(20, 26, 28, 0.6))',
                padding: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{ag.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)', marginTop: 2 }}>
                    {ag.version || (ag.binary_path ? 'Instalado' : 'Não encontrado')}
                  </div>
                </div>
                {getStatusBadge(ag)}
              </div>

              {ag.account_info && (
                <div style={{ fontSize: 11, color: 'var(--fg-dim)', backgroundColor: 'var(--bg)', padding: '4px 8px', borderRadius: 4 }}>
                  {ag.account_info}
                </div>
              )}

              {ag.auth_status === 'unauthenticated' && ag.binary_path && (
                <div style={{ fontSize: 11, color: '#F59E0B', lineHeight: 1.3 }}>
                  Execute no terminal: <code style={{ color: 'var(--fg)', fontFamily: 'var(--mono, monospace)' }}>{ag.id === 'codex' ? 'codex login' : ag.id === 'antigravity' ? 'agy login' : 'claude login'}</code>
                </div>
              )}

              {ag.available_models.length > 0 && (
                <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--mono, monospace)', marginBottom: 4 }}>
                    Modelos Ativos:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ag.available_models.map((m) => (
                      <span
                        key={m.id}
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 3,
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--line)',
                          color: 'var(--fg-dim)',
                          fontFamily: 'var(--mono, monospace)',
                        }}
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Agent Task Runner */}
      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
            Terminal de Validação Direta com Agente
          </div>

          {currentAgent && currentAgent.available_models.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Modelo:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  height: 28,
                  padding: '0 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 11,
                  fontFamily: 'var(--mono, monospace)',
                }}
              >
                {currentAgent.available_models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={2}
            placeholder="Digite uma instrução ou prompt criativo para executar no harness local..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              fontSize: 12,
              lineHeight: 1.4,
              fontFamily: 'Geist, sans-serif',
              resize: 'vertical',
            }}
          />

          <Button
            size="sm"
            variant="primary"
            onClick={handleExecutePrompt}
            disabled={isExecuting || !testPrompt.trim() || currentAgent?.auth_status !== 'authenticated'}
            style={{ alignSelf: 'flex-start', height: 36 }}
          >
            {isExecuting ? 'Executando...' : 'Executar no Agente'}
          </Button>
        </div>

        {currentAgent?.auth_status !== 'authenticated' && (
          <div style={{ fontSize: 11, color: '#F59E0B' }}>
            ℹ O agente selecionado ({currentAgent?.name || 'Agente'}) precisa estar autenticado no sistema para executar tarefas diretamente.
          </div>
        )}

        {/* Execution Output */}
        {executionOutput && (
          <div
            style={{
              backgroundColor: '#050708',
              borderRadius: 8,
              border: '1px solid var(--line)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--mint)', fontFamily: 'var(--mono, monospace)' }}>
                RESPOSTA DO AGENTE ({selectedAgentId} · {selectedModel || 'default'})
              </span>
              {onNavigateToImageStudio && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigateToImageStudio(executionOutput)}
                  style={{ height: 24, fontSize: 11 }}
                >
                  Usar no AI Image Studio →
                </Button>
              )}
            </div>

            <pre
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--fg)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 240,
                overflowY: 'auto',
                fontFamily: 'var(--mono, monospace)',
                lineHeight: 1.5,
              }}
            >
              {executionOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
