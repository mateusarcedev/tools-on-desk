import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MigrationModal } from '../components/migration/MigrationModal';
import { TauriService } from '../services/tauri';

describe('ToolsOnDesk Migration Modal Tests', () => {
  it('renders MigrationModal with welcome title and action buttons', async () => {
    vi.spyOn(TauriService, 'getMigrationStatus').mockResolvedValueOnce({
      hasLegacyData: true,
      isMigrated: false,
      currentStep: 'DISCOVERY',
      message: 'Dados encontrados',
      progressPercent: 0,
      preservedProjectsCount: 3,
      preservedAssetsCount: 5,
      preservedTasksCount: 12,
      preservedHistoryCount: 10,
      preservedErrorLogsCount: 2,
      credentialsMigrated: false,
      binariesReused: true,
    });

    render(
      <MigrationModal
        isOpen={true}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bem-vindo ao ToolsOnDesk')).toBeInTheDocument();
    });

    expect(screen.getByText(/Encontramos dados de uma versão anterior/i)).toBeInTheDocument();
    expect(screen.getByText('Migrar meus dados')).toBeInTheDocument();
    expect(screen.getByText('Configurar depois')).toBeInTheDocument();
  });

  it('toggles detail card showing preserved record counts', async () => {
    vi.spyOn(TauriService, 'getMigrationStatus').mockResolvedValueOnce({
      hasLegacyData: true,
      isMigrated: false,
      currentStep: 'DISCOVERY',
      message: 'Dados encontrados',
      progressPercent: 0,
      preservedProjectsCount: 4,
      preservedAssetsCount: 7,
      preservedTasksCount: 15,
      preservedHistoryCount: 12,
      preservedErrorLogsCount: 1,
      credentialsMigrated: false,
      binariesReused: true,
    });

    render(
      <MigrationModal
        isOpen={true}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bem-vindo ao ToolsOnDesk')).toBeInTheDocument();
    });

    const detailsBtn = screen.getByText('Ver detalhes dos dados encontrados');
    fireEvent.click(detailsBtn);

    expect(screen.getByText(/Projetos criativos:/i)).toBeInTheDocument();
    expect(screen.getByText(/Assets de mídia:/i)).toBeInTheDocument();
    expect(screen.getByText(/Tarefas históricas:/i)).toBeInTheDocument();
  });

  it('triggers migration and renders success summary', async () => {
    const handleCompleted = vi.fn();

    vi.spyOn(TauriService, 'getMigrationStatus').mockResolvedValueOnce({
      hasLegacyData: true,
      isMigrated: false,
      currentStep: 'DISCOVERY',
      message: 'Dados encontrados',
      progressPercent: 0,
      preservedProjectsCount: 2,
      preservedAssetsCount: 4,
      preservedTasksCount: 8,
      preservedHistoryCount: 6,
      preservedErrorLogsCount: 0,
      credentialsMigrated: false,
      binariesReused: true,
    });

    vi.spyOn(TauriService, 'runMigration').mockResolvedValueOnce({
      hasLegacyData: true,
      isMigrated: true,
      currentStep: 'COMPLETED',
      message: 'Sucesso',
      progressPercent: 100,
      preservedProjectsCount: 2,
      preservedAssetsCount: 4,
      preservedTasksCount: 8,
      preservedHistoryCount: 6,
      preservedErrorLogsCount: 0,
      credentialsMigrated: true,
      binariesReused: true,
    });

    render(
      <MigrationModal
        isOpen={true}
        onClose={vi.fn()}
        onCompleted={handleCompleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Migrar meus dados')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Migrar meus dados'));

    await waitFor(() => {
      expect(screen.getByText('Seus dados foram migrados com sucesso!')).toBeInTheDocument();
    });

    expect(screen.getByText('Começar a usar o ToolsOnDesk')).toBeInTheDocument();
    expect(handleCompleted).toHaveBeenCalled();
  });
});
