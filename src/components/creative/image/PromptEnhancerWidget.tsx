import React, { useState, useEffect } from 'react';
import { AgentInfo, EnhancePromptResult, ProcessedReference } from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface PromptEnhancerWidgetProps {
  currentPrompt: string;
  references?: ProcessedReference[];
  onApplyPrompt: (enhancedPrompt: string, recommendedStyle?: string, recommendedRatio?: string) => void;
  onShowToast?: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const PromptEnhancerWidget: React.FC<PromptEnhancerWidgetProps> = ({
  currentPrompt,
  references = [],
  onApplyPrompt,
  onShowToast,
}) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('codex');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [result, setResult] = useState<EnhancePromptResult | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    TauriService.listAgentEngines()
      .then((data) => {
        if (!isMounted) return;
        setAgents(data);
        const authenticatedAgent = data.find((a) => a.auth_status === 'authenticated');
        if (authenticatedAgent) {
          setSelectedAgentId(authenticatedAgent.id);
          setSelectedModel(authenticatedAgent.default_model || authenticatedAgent.available_models[0]?.id || '');
        } else if (data.length > 0) {
          setSelectedAgentId(data[0].id);
          setSelectedModel(data[0].default_model || data[0].available_models[0]?.id || '');
        }
      })
      .catch((err) => {
        console.warn('Erro ao listar agentes de IA:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeAgent = agents.find((a) => a.id === selectedAgentId);

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    const target = agents.find((a) => a.id === agentId);
    if (target) {
      setSelectedModel(target.default_model || target.available_models[0]?.id || '');
    }
  };

  const handleEnhance = async () => {
    if (!currentPrompt.trim()) {
      onShowToast?.('Digite uma descrição ou ideia de imagem para aprimorar', 'warn');
      return;
    }

    setIsEnhancing(true);
    setResult(null);

    try {
      const res = await TauriService.enhanceImagePrompt(
        currentPrompt,
        selectedAgentId,
        selectedModel || undefined,
        references
      );
      setResult(res);
      setIsExpanded(true);
      onShowToast?.(`Prompt enriquecido com sucesso via ${activeAgent?.name || 'Agente'}!`, 'ok');
    } catch (err: any) {
      console.error('Falha ao enriquecer prompt:', err);
      onShowToast?.(`Falha ao enriquecer: ${err?.message || err}`, 'err');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line)',
        backgroundColor: 'var(--surface-2, rgba(20, 26, 28, 0.6))',
        padding: '12px 14px',
        marginTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="sparkles" size={14} />
            Direção de Arte com Agente
          </span>

          <select
            value={selectedAgentId}
            onChange={(e) => handleAgentChange(e.target.value)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 5,
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              fontSize: 12,
              fontFamily: 'Geist, sans-serif',
            }}
          >
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name} {ag.auth_status === 'authenticated' ? '✓ (Assinatura)' : ag.binary_path ? '⚠ (Não autenticado)' : '✗ (Não instalado)'}
              </option>
            ))}
          </select>

          {activeAgent && activeAgent.available_models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 5,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                fontSize: 11,
                fontFamily: 'var(--mono, monospace)',
              }}
            >
              {activeAgent.available_models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          {references.length > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: 'rgba(21, 245, 186, 0.1)',
                border: '1px solid rgba(21, 245, 186, 0.3)',
                color: 'var(--mint)',
                fontFamily: 'var(--mono, monospace)',
              }}
            >
              📎 {references.length} ref{references.length > 1 ? 's' : ''} vinculada{references.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          disabled={isEnhancing || !currentPrompt.trim()}
          onClick={handleEnhance}
          style={{ height: 28, fontSize: 12 }}
        >
          {isEnhancing ? 'Otimizando com IA...' : '✨ Aprimorar com Agente'}
        </Button>
      </div>

      {result && isExpanded && (
        <div
          style={{
            marginTop: 6,
            padding: 12,
            backgroundColor: 'var(--bg)',
            border: '1px solid rgba(21, 245, 186, 0.3)',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--mint)', fontFamily: 'var(--mono, monospace)', fontWeight: 600 }}>
              PROMPT OTIMIZADO ({result.agent_id} · {result.model})
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
            >
              Recolher
            </button>
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--fg)',
              lineHeight: 1.5,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--line)',
              fontStyle: 'italic',
            }}
          >
            "{result.enhanced_prompt}"
          </div>

          {result.reasoning && (
            <div style={{ fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.4 }}>
              <strong>Raciocínio Criativo:</strong> {result.reasoning}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
              {result.recommended_style && <span>Estilo: <strong style={{ color: 'var(--fg)' }}>{result.recommended_style}</strong></span>}
              {result.recommended_ratio && <span>Proporção: <strong style={{ color: 'var(--fg)' }}>{result.recommended_ratio}</strong></span>}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onApplyPrompt(result.enhanced_prompt, result.recommended_style || undefined, result.recommended_ratio || undefined)}
              style={{ height: 26, fontSize: 11 }}
            >
              ✓ Aplicar ao Campo de Prompt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
