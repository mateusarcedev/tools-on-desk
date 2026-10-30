import React, { useState, useCallback } from 'react';
import {
  MotionDirectorPlan,
  ScenePlan,
  MotionComposition,
  MotionLayer,
  MotionBriefing,
  ReferenceInput,
  CreativeSkill,
} from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';
import { MotionPlayer } from './MotionPlayer';
import { BriefingAssistant } from '../../creative/generative/BriefingAssistant';
import { StoryboardApprover, StoryboardScene } from '../../creative/generative/StoryboardApprover';

export interface MotionStudioFlowProps {
  skills: CreativeSkill[];
  onProjectCreated?: (projectId: string) => void;
}

type FlowStep = 'briefing' | 'plan' | 'storyboard' | 'composition' | 'preview';

interface MotionStudioState {
  currentStep: FlowStep;
  briefing: MotionBriefing | null;
  plan: MotionDirectorPlan | null;
  editedPlan: MotionDirectorPlan | null;
  approvedScenes: Set<string>;
  composition: MotionComposition | null;
  isGenerating: boolean;
  error: string | null;
  referenceFiles: ReferenceInput[];
}

const initialBriefing: MotionBriefing = {
  prompt: '',
  project_type: 'advertising',
  style: 'Publicitário',
  aspect_ratio: '16:9',
  references: [],
};

const projectTypes = [
  { id: 'advertising', label: 'Publicidade', desc: 'Anúncios de alta conversão' },
  { id: 'product', label: 'Lançamento de Produto', desc: 'Apresentação cinematográfica' },
  { id: 'reels', label: 'Reels / Stories', desc: 'Vertical 9:16 para redes sociais' },
  { id: 'brand', label: 'Animação de Logo', desc: 'Identidade visual animada' },
  { id: 'explainer', label: 'Explicativo / Demo', desc: 'Passo a passo educativo' },
  { id: 'institutional', label: 'Institucional', desc: 'Corporativo e profissional' },
];

const styles = [
  'Publicitário',
  'Cinematográfico',
  'Minimalista',
  'Tecnológico',
  'Editorial',
  'Ilustração',
  '3D',
  'Produto',
];

const aspectRatios = [
  { id: '16:9', label: '16:9', desc: 'Horizontal (YouTube, Web)' },
  { id: '9:16', label: '9:16', desc: 'Vertical (Reels, TikTok)' },
  { id: '1:1', label: '1:1', desc: 'Quadrado (Feed, Ads)' },
  { id: '4:3', label: '4:3', desc: 'Clássico' },
  { id: '21:9', label: '21:9', desc: 'Cinemascope' },
];

