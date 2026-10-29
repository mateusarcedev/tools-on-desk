import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptEnhancerWidget } from '../components/creative/image/PromptEnhancerWidget';
import { ImageEditorModal } from '../components/creative/image/ImageEditorModal';
import { ProposalComparator } from '../components/creative/generative/ProposalComparator';
import { AiAgentsSettings } from '../components/screens/settings/AiAgentsSettings';
import { TauriService } from '../services/tauri';

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
});
