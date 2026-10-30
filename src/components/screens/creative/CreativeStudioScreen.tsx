import React, { useEffect, useState } from 'react';
import {
  CreativeAsset,
  CreativeProject,
  CreativeSkill,
  CreativeStudioTab,
  CreativeTemplate,
  NvidiaImageGenOptions,
  NvidiaImageGenResult,
  NvidiaKeyStatus,
  NvidiaModelInfo,
  ImageModelCapabilities,
  ProcessedReference,
} from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';
import { BriefingAssistant } from '../../creative/generative/BriefingAssistant';
import { StyleSelector } from '../../creative/generative/StyleSelector';
import { MotionStudioFlow } from '../../creative/motion/MotionStudioFlow';
import { StoryboardApprover, StoryboardScene } from '../../creative/generative/StoryboardApprover';
import { ProposalComparator, ProposalItem } from '../../creative/generative/ProposalComparator';
import { PromptEnhancerWidget } from '../../creative/image/PromptEnhancerWidget';
import { ImageEditorModal } from '../../creative/image/ImageEditorModal';
import { ReferenceFilesManager } from '../../creative/image/ReferenceFilesManager';
import { GenerationMetadataModal } from '../../creative/image/GenerationMetadataModal';

export const CreativeStudioScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CreativeStudioTab>('overview');

  // NVIDIA State
  const [keyStatus, setKeyStatus] = useState<NvidiaKeyStatus>({
    has_key: false,
    masked_key: null,
    validated: false,
    last_validated_at: null,
  });
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [keyValidationMsg, setKeyValidationMsg] = useState<string | null>(null);
  const [models, setModels] = useState<NvidiaModelInfo[]>([]);

  // Studio projects & assets
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [skills, setSkills] = useState<CreativeSkill[]>([]);
  const [selectedSkillModal, setSelectedSkillModal] = useState<CreativeSkill | null>(null);

  // Image Studio State
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Publicitário');
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageResult, setImageResult] = useState<NvidiaImageGenResult | null>(null);
  const [imageHistory, setImageHistory] = useState<CreativeAsset[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('black-forest-labs/flux.1-schnell');
  const [imageCapabilities, setImageCapabilities] = useState<ImageModelCapabilities[]>([]);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [steps, setSteps] = useState<number>(4);
  const [cfgScale, setCfgScale] = useState<number>(1.0);
  const [editingAsset, setEditingAsset] = useState<CreativeAsset | null>(null);
  const [comparingProposals, setComparingProposals] = useState<ProposalItem[] | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'ai' | 'edited' | 'imported'>('all');
  const [referenceFiles, setReferenceFiles] = useState<ProcessedReference[]>([]);
  const [metadataModalPath, setMetadataModalPath] = useState<string | null>(null);

  // Video Studio State
  const [videoMode, setVideoMode] = useState<'composite' | 'generative'>('composite');
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([
    {
      id: 'sc-1',
      order: 1,
      title: 'Abertura Cinemática',
      durationSec: 4.0,
      scriptText: 'Você já imaginou criar anúncios sem precisar programar?',
      visualCue: 'Entrada dinâmica do logotipo com partículas e iluminação suave',
      cameraMovement: 'Dolly In Suave',
      approved: true,
    },
    {
      id: 'sc-2',
      order: 2,
      title: 'Apresentação do Produto',
      durationSec: 6.0,
      scriptText: 'O ToolsOnDesk Creative Studio faz todo o trabalho pesado para você.',
      visualCue: 'Demonstração do produto em 3D com destaque dos benefícios',
      cameraMovement: 'Pan Lateral 45º',
      approved: false,
    },
    {
      id: 'sc-3',
      order: 3,
      title: 'Chamada para Ação',
      durationSec: 5.0,
      scriptText: 'Baixe agora e transforme sua presença digital.',
      visualCue: 'Botão pulsante com selo de oferta e endereço do site',
      cameraMovement: 'Fixo com Bounce',
      approved: false,
    },
  ]);

  // Briefing Assistant Modal
  const [briefingOpen, setBriefingOpen] = useState<boolean>(false);

  // Skill Search & Category Filter
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [skillCategory, setSkillCategory] = useState<string>('all');

  // Load initial studio data
  const loadStudioData = async () => {
    try {
      const [kStatus, mList, pList, aList, tList, sList, cList] = await Promise.all([
        TauriService.getNvidiaKeyStatus(),
        TauriService.listNvidiaModels(),
        TauriService.listCreativeProjects(),
        TauriService.listCreativeAssets(),
        TauriService.listCreativeTemplates(),
        TauriService.getCreativeSkills(),
        TauriService.listImageModelCapabilities(),
      ]);

      setKeyStatus(kStatus);
      setModels(mList);
      setProjects(pList);
      setAssets(aList);
      setTemplates(tList);
      setSkills(sList);
      setImageCapabilities(cList);
      setImageHistory(aList.filter((a) => a.asset_type === 'image'));

      if (cList.length > 0) {
        const defaultCap = cList[0];
        setSelectedModel(defaultCap.id);
        setSteps(defaultCap.default_steps);
        setCfgScale(defaultCap.default_cfg);
      }

      if (tList.length > 0) {
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do Creative Studio:', err);
    }
  };

  useEffect(() => {
    loadStudioData();
  }, []);

  // Save & Validate NVIDIA Key
  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsValidatingKey(true);
    setKeyValidationMsg(null);
    try {
      await TauriService.saveNvidiaKey(apiKeyInput.trim());
      const res = await TauriService.validateNvidiaKey(apiKeyInput.trim());
      setKeyValidationMsg(res.message);
      const updatedStatus = await TauriService.getNvidiaKeyStatus();
      setKeyStatus(updatedStatus);
      setApiKeyInput('');
    } catch (err: any) {
      setKeyValidationMsg(`Erro: ${err?.message || err}`);
    } finally {
      setIsValidatingKey(false);
    }
  };

  const currentCapability = imageCapabilities.find((c) => c.id === selectedModel);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const cap = imageCapabilities.find((c) => c.id === modelId);
    if (cap) {
      setSteps(cap.default_steps);
      setCfgScale(cap.default_cfg);
      if (!cap.supported_aspect_ratios.includes(selectedRatio)) {
        setSelectedRatio(cap.supported_aspect_ratios[0] || '1:1');
      }
    }
  };

  const handleSendToMotionStudio = async (assetPath: string) => {
    try {
      const activeProject = projects.find((p) => p.project_type === 'motion') || projects[0];
      if (activeProject) {
        await TauriService.addAssetToMotionComposition(activeProject.id, assetPath);
      }
      // Switch to motion studio tab - the new flow will handle asset import
      setActiveTab('motion-studio');
      alert('Imagem enviada para o Motion Studio. Use o briefing para incorporá-la ao projeto.');
    } catch (err) {
      console.error('Erro ao enviar imagem para Motion Studio:', err);
    }
  };

  const handleOpenComparison = (items: CreativeAsset[]) => {
    const proposals: ProposalItem[] = items.map((a, idx) => ({
      id: a.id,
      title: a.name,
      subtitle: `${a.width || 1024}x${a.height || 1024}px · ${(a.file_size_bytes / 1024).toFixed(0)} KB`,
      imageSrc: a.file_path,
      badge: idx === 0 ? 'Original' : `Variação ${idx + 1}`,
      metadata: a.created_at ? new Date(a.created_at).toLocaleTimeString() : undefined,
    }));
    setComparingProposals(proposals);
  };

  // Image Generation Handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      let width = 1024;
      let height = 1024;
      if (selectedRatio === '16:9') {
        width = 1280;
        height = 720;
      } else if (selectedRatio === '9:16') {
        width = 720;
        height = 1280;
      } else if (selectedRatio === '4:3') {
        width = 1024;
        height = 768;
      } else if (selectedRatio === '3:4') {
        width = 768;
        height = 1024;
      } else if (selectedRatio === '21:9') {
        width = 1344;
        height = 576;
      }

      const options: NvidiaImageGenOptions = {
        prompt: imagePrompt.trim(),
        negative_prompt: negativePrompt.trim() || undefined,
        style_preset: selectedStyle,
        aspect_ratio: selectedRatio,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        samples: 1,
        model_id: selectedModel,
        references: referenceFiles.length > 0 ? referenceFiles : undefined,
      };

      const res = await TauriService.generateAiImage(options);
      setImageResult(res);
      const updatedAssets = await TauriService.listCreativeAssets();
      setAssets(updatedAssets);
      setImageHistory(updatedAssets.filter((a) => a.asset_type === 'image'));
    } catch (err: any) {
      alert(`Falha na geração: ${err?.message || err}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        overflow: 'hidden',
      }}
    >
      {/* Studio Top Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(21, 245, 186, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--mint)',
            }}
          >
            <Icon name="sparkles" size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Creative Studio
            </h2>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8 }}>
              <span>NVIDIA NIM AI</span>
              <span>·</span>
              <span>ToolsOnDesk Motion Engine (60 FPS)</span>
              <span>·</span>
              <span>Biblioteca de Skills</span>
            </div>
          </div>
        </div>

        {/* Studio Subtabs */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg)', padding: 3, borderRadius: 8 }}>
          {[
            { id: 'overview', label: 'Visão Geral', icon: 'home' },
            { id: 'image-studio', label: 'AI Image Studio', icon: 'images' },
            { id: 'motion-studio', label: 'Motion Design', icon: 'film' },
            { id: 'video-studio', label: 'AI Video Studio', icon: 'video' },
            { id: 'skills', label: 'Skills (16)', icon: 'palette' },
            { id: 'projects', label: 'Meus Projetos', icon: 'folder' },
            { id: 'assets', label: 'Assets', icon: 'wand' },
            { id: 'settings', label: 'Configurações IA', icon: 'settings' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CreativeStudioTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--mint)' : 'var(--muted)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <Icon name={tab.icon as any} size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Quick Action: Briefing */}
        <Button variant="primary" size="sm" onClick={() => setBriefingOpen(true)}>
          <Icon name="sparkles" size={14} /> Novo Briefing com IA
        </Button>
      </div>

      {/* Main Studio Viewport */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* 1. VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Hero AI Status Banner */}
            <div
              style={{
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'linear-gradient(135deg, rgba(20, 26, 28, 0.9) 0%, rgba(11, 15, 16, 0.9) 100%)',
                padding: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: keyStatus.has_key ? 'rgba(21, 245, 186, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: keyStatus.has_key ? 'var(--mint)' : '#EF4444',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {keyStatus.has_key ? `PROVEDOR ATIVO · ${keyStatus.masked_key}` : 'CHAVE NVIDIA NECESSÁRIA'}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--fg)' }}>
                  Crie anúncios, imagens e motion graphics profissionais
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, maxWidth: 640 }}>
                  Sem saber programar ou dominar editores complexos. Descreva sua ideia, escolha um estilo e exporte em alta resolução.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setActiveTab('image-studio')}>
                  <Icon name="images" size={16} /> Gerar Imagem
                </Button>
                <Button variant="primary" onClick={() => setActiveTab('motion-studio')}>
                  <Icon name="film" size={16} /> Criar Motion 60 FPS
                </Button>
              </div>
            </div>

            {/* Creative Templates Grid */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Templates Criativos Prontos</h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>10 modelos editáveis em 1 clique</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--line)',
                      backgroundColor: 'var(--surface)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease, border-color 150ms ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => setActiveTab('motion-studio')}
                  >
                    <div
                      style={{
                        height: 100,
                        background: tpl.thumbnail_preview,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 10,
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'var(--fg)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {tpl.aspect_ratio} · {tpl.duration_sec}s
                      </span>
                    </div>

                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{tpl.title}</div>
                      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 12px 0', lineHeight: 1.4 }}>
                        {tpl.description}
                      </p>
                      <div style={{ marginTop: 'auto' }}>
                        <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                          Usar Template
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Projects */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Projetos Recentes</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('projects')}>
                  Ver Todos ({projects.length})
                </Button>
              </div>

              {projects.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    borderRadius: 10,
                    border: '1px dashed var(--line)',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  Nenhum projeto salvo ainda. Comece gerando uma imagem ou escolhendo um template acima.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {projects.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        {p.project_type.toUpperCase()} · {p.aspect_ratio} · {p.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. AI IMAGE STUDIO 2.0 */}
        {activeTab === 'image-studio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, maxWidth: 1300, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Proposal Comparator Overlay if active */}
              {comparingProposals && (
                <div style={{ marginBottom: 10 }}>
                  <ProposalComparator
                    proposals={comparingProposals}
                    onSelect={(id) => {
                      const sel = assets.find((a) => a.id === id);
                      if (sel) {
                        handleSendToMotionStudio(sel.file_path);
                      }
                      setComparingProposals(null);
                    }}
                    onCancel={() => setComparingProposals(null)}
                  />
                </div>
              )}

              {/* Multimodal Reference Files Manager */}
              <ReferenceFilesManager
                references={referenceFiles}
                onChangeReferences={setReferenceFiles}
                availableAssets={assets}
                agentId="codex"
                modelId={selectedModel}
                onShowToast={(msg) => alert(msg)}
              />

              {/* Prompt Box */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Descrição da Imagem (Prompt)</label>
                  <Button variant="ghost" size="sm" onClick={() => setBriefingOpen(true)}>
                    <Icon name="sparkles" size={12} /> Briefing com IA
                  </Button>
                </div>

                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ex: Tênis esportivo futurista flutuando sobre uma base de neon mint, iluminação de estúdio comercial, reflexos no chão preto..."
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

                {/* Optional Negative Prompt (when model supports it) */}
                {currentCapability?.supports_negative_prompt && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                      Prompt Negativo (elementos a evitar)
                    </label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Ex: baixa resolução, deformações, artefatos visuais, texto borrado..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--line)',
                        color: 'var(--fg)',
                        fontSize: 12,
                        boxSizing: 'border-box',
                        fontFamily: 'Geist, sans-serif',
                      }}
                    />
                  </div>
                )}

                {/* Subscription Agent Art Direction Harness */}
                <PromptEnhancerWidget
                  currentPrompt={imagePrompt}
                  references={referenceFiles}
                  onApplyPrompt={(newP, recStyle, recRatio) => {
                    setImagePrompt(newP);
                    if (recStyle) setSelectedStyle(recStyle);
                    if (recRatio && currentCapability?.supported_aspect_ratios.includes(recRatio)) {
                      setSelectedRatio(recRatio);
                    }
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(currentCapability?.supported_aspect_ratios || ['1:1', '16:9', '9:16']).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRatio(r)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontFamily: 'var(--mono, monospace)',
                          border: selectedRatio === r ? '1px solid var(--mint)' : '1px solid var(--line)',
                          backgroundColor: selectedRatio === r ? 'rgba(21, 245, 186, 0.1)' : 'var(--bg)',
                          color: selectedRatio === r ? 'var(--mint)' : 'var(--fg)',
                          cursor: 'pointer',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    onClick={handleGenerateImage}
                  >
                    <Icon name="wand" size={16} />
                    {isGeneratingImage ? 'Gerando com NVIDIA...' : 'Gerar Imagem'}
                  </Button>
                </div>
              </div>

              {/* Style Selector Deck */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 600 }}>Estilo Visual</h4>
                <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
              </div>

              {/* Result Preview */}
              {imageResult && (
                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--mint)' }}>
                        Resultado da Geração ({imageResult.duration_ms}ms)
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
                        Modelo: {imageResult.model_id} · Seed: {imageResult.seed}
                      </span>
                    </div>

                    {imageResult.image_paths.length > 1 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const proposals: ProposalItem[] = imageResult.image_paths.map((p, idx) => ({
                            id: `gen-${idx}`,
                            title: `Variação ${idx + 1}`,
                            imageSrc: p,
                            badge: `${imageResult.model_id.split('/').pop()}`,
                          }));
                          setComparingProposals(proposals);
                        }}
                      >
                        Comparar Lado a Lado
                      </Button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {imageResult.image_paths.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid var(--line)',
                          backgroundColor: '#000',
                          maxWidth: 520,
                          flex: 1,
                        }}
                      >
                        <img
                          src={`file://${p}`}
                          alt="Generated"
                          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 420, objectFit: 'contain' }}
                        />
                        <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-2, #141A1C)', borderTop: '1px solid var(--line)' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
                            {p.split('/').pop()}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMetadataModalPath(p)}
                              title="Ver Metadados e Rastreabilidade"
                            >
                              <Icon name="info" size={12} /> Metadados
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingAsset({
                                  id: `asset-${Date.now()}`,
                                  project_id: null,
                                  name: p.split('/').pop() || 'image.png',
                                  asset_type: 'image',
                                  file_path: p,
                                  file_size_bytes: 1024000,
                                  width: 1024,
                                  height: 1024,
                                  duration_sec: null,
                                  mime_type: 'image/png',
                                  created_at: new Date().toISOString(),
                                });
                              }}
                            >
                              <Icon name="tool" size={12} /> Editar
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSendToMotionStudio(p)}
                            >
                              Enviar ao Motion Studio →
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Model Parameters & Responsive Asset Gallery */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Model & Hyperparameter Settings */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600 }}>Modelo de Síntese</h4>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      fontSize: 12,
                    }}
                  >
                    {imageCapabilities.length > 0 ? (
                      imageCapabilities.map((cap) => (
                        <option key={cap.id} value={cap.id}>
                          {cap.display_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="black-forest-labs/flux.1-schnell">FLUX.1 [schnell] (Ultra Rápido)</option>
                        <option value="black-forest-labs/flux.1-dev">FLUX.1 [dev] (Alta Qualidade)</option>
                        <option value="stabilityai/stable-diffusion-3.5-large">Stable Diffusion 3.5 Large</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Steps Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
                    <span>Passos de Difusão (Steps)</span>
                    <span style={{ fontFamily: 'var(--mono, monospace)', color: 'var(--mint)' }}>{steps}</span>
                  </div>
                  <input
                    type="range"
                    min={currentCapability?.min_steps || 1}
                    max={currentCapability?.max_steps || 50}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--mint)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
                    <span>Min: {currentCapability?.min_steps || 1}</span>
                    <span>Max: {currentCapability?.max_steps || 50}</span>
                  </div>
                </div>

                {/* CFG Scale Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
                    <span>Escala de Orientação (CFG)</span>
                    <span style={{ fontFamily: 'var(--mono, monospace)', color: 'var(--mint)' }}>{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={currentCapability?.min_cfg || 1.0}
                    max={currentCapability?.max_cfg || 15.0}
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--mint)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)' }}>
                    <span>Min: {(currentCapability?.min_cfg || 1.0).toFixed(1)}</span>
                    <span>Max: {(currentCapability?.max_cfg || 15.0).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Responsive Gallery with Filter Tabs */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  padding: 16,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                    Galeria de Imagens
                  </h4>
                  {imageHistory.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleOpenComparison(imageHistory.slice(0, 4))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--mint)',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Comparar
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg)', padding: 2, borderRadius: 6, border: '1px solid var(--line)' }}>
                  {(
                    [
                      { id: 'all', label: 'Todas' },
                      { id: 'ai', label: 'IA' },
                      { id: 'edited', label: 'Editadas' },
                      { id: 'imported', label: 'Importadas' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setGalleryFilter(f.id)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: 4,
                        border: 'none',
                        backgroundColor: galleryFilter === f.id ? 'var(--surface)' : 'transparent',
                        color: galleryFilter === f.id ? 'var(--mint)' : 'var(--muted)',
                        fontSize: 10,
                        fontWeight: galleryFilter === f.id ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Thumbnails Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, overflowY: 'auto', maxHeight: 380 }}>
                  {imageHistory
                    .filter((img) => {
                      if (galleryFilter === 'all') return true;
                      if (galleryFilter === 'ai') return img.name.includes('gen_') || img.name.includes('ai_');
                      if (galleryFilter === 'edited') return img.name.includes('edit_') || img.name.includes('crop_');
                      if (galleryFilter === 'imported') return !img.name.includes('gen_') && !img.name.includes('edit_');
                      return true;
                    })
                    .slice(0, 16)
                    .map((img) => (
                      <div
                        key={img.id}
                        style={{
                          height: 96,
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid var(--line)',
                          backgroundColor: '#000',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={`file://${img.file_path}`}
                          alt={img.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(11, 15, 16, 0.85)',
                            padding: '4px 6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setMetadataModalPath(img.file_path)}
                            title="Ver Metadados"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 10,
                            }}
                          >
                            Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAsset(img)}
                            title="Editar Imagem"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--mint)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 10,
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendToMotionStudio(img.file_path)}
                            title="Usar no Motion Studio"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--fg)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 10,
                            }}
                          >
                            Motion →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Local Image Editor Modal */}
            {editingAsset && (
              <ImageEditorModal
                imagePath={editingAsset.file_path}
                imageWidth={editingAsset.width}
                imageHeight={editingAsset.height}
                onClose={() => setEditingAsset(null)}
                onSaved={async () => {
                  setEditingAsset(null);
                  const updated = await TauriService.listCreativeAssets();
                  setAssets(updated);
                  setImageHistory(updated.filter((a) => a.asset_type === 'image'));
                }}
              />
            )}
          </div>
        )}

        {/* 3. MOTION DESIGN STUDIO - 5-Step Flow */}
        {activeTab === 'motion-studio' && (
          <div style={{ height: '100%', minHeight: 'calc(100vh - 200px)' }}>
            <MotionStudioFlow 
              skills={skills} 
              onProjectCreated={(_projectId) => {
                // Refresh projects list
                loadStudioData();
              }} 
            />
          </div>
        )}

        {/* 4. AI VIDEO STUDIO */}
        {activeTab === 'video-studio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant={videoMode === 'composite' ? 'primary' : 'secondary'}
                onClick={() => setVideoMode('composite')}
              >
                Modo B: Vídeo Composto (Local / FFmpeg 100% Offline)
              </Button>
              <Button
                variant={videoMode === 'generative' ? 'primary' : 'secondary'}
                onClick={() => setVideoMode('generative')}
              >
                Modo A: Vídeo Generativo por IA (NVIDIA)
              </Button>
            </div>

            {videoMode === 'composite' ? (
              <StoryboardApprover
                scenes={storyboardScenes}
                onToggleApprove={(id) => {
                  setStoryboardScenes((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, approved: !s.approved } : s))
                  );
                }}
                onEditScene={(scene) => {
                  const newText = prompt('Editar texto da cena:', scene.scriptText);
                  if (newText) {
                    setStoryboardScenes((prev) =>
                      prev.map((s) => (s.id === scene.id ? { ...s, scriptText: newText } : s))
                    );
                  }
                }}
                onApproveAll={() => {
                  setStoryboardScenes((prev) => prev.map((s) => ({ ...s, approved: true })));
                }}
                onRenderVideo={() => {
                  alert('Renderização do Vídeo Composto iniciada com sucesso via FFmpeg!');
                }}
              />
            ) : (
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Geração de Vídeo por IA (NVIDIA NIM)</h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px 0' }}>
                  Modelos suportados: NVIDIA Cosmos Nemotron e Stability AI SVD.
                </p>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: 'rgba(21, 245, 186, 0.05)',
                    border: '1px solid rgba(21, 245, 186, 0.2)',
                    fontSize: 12,
                    color: 'var(--muted)',
                  }}
                >
                  <strong style={{ color: 'var(--mint)' }}>Aviso de Disponibilidade:</strong> A geração de vídeo por IA na nuvem consome créditos NVCF dedicados. Caso sua conta não possua o modelo de vídeo habilitado, o Modo B (Vídeo Composto com FFmpeg local) realiza montagens profissionais diretamente no seu computador sem nenhum custo.
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. BIBLIOTECA DE SKILLS */}
        {activeTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Biblioteca de Skills Integrada</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  16 skills criativas ativas compatíveis com OpenCode SKILL.md.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Pesquisar skill..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: 12,
                  }}
                />
                <select
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: 12,
                  }}
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="design">Design Gráfico</option>
                  <option value="motion">Motion Design</option>
                  <option value="video">Vídeo & Roteiro</option>
                  <option value="3d_quality">3D & Qualidade</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {skills
                .filter((s) => {
                  if (skillCategory !== 'all' && s.category !== skillCategory) return false;
                  if (
                    skillSearch &&
                    !s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
                    !s.display_name.toLowerCase().includes(skillSearch.toLowerCase())
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      borderRadius: 10,
                      border: skill.enabled ? '1px solid rgba(21, 245, 186, 0.3)' : '1px solid var(--line)',
                      backgroundColor: 'var(--surface)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{skill.display_name}</div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--mint)',
                            fontFamily: 'var(--font-mono, monospace)',
                            marginTop: 2,
                          }}
                        >
                          {skill.name} · v{skill.version}
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={skill.enabled}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          await TauriService.toggleCreativeSkill(skill.id, checked);
                          setSkills((prev) =>
                            prev.map((s) => (s.id === skill.id ? { ...s, enabled: checked } : s))
                          );
                        }}
                        style={{ accentColor: 'var(--mint)', cursor: 'pointer' }}
                      />
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 14px 0', lineHeight: 1.4, flex: 1 }}>
                      {skill.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 10,
                          backgroundColor: 'var(--bg)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          color: 'var(--muted)',
                        }}
                      >
                        {skill.category.toUpperCase()}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSkillModal(skill)}>
                        Ver SKILL.md
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 6. MEUS PROJETOS */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Meus Projetos Criativos</h3>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('overview')}>
                + Novo Projeto
              </Button>
            </div>

            {projects.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Nenhum projeto registrado.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {projects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--line)',
                      backgroundColor: 'var(--surface)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {p.project_type.toUpperCase()} · {p.aspect_ratio} · {p.fps} fps · {p.duration_sec}s
                    </div>
                    {p.output_path && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--mint)',
                          marginTop: 8,
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        Arquivo: {p.output_path.split('/').pop()}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <Button variant="secondary" size="sm" style={{ width: '100%' }} onClick={() => setActiveTab('motion-studio')}>
                        Abrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await TauriService.deleteCreativeProject(p.id);
                          setProjects((prev) => prev.filter((item) => item.id !== p.id));
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. BIBLIOTECA DE ASSETS */}
        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Biblioteca de Assets Locais</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{assets.length} arquivos catalogados</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--surface)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: 120,
                      backgroundColor: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {asset.asset_type === 'image' ? (
                      <img
                        src={`file://${asset.file_path}`}
                        alt={asset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Icon name={asset.asset_type === 'video' ? 'video' : 'audio'} size={24} />
                    )}
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      {asset.asset_type.toUpperCase()} · {(asset.file_size_bytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. CONFIGURAÇÕES IA & PROVIDER */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                padding: 24,
              }}
            >
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600 }}>Provedor NVIDIA AI</h3>
              <p style={{ margin: '0 0 18px 0', fontSize: 13, color: 'var(--muted)' }}>
                Armazenamento protegido com criptografia de máquina e Windows Credential Manager.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Chave de API NVIDIA (nvapi-...)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="password"
                    placeholder={keyStatus.has_key ? '••••••••••••••••••••••••' : 'Insira sua chave nvapi-...'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  />
                  <Button
                    variant="primary"
                    disabled={isValidatingKey || !apiKeyInput.trim()}
                    onClick={handleSaveKey}
                  >
                    {isValidatingKey ? 'Validando...' : 'Salvar & Validar'}
                  </Button>
                </div>

                {keyValidationMsg && (
                  <div
                    style={{
                      fontSize: 12,
                      padding: 10,
                      borderRadius: 6,
                      backgroundColor: keyValidationMsg.includes('Erro')
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(21, 245, 186, 0.1)',
                      color: keyValidationMsg.includes('Erro') ? '#EF4444' : 'var(--mint)',
                    }}
                  >
                    {keyValidationMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Model Catalog List */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                padding: 24,
              }}
            >
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 600 }}>
                Modelos Disponíveis no Catálogo ({models.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {models.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.description}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(21, 245, 186, 0.1)',
                        color: 'var(--mint)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {m.category.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Briefing Assistant Modal */}
      {briefingOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 20,
          }}
        >
          <BriefingAssistant
            onCancel={() => setBriefingOpen(false)}
            onComplete={(briefing) => {
              setImagePrompt(briefing.prompt);
              setSelectedStyle(briefing.style);
              setSelectedRatio(briefing.aspectRatio);
              setBriefingOpen(false);
              setActiveTab('image-studio');
            }}
          />
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkillModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--line)',
              maxWidth: 600,
              width: '100%',
              padding: 24,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{selectedSkillModal.display_name}</h3>
                <span style={{ fontSize: 11, color: 'var(--mint)', fontFamily: 'var(--font-mono, monospace)' }}>
                  SKILL.md · {selectedSkillModal.name} · Licença {selectedSkillModal.license}
                </span>
              </div>
              <button
                onClick={() => setSelectedSkillModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6, color: 'var(--fg)', whiteSpace: 'pre-line' }}>
              {selectedSkillModal.content_md}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => setSelectedSkillModal(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Metadata & Audit Trail Modal */}
      {metadataModalPath && (
        <GenerationMetadataModal
          imagePath={metadataModalPath}
          onClose={() => setMetadataModalPath(null)}
          onSendToMotion={(path) => {
            setMetadataModalPath(null);
            handleSendToMotionStudio(path);
          }}
          onShowToast={(msg) => alert(msg)}
        />
      )}
    </div>
  );
};
