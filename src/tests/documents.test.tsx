import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DocumentsScreen } from '../components/screens/DocumentsScreen';
import { TauriService } from '../services/tauri';

describe('Document Engine Screens Tests', () => {
  it('renders DocumentsScreen and all tool tabs', () => {
    const onShowToast = vi.fn();
    render(<DocumentsScreen onShowToast={onShowToast} />);

    expect(screen.getByText('PDF → Word')).toBeInTheDocument();
    expect(screen.getByText('Word → PDF')).toBeInTheDocument();
    expect(screen.getByText('Unir PDFs')).toBeInTheDocument();
    expect(screen.getByText('Dividir PDF')).toBeInTheDocument();
    expect(screen.getByText('Organizar páginas')).toBeInTheDocument();
    expect(screen.getByText('Comprimir PDF')).toBeInTheDocument();

    // Default view: PDF -> Word
    expect(screen.getByText('Conversor PDF para Word (.docx)')).toBeInTheDocument();
  });

  it('switches between all document tools smoothly', () => {
    const onShowToast = vi.fn();
    render(<DocumentsScreen onShowToast={onShowToast} />);

    // Switch to Word -> PDF
    fireEvent.click(screen.getByText('Word → PDF'));
    expect(screen.getByText('Conversor Word para PDF')).toBeInTheDocument();

    // Switch to Unir PDFs
    fireEvent.click(screen.getByText('Unir PDFs'));
    expect(screen.getByText('Unir Múltiplos Arquivos PDF')).toBeInTheDocument();

    // Switch to Dividir PDF
    fireEvent.click(screen.getByText('Dividir PDF'));
    expect(screen.getByText('Dividir Documento PDF')).toBeInTheDocument();

    // Switch to Organizar páginas
    fireEvent.click(screen.getByText('Organizar páginas'));
    expect(screen.getByText('Organizador e Rotacionador de Páginas')).toBeInTheDocument();

    // Switch to Comprimir PDF
    fireEvent.click(screen.getByText('Comprimir PDF'));
    expect(screen.getByText('Compressão de PDF sem perda visual')).toBeInTheDocument();
  });

  it('handles Word to PDF LibreOffice detection status card', async () => {
    const onShowToast = vi.fn();
    vi.spyOn(TauriService, 'checkLibreOfficeStatus').mockResolvedValueOnce({
      isAvailable: false,
      notes: 'Não encontrado',
      path: null,
      version: null,
    });

    render(<DocumentsScreen onShowToast={onShowToast} />);

    fireEvent.click(screen.getByText('Word → PDF'));
    expect(await screen.findByText(/LibreOffice não detectado/i)).toBeInTheDocument();
    expect(screen.getByText(/winget install TheDocumentFoundation.LibreOffice/i)).toBeInTheDocument();
  });
});
