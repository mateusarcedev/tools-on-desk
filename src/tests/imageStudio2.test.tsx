import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptEnhancerWidget } from '../components/creative/image/PromptEnhancerWidget';
import { ImageEditorModal } from '../components/creative/image/ImageEditorModal';
import { ProposalComparator } from '../components/creative/generative/ProposalComparator';
import { AiAgentsSettings } from '../components/screens/settings/AiAgentsSettings';
import { ReferenceFilesManager } from '../components/creative/image/ReferenceFilesManager';
import { GenerationMetadataModal } from '../components/creative/image/GenerationMetadataModal';
import { TauriService } from '../services/tauri';
import { ProcessedReference } from '../types/creative';

describe('AI Image Studio 2.0 & Subscription Agents Tests', () => {
  it('renders PromptEnhancerWidget and enhances prompt with selected agent', async () => {
    const handleApply = vi.fn();
    const handleToast = vi.fn();

    render(
      <PromptEnhancerWidget
        currentPrompt="Fotografia de perfume minimalista"
        onApplyPrompt={handleApply}
        onShowToast={handleToast}
      />
    );

    // Initial heading should be present
    expect(screen.getByText(/Direção de Arte com Agente/i)).toBeInTheDocument();

    // Click "Aprimorar com Agente"
    const enhanceBtn = screen.getByText(/Aprimorar com Agente/i);
    fireEvent.click(enhanceBtn);

    // Wait for the result card to expand
    await waitFor(() => {
      expect(screen.getByText(/PROMPT OTIMIZADO/i)).toBeInTheDocument();
    });

    // Verify Apply button triggers callback
    const applyBtn = screen.getByText(/✓ Aplicar ao Campo de Prompt/i);
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith(
      expect.stringContaining('ultra-detailed'),
      'cinematic',
      '16:9'
    );
  });

  it('renders ImageEditorModal and triggers save with edit options', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();
    const editSpy = vi.spyOn(TauriService, 'editImageAsset');

    render(
      <ImageEditorModal
        imagePath="/tmp/test_image.png"
        imageWidth={1024}
        imageHeight={1024}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    );

    expect(screen.getByText(/Editor Nativo de Imagem/i)).toBeInTheDocument();
    expect(screen.getByText(/Girar 90°/i)).toBeInTheDocument();
    expect(screen.getByText(/Espelhar H/i)).toBeInTheDocument();

    // Rotate
    fireEvent.click(screen.getByText(/Girar 90°/i));

    // Select 1:1 crop
    fireEvent.click(screen.getByText('1:1'));

    // Save
    const saveBtn = screen.getByText(/Salvar como Nova Versão/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(editSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          input_path: '/tmp/test_image.png',
          rotate_deg: 90,
          crop: expect.objectContaining({ width: 1024, height: 1024 }),
        })
      );
      expect(handleSaved).toHaveBeenCalled();
    });
  });

  it('renders ProposalComparator with synchronized zoom controls and selects item', () => {
    const handleSelect = vi.fn();
    const proposals = [
      { id: 'p1', title: 'Variação Minimalista', imageSrc: '/tmp/img1.png', badge: 'FLUX.1-dev' },
      { id: 'p2', title: 'Variação Vibrante', imageSrc: '/tmp/img2.png', badge: 'SD 3.5' },
    ];

    render(
      <ProposalComparator
        proposals={proposals}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText(/Comparação Lado a Lado de Variações/i)).toBeInTheDocument();
    expect(screen.getByText('Variação Minimalista')).toBeInTheDocument();
    expect(screen.getByText('Variação Vibrante')).toBeInTheDocument();

    // Zoom buttons 1x, 2x, 4x exist
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText('4x')).toBeInTheDocument();

    // Click 2x zoom
    fireEvent.click(screen.getByText('2x'));

    // Click select on variation 2
    const selectBtns = screen.getAllByRole('button', { name: /Escolher Proposta|✓ Selecionada/i });
    fireEvent.click(selectBtns[1]);

    expect(handleSelect).toHaveBeenCalledWith('p2');
  });

  it('renders AiAgentsSettings with detected CLI engines and executes prompt', async () => {
    const execSpy = vi.spyOn(TauriService, 'executeAgentPrompt');

    render(<AiAgentsSettings />);

    // Agent titles
    await waitFor(() => {
      expect(screen.getByText('OpenAI Codex')).toBeInTheDocument();
      expect(screen.getByText('Google Antigravity')).toBeInTheDocument();
    });

    // Execute button
    const runBtn = screen.getByRole('button', { name: /Executar no Agente/i });
    expect(runBtn).not.toBeDisabled();

    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(execSpy).toHaveBeenCalled();
      expect(screen.getByText(/RESPOSTA DO AGENTE/i)).toBeInTheDocument();
    });
  });

  it('renders ReferenceFilesManager, handles purpose selection, text preview toggle, and removal', () => {
    const handleChange = vi.fn();
    const handleToast = vi.fn();

    const sampleRefs: ProcessedReference[] = [
      {
        id: 'ref-1',
        file_path: '/tmp/product_photo.png',
        file_name: 'product_photo.png',
        file_type: 'image',
        mime_type: 'image/png',
        file_size_bytes: 2048000,
        purpose: 'product',
        preview_data_url: null,
        width: 1920,
        height: 1080,
        page_count: null,
        extracted_text: null,
        extraction_status: 'ready',
        compatibility: {
          agent_compatible: true,
          diffusion_compatible: false,
          mode: 'multimodal_vision',
          notes: 'Analisado diretamente pelo agente.',
        },
      },
      {
        id: 'ref-2',
        file_path: '/tmp/brand_guidelines.pdf',
        file_name: 'brand_guidelines.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 512000,
        purpose: 'brand_identity',
        preview_data_url: null,
        width: null,
        height: null,
        page_count: 5,
        extracted_text: 'Use sempre as cores preto #0B0F10 e verde menta #15F5BA.',
        extraction_status: 'ready',
        compatibility: {
          agent_compatible: true,
          diffusion_compatible: false,
          mode: 'text_extraction',
          notes: 'Texto extraído e injetado no contexto.',
        },
      },
    ];

    render(
      <ReferenceFilesManager
        references={sampleRefs}
        onChangeReferences={handleChange}
        agentId="codex"
        modelId="black-forest-labs/flux.1-schnell"
        onShowToast={handleToast}
      />
    );

    // Verify header and count
    expect(screen.getByText(/Arquivos de referência \(2\)/i)).toBeInTheDocument();

    // Verify file cards exist
    expect(screen.getByText('product_photo.png')).toBeInTheDocument();
    expect(screen.getByText('brand_guidelines.pdf')).toBeInTheDocument();

    // Verify metadata shown
    expect(screen.getByText(/1920x1080px/i)).toBeInTheDocument();
    expect(screen.getByText(/5 página\(s\)/i)).toBeInTheDocument();

    // Verify extracted text snippet button exists and toggle it
    const toggleTextBtn = screen.getByRole('button', { name: /Ver Texto/i });
    expect(toggleTextBtn).toBeInTheDocument();
    fireEvent.click(toggleTextBtn);
    expect(screen.getByText(/Use sempre as cores preto #0B0F10/i)).toBeInTheDocument();

    // Change purpose of first reference
    const purposeSelects = screen.getAllByRole('combobox');
    fireEvent.change(purposeSelects[0], { target: { value: 'style' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ file_name: 'product_photo.png', purpose: 'style' }),
      ])
    );

    // Click remove on second item
    const removeBtns = screen.getAllByTitle(/Remover anexo/i);
    fireEvent.click(removeBtns[1]);
    expect(handleChange).toHaveBeenCalledWith([sampleRefs[0]]);
  });

  it('renders GenerationMetadataModal and displays audit trail, original prompt, and references', async () => {
    const handleClose = vi.fn();
    const handleSendToMotion = vi.fn();

    vi.spyOn(TauriService, 'getGenerationMetadataByOutput').mockResolvedValueOnce({
      id: 'gen-meta-1',
      project_id: null,
      provider: 'nvidia',
      model: 'black-forest-labs/flux.1-schnell',
      modality: 'image',
      prompt: 'Perfume minimalista com neon mint',
      enhanced_prompt: 'A sleek minimal perfume bottle bathed in emerald neon mint backlight, 8k resolution, product photography',
      agent_used: 'OpenAI Codex (gpt-4o)',
      negative_prompt: null,
      operation: 'text_to_image',
      parameters_json: JSON.stringify({ steps: 4, cfg_scale: 1.0, aspect_ratio: '1:1' }),
      output_path: '/tmp/generated_output.png',
      references: [
        {
          id: 'ref-meta-1',
          file_path: '/tmp/fragrance_bottle.png',
          file_name: 'fragrance_bottle.png',
          file_type: 'image',
          mime_type: 'image/png',
          file_size_bytes: 1200000,
          purpose: 'product',
          preview_data_url: null,
          width: 800,
          height: 1200,
          page_count: null,
          extracted_text: null,
          extraction_status: 'success',
          compatibility: {
            agent_compatible: true,
            diffusion_compatible: false,
            mode: 'multimodal_vision',
            notes: 'Percepção visual multimodal ativa',
          },
        },
      ],
      duration_ms: 2450,
      status: 'completed',
      created_at: '2026-10-29T17:30:00Z',
    });

    render(
      <GenerationMetadataModal
        imagePath="/tmp/generated_output.png"
        onClose={handleClose}
        onSendToMotion={handleSendToMotion}
      />
    );

    // Check loading and then resolved content
    await waitFor(() => {
      expect(screen.getByText(/Rastreabilidade & Metadados da Geração/i)).toBeInTheDocument();
      expect(screen.getByText(/"Perfume minimalista com neon mint"/i)).toBeInTheDocument();
      expect(screen.getByText(/A sleek minimal perfume bottle/i)).toBeInTheDocument();
      expect(screen.getByText('fragrance_bottle.png')).toBeInTheDocument();
      expect(screen.getByText(/product · image/i)).toBeInTheDocument();
    });

    // Check action buttons
    const sendMotionBtn = screen.getByText(/Enviar ao Motion Studio →/i);
    fireEvent.click(sendMotionBtn);
    expect(handleSendToMotion).toHaveBeenCalledWith('/tmp/generated_output.png');
  });
});
