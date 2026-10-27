import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AudioScreen } from '../components/screens/AudioScreen';
import { VideoScreen } from '../components/screens/VideoScreen';
import { DownloadsScreen } from '../components/screens/DownloadsScreen';

describe('Media Screens Tests', () => {
  it('renders AudioScreen with format options and handles run', () => {
    const onShowToast = vi.fn();
    render(<AudioScreen onShowToast={onShowToast} />);

    expect(screen.getByText('Conversão e Edição de Áudio')).toBeInTheDocument();
    expect(screen.getByText('Formato de saída')).toBeInTheDocument();
    expect(screen.getByText('Taxa de bits')).toBeInTheDocument();
    expect(screen.getByText('Normalizar volume')).toBeInTheDocument();
    expect(screen.getByText('Corte de trecho')).toBeInTheDocument();

    // Try run without files
    const runBtn = screen.getByText(/Converter 0 arquivo\(s\)/i);
    expect(runBtn).toBeDisabled();
  });

  it('renders VideoScreen and switches tool tabs', () => {
    const onShowToast = vi.fn();
    render(<VideoScreen onShowToast={onShowToast} />);

    expect(screen.getByText('Converter')).toBeInTheDocument();
    expect(screen.getByText('Comprimir')).toBeInTheDocument();
    expect(screen.getByText('Extrair áudio')).toBeInTheDocument();
    expect(screen.getByText('Cortar trecho')).toBeInTheDocument();
    expect(screen.getByText('Extrair frame')).toBeInTheDocument();

    // Click Comprimir tab
    fireEvent.click(screen.getByText('Comprimir'));
    expect(screen.getByText('Preset de compressão')).toBeInTheDocument();

    // Click Extrair áudio tab
    fireEvent.click(screen.getByText('Extrair áudio'));
    expect(screen.getByText('Formato de áudio extraído')).toBeInTheDocument();

    // Click Cortar trecho tab
    fireEvent.click(screen.getByText('Cortar trecho'));
    expect(screen.getByText('Ponto inicial (segundos)')).toBeInTheDocument();
    expect(screen.getByText(/Corte rápido sem recodificação/i)).toBeInTheDocument();
  });

  it('renders DownloadsScreen with mode switch and input', () => {
    const onShowToast = vi.fn();
    render(<DownloadsScreen onShowToast={onShowToast} />);

    expect(screen.getByText('Downloads de Mídia')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cole um link do YouTube/i)).toBeInTheDocument();
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
    expect(screen.getByText('Somente áudio')).toBeInTheDocument();

    // Switch to Somente áudio
    fireEvent.click(screen.getByText('Somente áudio'));
    expect(screen.getByText('Formato de áudio')).toBeInTheDocument();
  });
});
