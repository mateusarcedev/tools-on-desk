import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreativeStudioScreen } from '../components/screens/creative/CreativeStudioScreen';
import { StyleSelector, VISUAL_STYLES } from '../components/creative/generative/StyleSelector';
import { ParameterAdjuster } from '../components/creative/generative/ParameterAdjuster';
import { BriefingAssistant } from '../components/creative/generative/BriefingAssistant';
import { StoryboardApprover, StoryboardScene } from '../components/creative/generative/StoryboardApprover';
import { TemplateParameter } from '../types/creative';

describe('Creative Studio Frontend Component Tests', () => {
  it('renders CreativeStudioScreen with header and all subtabs', async () => {
    await act(async () => {
      render(<CreativeStudioScreen />);
    });

    expect(screen.getByText('Creative Studio')).toBeInTheDocument();
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('AI Image Studio')).toBeInTheDocument();
    expect(screen.getByText('Motion Design')).toBeInTheDocument();
    expect(screen.getByText('AI Video Studio')).toBeInTheDocument();
    expect(screen.getByText('Skills (16)')).toBeInTheDocument();
    expect(screen.getByText('Meus Projetos')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Configurações IA')).toBeInTheDocument();
  });

  it('switches between studio subtabs smoothly', async () => {
    await act(async () => {
      render(<CreativeStudioScreen />);
    });

    const motionTab = screen.getByText('Motion Design');
    await act(async () => {
      fireEvent.click(motionTab);
    });
    expect(screen.getByPlaceholderText(/Anime este logotipo/i)).toBeInTheDocument();

    const imageTab = screen.getByText('AI Image Studio');
    await act(async () => {
      fireEvent.click(imageTab);
    });
    expect(screen.getByText('Descrição da Imagem (Prompt)')).toBeInTheDocument();

    const skillsTab = screen.getByText('Skills (16)');
    await act(async () => {
      fireEvent.click(skillsTab);
    });
    expect(screen.getByText('Biblioteca de Skills Integrada')).toBeInTheDocument();
  });

  it('renders StyleSelector with all 9 visual styles', () => {
    const handleSelect = vi.fn();
    render(<StyleSelector selectedStyle="Publicitário" onSelectStyle={handleSelect} />);

    expect(VISUAL_STYLES.length).toBe(9);
    expect(screen.getByText('Publicitário')).toBeInTheDocument();
    expect(screen.getByText('Fotográfico')).toBeInTheDocument();
    expect(screen.getByText('Cinematográfico')).toBeInTheDocument();
    expect(screen.getByText('Minimalista')).toBeInTheDocument();
    expect(screen.getAllByText('Editorial')[0]).toBeInTheDocument();
    expect(screen.getByText('Ilustração')).toBeInTheDocument();
    expect(screen.getByText('3D & Render')).toBeInTheDocument();
    expect(screen.getByText('Produto & Hero')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Minimalista'));
    expect(handleSelect).toHaveBeenCalledWith('Minimalista');
  });

  it('renders ParameterAdjuster and handles real-time input change', () => {
    const handleChange = vi.fn();
    const params: TemplateParameter[] = [
      {
        id: 'p1',
        label: 'Título Promocional',
        param_type: 'text',
        default_value: 'OFERTA',
        current_value: 'SUPER OFERTA',
        target_layer_id: 'l1',
      },
      {
        id: 'p2',
        label: 'Cor de Destaque',
        param_type: 'color',
        default_value: '#15F5BA',
        current_value: '#15F5BA',
        target_layer_id: 'l1',
      },
    ];

    render(<ParameterAdjuster parameters={params} onChange={handleChange} />);

    expect(screen.getByText('Parâmetros Editáveis do Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SUPER OFERTA')).toBeInTheDocument();

    const input = screen.getByDisplayValue('SUPER OFERTA');
    fireEvent.change(input, { target: { value: 'NOVO VALOR' } });
    expect(handleChange).toHaveBeenCalledWith('p1', 'NOVO VALOR');
  });

  it('renders BriefingAssistant and completes interactive briefing', () => {
    const handleComplete = vi.fn();
    const handleCancel = vi.fn();

    render(<BriefingAssistant onComplete={handleComplete} onCancel={handleCancel} />);

    expect(screen.getByText('Assistente de Briefing Criativo')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 3 · Transforme sua ideia em anúncios e vídeos profissionais')).toBeInTheDocument();

    // Advance to step 2
    fireEvent.click(screen.getByText('Próximo: Estilo & Tom →'));
    expect(screen.getByText('Tom da Comunicação')).toBeInTheDocument();

    // Advance to step 3
    fireEvent.click(screen.getByText('Próximo: Mensagem & Oferta →'));
    expect(screen.getByText('Benefício ou Oferta de Destaque')).toBeInTheDocument();

    // Finish
    fireEvent.click(screen.getByText('Estruturar Projeto no Estúdio'));
    expect(handleComplete).toHaveBeenCalled();
  });

  it('renders StoryboardApprover and toggles approval state', () => {
    const handleToggle = vi.fn();
    const scenes: StoryboardScene[] = [
      {
        id: 's1',
        order: 1,
        title: 'Cena Abertura',
        durationSec: 5.0,
        scriptText: 'Texto falado da cena',
        visualCue: 'Movimento de entrada',
        cameraMovement: 'Dolly In',
        approved: false,
      },
    ];

    render(
      <StoryboardApprover
        scenes={scenes}
        onToggleApprove={handleToggle}
        onEditScene={vi.fn()}
        onApproveAll={vi.fn()}
        onRenderVideo={vi.fn()}
      />
    );

    expect(screen.getByText('Storyboard & Aprovação de Cenas')).toBeInTheDocument();
    expect(screen.getByText('Cena Abertura')).toBeInTheDocument();
    expect(screen.getByText('"Texto falado da cena"')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Aprovar'));
    expect(handleToggle).toHaveBeenCalledWith('s1');
  });
});
