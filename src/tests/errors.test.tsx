import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { HistoryScreen } from '../components/screens/HistoryScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { TauriService } from '../services/tauri';
import { ErrorLogEntry, ErrorLogStats } from '../types/errorLog';

const mockErrorLogs: ErrorLogEntry[] = [
  {
    id: 'err-1',
    createdAt: '2026-10-27T14:30:00Z',
    severity: 'critical',
    source: 'task_worker',
    module: 'documents',
    operation: 'convert_word_to_pdf',
    taskId: 'task-doc-123',
    errorCode: 'DOC_LIBREOFFICE_NOT_FOUND',
    userMessage: 'LibreOffice não foi encontrado no sistema para converter o documento.',
    technicalDetails: 'Command soffice not found in PATH or Registry',
    sanitizedStack: 'at Command.spawn (src/engines/document_engine.rs:650)',
    status: 'unresolved',
    appVersion: '0.1.0',
    resolvedAt: null,
  },
  {
    id: 'err-2',
    createdAt: '2026-10-27T15:00:00Z',
    severity: 'error',
    source: 'task_worker',
    module: 'downloads',
    operation: 'download_media',
    taskId: 'task-dl-456',
    errorCode: 'DOWNLOAD_SSRF_BLOCKED',
    userMessage: 'O endereço fornecido aponta para uma rede privada ou reservada.',
    technicalDetails: 'Blocked private IP: 192.168.1.1',
    sanitizedStack: null,
    status: 'resolved',
    appVersion: '0.1.0',
    resolvedAt: '2026-10-27T15:05:00Z',
  },
];

const mockStats: ErrorLogStats = {
  total: 2,
  critical: 1,
  unresolved: 1,
  databaseSizeBytes: 4096,
};

describe('Error & Diagnostics Center Tests', () => {
  beforeEach(() => {
    vi.spyOn(TauriService, 'getErrorLogs').mockResolvedValue(mockErrorLogs);
    vi.spyOn(TauriService, 'getAllErrorLogsForExport').mockResolvedValue(mockErrorLogs);
    vi.spyOn(TauriService, 'getErrorStats').mockResolvedValue(mockStats);
    vi.spyOn(TauriService, 'copyToClipboard').mockResolvedValue();
    vi.spyOn(TauriService, 'resolveErrorLog').mockResolvedValue();
  });

  it('renders HistoryScreen with tabs for Atividades and Erros e Diagnósticos', async () => {
    const onShowToast = vi.fn();
    await act(async () => {
      render(
        <HistoryScreen
          history={[]}
          onRefreshHistory={() => {}}
          onOpenExplorer={() => {}}
          onShowToast={onShowToast}
        />
      );
    });

    expect(screen.getByText('Atividades Concluídas')).toBeInTheDocument();
    expect(screen.getByText('Erros e Diagnósticos')).toBeInTheDocument();
  });

  it('switches to Diagnostics tab and displays KPI cards and error entries', async () => {
    const onShowToast = vi.fn();
    await act(async () => {
      render(
        <HistoryScreen
          history={[]}
          onRefreshHistory={() => {}}
          onOpenExplorer={() => {}}
          onShowToast={onShowToast}
          initialTab="diagnostics"
        />
      );
    });

    // KPI cards
    expect(screen.getByText('Total de Registros')).toBeInTheDocument();
    expect(screen.getByText('Falhas Críticas')).toBeInTheDocument();
    expect(screen.getByText('Não Resolvidos')).toBeInTheDocument();
    expect(screen.getByText('Uso do Banco Local')).toBeInTheDocument();

    // Error entries
    expect(screen.getByText('DOC_LIBREOFFICE_NOT_FOUND')).toBeInTheDocument();
    expect(screen.getByText('DOWNLOAD_SSRF_BLOCKED')).toBeInTheDocument();
  });

  it('expands error card to view technical details and sanitized stack', async () => {
    const onShowToast = vi.fn();
    await act(async () => {
      render(
        <HistoryScreen
          history={[]}
          onRefreshHistory={() => {}}
          onOpenExplorer={() => {}}
          onShowToast={onShowToast}
          initialTab="diagnostics"
        />
      );
    });

    // Click on the first error card to expand
    const cardTitle = screen.getByText('LibreOffice não foi encontrado no sistema para converter o documento.');
    fireEvent.click(cardTitle);

    expect(screen.getByText(/Detalhes Técnicos e Causa Raiz/i)).toBeInTheDocument();
    expect(screen.getByText(/Command soffice not found in PATH or Registry/i)).toBeInTheDocument();
    expect(screen.getByText(/Rastreamento de Pilha \(Sanitizado\)/i)).toBeInTheDocument();
  });

  it('handles copying formatted errors to clipboard', async () => {
    const onShowToast = vi.fn();
    await act(async () => {
      render(
        <HistoryScreen
          history={[]}
          onRefreshHistory={() => {}}
          onOpenExplorer={() => {}}
          onShowToast={onShowToast}
          initialTab="diagnostics"
        />
      );
    });

    // Click "Copiar filtrados"
    const copyAllBtn = screen.getByText('Copiar filtrados');
    await act(async () => {
      fireEvent.click(copyAllBtn);
    });

    expect(TauriService.copyToClipboard).toHaveBeenCalled();
  });

  it('renders ErrorBoundary fallback when a child crashes', () => {
    const ProblemChild = () => {
      throw new Error('Falha simulada na renderização de teste');
    };

    // Suppress console.error in vitest for intentional throw
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo inesperado aconteceu nesta tela')).toBeInTheDocument();
    expect(screen.getByText(/Falha simulada na renderização de teste/i)).toBeInTheDocument();
    expect(screen.getByText('Recarregar visualização')).toBeInTheDocument();

    console.error = originalConsoleError;
  });
});
