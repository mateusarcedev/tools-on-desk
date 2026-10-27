import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupCenterModal } from '../components/setup/SetupCenterModal';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { TauriService } from '../services/tauri';

describe('Setup Center & Dependency Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SetupCenterModal in Welcome step with all modules', () => {
    const handleClose = vi.fn();
    const handleFinished = vi.fn();
    const handleToast = vi.fn();

    render(
      <SetupCenterModal
        isOpen={true}
        onClose={handleClose}
        onFinished={handleFinished}
        onShowToast={handleToast}
      />
    );

    expect(screen.getByText('Vamos preparar seu Arce Tools')).toBeInTheDocument();
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Áudio')).toBeInTheDocument();
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
    expect(screen.getByText('Imagens')).toBeInTheDocument();
    expect(screen.getByText('Poster Studio')).toBeInTheDocument();

    expect(screen.getByText('Verificar meu computador')).toBeInTheDocument();
    expect(screen.getByText('Configurar depois')).toBeInTheDocument();
  });

  it('navigates from Welcome to System Check when clicking "Verificar meu computador"', async () => {
    const handleClose = vi.fn();
    const handleFinished = vi.fn();
    const handleToast = vi.fn();

    render(
      <SetupCenterModal
        isOpen={true}
        onClose={handleClose}
        onFinished={handleFinished}
        onShowToast={handleToast}
      />
    );

    const verifyBtn = screen.getByText('Verificar meu computador');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Verificação do Sistema')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sistema Operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/Espaço Livre em Disco/i)).toBeInTheDocument();
  });

  it('navigates through tool setup and ready steps', async () => {
    const handleClose = vi.fn();
    const handleFinished = vi.fn();
    const handleToast = vi.fn();

    render(
      <SetupCenterModal
        isOpen={true}
        onClose={handleClose}
        onFinished={handleFinished}
        onShowToast={handleToast}
      />
    );

    // Step 1 -> 2
    fireEvent.click(screen.getByText('Verificar meu computador'));
    await waitFor(() => {
      expect(screen.getByText('Verificação do Sistema')).toBeInTheDocument();
    });

    // Step 2 -> 3
    fireEvent.click(screen.getByText('Continuar para Ferramentas'));
    await waitFor(() => {
      expect(screen.getByText('Configuração das Ferramentas')).toBeInTheDocument();
    });

    expect(screen.getByText(/Ferramentas de Áudio e Vídeo/i)).toBeInTheDocument();
    expect(screen.getByText(/Motor de Downloads/i)).toBeInTheDocument();
    expect(screen.getByText(/LibreOffice/i)).toBeInTheDocument();

    // Step 3 -> 4
    fireEvent.click(screen.getByText('Concluir Configuração'));
    await waitFor(() => {
      expect(screen.getByText('Tudo pronto para começar!')).toBeInTheDocument();
    });

    const startBtn = screen.getByText('Começar a usar o Arce Tools');
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(handleFinished).toHaveBeenCalled();
    });
  });

  it('allows dismissing setup via "Configurar depois"', async () => {
    const handleClose = vi.fn();
    const handleFinished = vi.fn();
    const handleToast = vi.fn();

    const spyComplete = vi.spyOn(TauriService, 'completeFirstRun').mockResolvedValue();

    render(
      <SetupCenterModal
        isOpen={true}
        onClose={handleClose}
        onFinished={handleFinished}
        onShowToast={handleToast}
      />
    );

    const dismissBtn = screen.getByText('Configurar depois');
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(spyComplete).toHaveBeenCalledWith('dismissed');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renders Ferramentas e Dependências section in SettingsScreen', async () => {
    const handleUpdate = vi.fn();
    const handleToast = vi.fn();
    const handleOpenSetup = vi.fn();

    render(
      <SettingsScreen
        settings={{
          themePref: 'Escuro',
          maxConcurrency: 2,
          downloadFolder: 'C:\\Downloads',
          exportFolder: 'C:\\Documents',
          notifications: true,
          autoUpdate: true,
          saveInSameFolder: false,
          language: 'Português',
        }}
        onUpdateSettings={handleUpdate}
        onShowToast={handleToast}
        onOpenSetupCenter={handleOpenSetup}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ferramentas e Dependências')).toBeInTheDocument();
      expect(screen.getByText('Reabrir Assistente de Configuração')).toBeInTheDocument();
    });

    const setupBtn = screen.getByText('Reabrir Assistente de Configuração');
    fireEvent.click(setupBtn);
    expect(handleOpenSetup).toHaveBeenCalled();
  });
});