export const MotionStudioFlow: React.FC<MotionStudioFlowProps> = ({ skills, onProjectCreated }) => {
  const [state, setState] = useState<MotionStudioState>({
    currentStep: 'briefing',
    briefing: null,
    plan: null,
    editedPlan: null,
    approvedScenes: new Set(),
    composition: null,
    isGenerating: false,
    error: null,
    referenceFiles: [],
  });

  const [briefingOpen, setBriefingOpen] = useState(false);

  // Step 1: Briefing
  const handleBriefingComplete = useCallback((briefingData: { prompt: string; style: string; aspectRatio: string; recommendedSkills: string[] }) => {
    const enabledSkillIds = skills.filter(s => s.enabled).map(s => s.id);
    const briefing: MotionBriefing = {
      prompt: briefingData.prompt,
      project_type: initialBriefing.project_type,
      style: briefingData.style,
      duration_sec: 20,
      fps: 30,
      aspect_ratio: briefingData.aspectRatio,
      platform: 'web',
      audience: 'Público geral',
      brand_identity: 'ToolsOnDesk - Verde Menta #15F5BA, Grafite #0B0F10',
      references: state.referenceFiles,
    };
    setState(prev => ({ ...prev, briefing, currentStep: 'plan' }));
    setBriefingOpen(false);
    generatePlan(briefing, enabledSkillIds);
  }, [state.referenceFiles, skills]);

  // Generate plan from briefing
  const generatePlan = async (briefing: MotionBriefing, _skillIds: string[]) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const plan = await TauriService.generateMotionPlan(briefing);
      setState(prev => ({ 
        ...prev, 
        plan, 
        editedPlan: JSON.parse(JSON.stringify(plan)), // Deep clone for editing
        isGenerating: false,
        currentStep: 'plan',
      }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: err?.message || 'Erro ao gerar plano criativo' 
      }));
    }
  };

  const updateScene = useCallback((sceneId: string, updates: Partial<ScenePlan>) => {
    setState(prev => {
      if (!prev.editedPlan) return prev;
      return {
        ...prev,
        editedPlan: {
          ...prev.editedPlan,
          scenes: prev.editedPlan.scenes.map(s => 
            s.id === sceneId ? { ...s, ...updates } : s
          ),
        },
      };
    });
  }, []);

  const handlePlanApprove = useCallback(() => {
    if (state.editedPlan) {
      setState(prev => ({ 
        ...prev, 
        plan: prev.editedPlan,
        currentStep: 'storyboard',
        approvedScenes: new Set(),
      }));
    }
  }, [state.editedPlan]);

  // Step 3: Storyboard - Approve individual scenes
  const handleSceneApprove = useCallback((sceneId: string) => {
    setState(prev => {
      const newApproved = new Set(prev.approvedScenes);
      if (newApproved.has(sceneId)) {
        newApproved.delete(sceneId);
      } else {
        newApproved.add(sceneId);
      }
      return { ...prev, approvedScenes: newApproved };
    });
  }, []);

  const handleSceneEdit = useCallback((scene: StoryboardScene) => {
    // Convert StoryboardScene back to ScenePlan and open edit modal
    const scenePlan = state.editedPlan?.scenes.find(s => s.id === scene.id);
    if (scenePlan) {
      // For now, just allow editing title and duration
      const newTitle = prompt('Editar título da cena:', scenePlan.title);
      if (newTitle) {
        updateScene(scene.id, { title: newTitle });
      }
    }
  }, [state.editedPlan, updateScene]);

  const handleStoryboardComplete = useCallback(() => {
    if (state.editedPlan && state.approvedScenes.size > 0) {
      // Convert plan to composition
      convertToComposition();
    }
  }, [state.editedPlan, state.approvedScenes.size]);

  // Convert plan to composition
  const convertToComposition = async () => {
    if (!state.editedPlan) return;
    try {
      const planJson = JSON.stringify(state.editedPlan);
      const compositionJson = await TauriService.convertPlanToComposition(planJson);
      const composition: MotionComposition = JSON.parse(compositionJson);
      setState(prev => ({ 
        ...prev, 
        composition,
        currentStep: 'composition',
      }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err?.message || 'Erro ao converter para composição' 
      }));
    }
  };

  // Step 4: Composition - Edit layers, timing, animations
  const updateComposition = useCallback((updates: Partial<MotionComposition>) => {
    setState(prev => ({ 
      ...prev, 
      composition: prev.composition ? { ...prev.composition, ...updates } : null 
    }));
  }, []);

  const updateLayer = useCallback((sceneId: string, layerId: string, updates: Partial<MotionLayer>) => {
    setState(prev => {
      if (!prev.composition) return prev;
      return {
        ...prev,
        composition: {
          ...prev.composition,
          scenes: prev.composition.scenes.map(scene => 
            scene.id === sceneId 
              ? { 
                  ...scene, 
                  layers: scene.layers.map(layer => 
                    layer.id === layerId 
                      ? { ...layer, ...updates } 
                      : layer 
                  ) 
                }
              : scene
          ),
        },
      };
    });
  }, []);

  const handleCompositionComplete = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'preview' }));
  }, []);

  // Step 5: Preview and Render
  const handleRenderMp4 = async () => {
    if (!state.composition) return;
    try {
      const filename = `motion_${Date.now()}.mp4`;
      const path = await TauriService.renderMotionProject({
        composition_json: JSON.stringify(state.composition),
        output_filename: filename,
        format: 'mp4',
        quality: 'high',
      });
      alert(`Vídeo renderizado com sucesso: ${path}`);
      // Create project record
      const project = await TauriService.createCreativeProject({
        title: state.editedPlan?.project.title || 'Motion Project',
        project_type: 'motion',
        aspect_ratio: state.briefing?.aspect_ratio || '16:9',
        width: state.composition.width,
        height: state.composition.height,
        fps: state.composition.fps,
        duration_sec: state.composition.duration_sec,
        prompt: state.briefing?.prompt,
        style: state.briefing?.style,
        model: 'motion-director',
        skills_used: skills.filter(s => s.enabled).map(s => s.id),
        data_json: JSON.stringify(state.composition),
      });
      if (onProjectCreated) onProjectCreated(project.id);
    } catch (err: any) {
      alert(`Falha ao renderizar: ${err?.message || err}`);
    }
  };

  const handleExportRemotion = async () => {
    if (!state.composition) return;
    try {
      const tsx = await TauriService.exportRemotionProject(JSON.stringify(state.composition));
      navigator.clipboard.writeText(tsx);
      alert('Código TSX Remotion copiado para a área de transferência!');
    } catch (err: any) {
      alert(`Erro ao exportar TSX: ${err?.message || err}`);
    }
  };

  // Render step content
  const renderStep = () => {
    switch (state.currentStep) {
      case 'briefing':
        return renderBriefingStep();
      case 'plan':
        return renderPlanStep();
      case 'storyboard':
        return renderStoryboardStep();
      case 'composition':
        return renderCompositionStep();
      case 'preview':
        return renderPreviewStep();
    }
  };

  const renderBriefingStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ 
        borderRadius: 16, 
        border: '1px solid var(--line)', 
        background: 'linear-gradient(135deg, rgba(20, 26, 28, 0.9) 0%, rgba(11, 15, 16, 0.9) 100%)',
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ 
          width: 64, 
          height: 64, 
          borderRadius: 16, 
          backgroundColor: 'rgba(21, 245, 186, 0.15)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'var(--mint)',
          margin: '0 auto 20px',
        }}>
          <Icon name="film" size={32} />
        </div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: 28, fontWeight: 700 }}>Crie Motion Design Profissional</h2>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          Descreva sua ideia e a IA estruturará um plano completo com cenas, camadas, animações e transições.
          Você aprova cada etapa antes de renderizar.
        </p>
      </div>

      {/* Quick Start Templates */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Início Rápido</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {projectTypes.map(pt => (
            <button
              key={pt.id}
              type="button"
              onClick={() => {
                setState(prev => ({ 
                  ...prev, 
                  briefing: { ...initialBriefing, project_type: pt.id },
                }));
              }}
              style={{
                padding: '16px',
                borderRadius: 10,
                border: state.briefing?.project_type === pt.id ? '2px solid var(--mint)' : '1px solid var(--line)',
                backgroundColor: state.briefing?.project_type === pt.id ? 'rgba(21, 245, 186, 0.05)' : 'var(--surface)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: state.briefing?.project_type === pt.id ? 'var(--mint)' : 'var(--fg)' }}>
                {pt.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Briefing Form */}
      <div style={{ 
        backgroundColor: 'var(--surface)', 
        borderRadius: 12, 
        border: '1px solid var(--line)', 
        padding: 24,
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Briefing Personalizado</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--fg)' }}>
              Descrição do Vídeo <span style={{ color: 'var(--mint)' }}>*</span>
            </label>
            <textarea
              value={state.briefing?.prompt || ''}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                briefing: prev.briefing ? { ...prev.briefing, prompt: e.target.value } : null 
              }))}
              placeholder="Ex: Crie um vídeo publicitário de 20s para o ToolsOnDesk. Apresente a interface real, destaque ferramentas criativas e produtividade, use identidade visual verde-menta e grafite, finalize com logo animado."
              rows={4}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'Geist, sans-serif',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--muted)' }}>
                Tipo de Projeto
              </label>
              <select
                value={state.briefing?.project_type || 'advertising'}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  briefing: prev.briefing ? { ...prev.briefing, project_type: e.target.value } : null 
                }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              >
                {projectTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--muted)' }}>
                Estilo Visual
              </label>
              <select
                value={state.briefing?.style || 'Publicitário'}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  briefing: prev.briefing ? { ...prev.briefing, style: e.target.value } : null 
                }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              >
                {styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--muted)' }}>
                Proporção
              </label>
              <select
                value={state.briefing?.aspect_ratio || '16:9'}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  briefing: prev.briefing ? { ...prev.briefing, aspect_ratio: e.target.value } : null 
                }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              >
                {aspectRatios.map(ar => <option key={ar.id} value={ar.id}>{ar.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--muted)' }}>
                Duração (segundos)
              </label>
              <input
                type="number"
                value={state.briefing?.duration_sec || 20}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  briefing: prev.briefing ? { ...prev.briefing, duration_sec: parseFloat(e.target.value) } : null 
                }))}
                min={3}
                max={60}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Reference Files */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--fg)' }}>
              <span>Arquivos de Referência</span>
              <Button variant="ghost" size="sm" onClick={() => { /* TODO: open file picker */ }}>
                <Icon name="plus" size={14} /> Adicionar
              </Button>
            </label>
            {state.referenceFiles.length === 0 ? (
              <div style={{ 
                padding: 20, 
                borderRadius: 8, 
                border: '1px dashed var(--line)', 
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13,
              }}>
                Nenhuma referência anexada. Imagens, screenshots e PDFs podem guiar a IA.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.referenceFiles.map(ref => (
                  <span key={ref.id} style={{ 
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    backgroundColor: 'var(--bg)', 
                    border: '1px solid var(--line)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {ref.file_name}
                    <button onClick={() => setState(prev => ({ 
                      ...prev, 
                      referenceFiles: prev.referenceFiles.filter(r => r.id !== ref.id) 
                    }))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button 
              variant="primary" 
              size="md"
              onClick={() => setBriefingOpen(true)}
              disabled={state.isGenerating || !state.briefing?.prompt?.trim()}
            >
              <Icon name="sparkles" size={18} /> 
              {state.isGenerating ? 'Gerando Plano...' : 'Criar Storyboard com IA'}
            </Button>
          </div>
        </div>
      </div>

      {/* Briefing Assistant Modal */}
      {briefingOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <BriefingAssistant
            onCancel={() => setBriefingOpen(false)}
            onComplete={handleBriefingComplete}
          />
        </div>
      )}
    </div>
  );

  const renderPlanStep = () => {
    if (!state.editedPlan) return <div>Carregando plano...</div>;
    
    const plan = state.editedPlan;
    const totalDuration = plan.scenes.reduce((acc, s) => acc + s.duration_sec, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
        {/* Plan Header */}
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          borderRadius: 12, 
          border: '1px solid var(--line)', 
          padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700 }}>{plan.project.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{plan.project.concept}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--font-mono, monospace)' }}>
                {plan.project.width}×{plan.project.height}
              </span>
              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--font-mono, monospace)' }}>
                {plan.project.fps} fps
              </span>
              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--font-mono, monospace)' }}>
                {totalDuration.toFixed(1)}s
              </span>
              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, backgroundColor: 'rgba(21, 245, 186, 0.1)', border: '1px solid var(--mint)', color: 'var(--mint)', fontFamily: 'var(--font-mono, monospace)' }}>
                {plan.scenes.length} cenas
              </span>
            </div>
          </div>
        </div>

        {/* Project Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direção de Arte</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Estilo</span>
                <span style={{ fontWeight: 500 }}>{plan.project.style}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Fundo</span>
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>{plan.project.background_color}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.project.color_palette.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: c }} />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipografia</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Primária</span>
                <span style={{ fontWeight: 500 }}>{plan.project.typography.primary_font}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Secundária</span>
                <span style={{ fontWeight: 500 }}>{plan.project.typography.secondary_font}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Tamanho Título</span>
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>{plan.project.typography.heading_size}px</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Tamanho Corpo</span>
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>{plan.project.typography.body_size}px</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Acento</span>
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>{plan.project.typography.accent_color}</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills & Metadados</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Gerador</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{plan.metadata.generator}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Skills</span>
                <span style={{ fontWeight: 500 }}>{plan.metadata.skills_used.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Referências</span>
                <span style={{ fontWeight: 500 }}>{plan.metadata.references_used.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Versão</span>
                <span style={{ fontWeight: 500 }}>{plan.metadata.version}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scenes List - Editable */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Cenas do Plano ({plan.scenes.length})</h4>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)' }}>
              Clique em uma cena para editar
            </span>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {plan.scenes.map((scene, idx) => (
              <div
                key={scene.id}
                style={{ 
                  padding: '16px 20px', 
                  borderBottom: idx < plan.scenes.length - 1 ? '1px solid var(--line)' : 'none',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ 
                    backgroundColor: 'rgba(21, 245, 186, 0.1)', 
                    color: 'var(--mint)', 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    fontSize: 11, 
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    Cena {scene.order}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{scene.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {scene.duration_sec.toFixed(1)}s
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 200 }}>{scene.description}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--line)',
                        color: 'var(--fg)',
                        fontSize: 13,
                        width: 200,
                      }}
                    />
                    <input
                      type="number"
                      value={scene.duration_sec}
                      onChange={(e) => updateScene(scene.id, { duration_sec: parseFloat(e.target.value) })}
                      step={0.5}
                      min={1}
                      max={30}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--line)',
                        color: 'var(--fg)',
                        fontSize: 13,
                        width: 80,
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>camadas: {scene.layers.length}</span>
                  </div>
                </div>
                {scene.camera_movement && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="camera" size={12} />
                    <span>Câmera: {scene.camera_movement}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={() => setState(prev => ({ ...prev, currentStep: 'briefing' }))}>
            ← Voltar ao Briefing
          </Button>
          <Button variant="primary" size="md" onClick={handlePlanApprove} disabled={state.isGenerating}>
            <Icon name="check" size={16} /> Aprovar Plano e Ir para Storyboard
          </Button>
        </div>
      </div>
    );
  };

  const renderStoryboardStep = () => {
    if (!state.editedPlan) return <div>Carregando...</div>;

    const storyboardScenes: StoryboardScene[] = state.editedPlan.scenes.map(s => ({
      id: s.id,
      order: s.order,
      title: s.title,
      durationSec: s.duration_sec,
      scriptText: s.layers.find(l => l.layer_type === 'text')?.content || s.description,
      visualCue: s.visual_cue,
      cameraMovement: s.camera_movement || 'Nenhum',
      approved: state.approvedScenes.has(s.id),
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Aprovação do Storyboard</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {state.approvedScenes.size} de {storyboardScenes.length} cenas aprovadas
          </div>
        </div>

        <StoryboardApprover
          scenes={storyboardScenes}
          onToggleApprove={handleSceneApprove}
          onEditScene={handleSceneEdit}
          onApproveAll={() => {
            const allIds = new Set(storyboardScenes.map(s => s.id));
            setState(prev => ({ ...prev, approvedScenes: allIds }));
          }}
          onRenderVideo={handleStoryboardComplete}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={() => setState(prev => ({ ...prev, currentStep: 'plan' }))}>
            ← Voltar ao Plano
          </Button>
          <Button 
            variant="primary" 
            size="md" 
            onClick={handleStoryboardComplete}
            disabled={state.approvedScenes.size === 0}
          >
            <Icon name="forward" size={16} /> Converter para Composição
          </Button>
        </div>
      </div>
    );
  };

  const renderCompositionStep = () => {
    if (!state.composition) return <div>Convertendo para composição...</div>;

    const comp = state.composition;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, maxWidth: 1300, margin: '0 auto' }}>
        {/* Main Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ 
            backgroundColor: 'var(--surface)', 
            borderRadius: 12, 
            border: '1px solid var(--line)', 
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 8, 
                backgroundColor: 'rgba(21, 245, 186, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--mint)',
              }}>
                <Icon name="layers" size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600 }}>{comp.title}</h4>
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 16, fontFamily: 'var(--font-mono, monospace)' }}>
                  <span>{comp.width} × {comp.height}</span>
                  <span>{comp.fps} fps</span>
                  <span>{comp.duration_sec.toFixed(1)}s</span>
                  <span>{comp.scenes.length} cenas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Composition Player */}
          <MotionPlayer
            composition={comp}
            onExportMp4={handleRenderMp4}
            onExportRemotion={handleExportRemotion}
          />

          {/* Scenes & Layers Inspector */}
          <div style={{ 
            backgroundColor: 'var(--surface)', 
            borderRadius: 12, 
            border: '1px solid var(--line)', 
            padding: 16,
            maxHeight: 300,
            overflowY: 'auto',
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Inspector de Camadas</h4>
            {comp.scenes.map(scene => (
              <div key={scene.id} style={{ marginBottom: 16 }}>
                <div style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: 'var(--mint)', 
                  marginBottom: 8,
                  fontFamily: 'var(--font-mono, monospace)',
                }}>
                  {scene.title} ({scene.duration_sec.toFixed(1)}s) - {scene.layers.length} camadas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scene.layers.map(layer => (
                    <div
                      key={layer.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 4, 
                        backgroundColor: layer.color || 'var(--mint)',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {layer.name} ({layer.layer_type})
                        </div>
                        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {layer.start_time.toFixed(1)}s → { (layer.start_time + layer.duration_sec).toFixed(1)}s
                          {layer.animation && ` • ${layer.animation.effect} (${layer.animation.easing})`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="number"
                          value={layer.x}
                          onChange={(e) => updateLayer(scene.id, layer.id, { x: parseFloat(e.target.value) })}
                          step={0.01}
                          min={0}
                          max={1}
                          style={{ width: 50, padding: '2px 6px', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          title="X"
                        />
                        <input
                          type="number"
                          value={layer.y}
                          onChange={(e) => updateLayer(scene.id, layer.id, { y: parseFloat(e.target.value) })}
                          step={0.01}
                          min={0}
                          max={1}
                          style={{ width: 50, padding: '2px 6px', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          title="Y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ 
            backgroundColor: 'var(--surface)', 
            borderRadius: 10, 
            border: '1px solid var(--line)', 
            padding: 16,
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Propriedades da Composição</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Título</label>
                <input
                  value={comp.title}
                  onChange={(e) => updateComposition({ title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Largura</label>
                  <input
                    type="number"
                    value={comp.width}
                    onChange={(e) => updateComposition({ width: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Altura</label>
                  <input
                    type="number"
                    value={comp.height}
                    onChange={(e) => updateComposition({ height: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>FPS</label>
                  <input
                    type="number"
                    value={comp.fps}
                    onChange={(e) => updateComposition({ fps: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Duração (s)</label>
                  <input
                    type="number"
                    value={comp.duration_sec}
                    onChange={(e) => updateComposition({ duration_sec: parseFloat(e.target.value) })}
                    step={0.1}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Cor de Fundo</label>
                <input
                  type="color"
                  value={comp.background_color}
                  onChange={(e) => updateComposition({ background_color: e.target.value })}
                  style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid var(--line)', backgroundColor: 'var(--bg)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'var(--surface)', 
            borderRadius: 10, 
            border: '1px solid var(--line)', 
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600 }}>Ações</h4>
            <Button variant="primary" onClick={handleRenderMp4} style={{ width: '100%' }}>
              <Icon name="video" size={16} /> Renderizar MP4
            </Button>
            <Button variant="secondary" onClick={handleExportRemotion} style={{ width: '100%' }}>
              <Icon name="code" size={16} /> Exportar TSX (Remotion)
            </Button>
            <Button variant="ghost" onClick={handleCompositionComplete} style={{ width: '100%' }}>
              <Icon name="play" size={16} /> Preview Final
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewStep = () => {
    if (!state.composition) return <div>Carregando...</div>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Preview Final & Exportação</h3>
        </div>

        <MotionPlayer
          composition={state.composition}
          onExportMp4={handleRenderMp4}
          onExportRemotion={handleExportRemotion}
        />

        <div style={{ 
          backgroundColor: 'var(--surface)', 
          borderRadius: 12, 
          border: '1px solid var(--line)', 
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Exportar Projeto</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" size="md" onClick={handleRenderMp4}>
              <Icon name="video" size={16} /> Renderizar MP4 (FFmpeg)
            </Button>
            <Button variant="secondary" size="md" onClick={handleExportRemotion}>
              <Icon name="code" size={16} /> Exportar .tsx (Remotion)
            </Button>
            <Button variant="ghost" size="md" onClick={() => setState(prev => ({ ...prev, currentStep: 'composition' }))}>
              <Icon name="edit" size={16} /> Voltar para Edição
            </Button>
          </div>
          <div style={{ 
            padding: 12, 
            borderRadius: 8, 
            backgroundColor: 'rgba(21, 245, 186, 0.05)', 
            border: '1px dashed var(--mint)',
            fontSize: 12,
            color: 'var(--mint)',
          }}>
            <strong>Dica:</strong> O MP4 é renderizado 100% local via FFmpeg (sem custos de nuvem). 
            O .tsx pode ser importado em projetos Remotion/React para edição avançada por desenvolvedores.
          </div>
        </div>
      </div>
    );
  };

  // Progress indicator
  const steps: { id: FlowStep; label: string; icon: string }[] = [
    { id: 'briefing', label: 'Briefing', icon: 'pen-tool' },
    { id: 'plan', label: 'Plano', icon: 'file-text' },
    { id: 'storyboard', label: 'Storyboard', icon: 'layout' },
    { id: 'composition', label: 'Composição', icon: 'layers' },
    { id: 'preview', label: 'Preview', icon: 'play' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === state.currentStep);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Progress Bar */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid var(--line)', 
        backgroundColor: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {steps.map((step, idx) => (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                backgroundColor: idx <= currentStepIndex ? 'var(--mint)' : 'var(--bg)',
                border: '2px solid',
                borderColor: idx <= currentStepIndex ? 'var(--mint)' : 'var(--line)',
                color: idx <= currentStepIndex ? '#0B0F10' : 'var(--muted)',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                transition: 'all 200ms ease',
              }}>
                <Icon name={step.icon as any} size={18} />
              </div>
              <span style={{ 
                fontSize: 11, 
                fontWeight: idx <= currentStepIndex ? 600 : 400,
                color: idx <= currentStepIndex ? 'var(--fg)' : 'var(--muted)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {state.error && (
        <div style={{ 
          margin: 16, 
          padding: '12px 16px', 
          borderRadius: 8, 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{state.error}</span>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {renderStep()}
      </div>
    </div>
  );
};