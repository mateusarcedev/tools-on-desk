import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('renders DownloadsScreen with multi-platform badges, mode switch and SSRF protection', async () => {
    const onShowToast = vi.fn();
    await act(async () => {
      render(<DownloadsScreen onShowToast={onShowToast} />);
    });

    expect(screen.getByText('Downloads de Mídia & Áudio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cole o link \(YouTube, Shorts, Instagram/i)).toBeInTheDocument();
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
    expect(screen.getByText('Somente áudio')).toBeInTheDocument();

    // Platform chips
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('SoundCloud')).toBeInTheDocument();

    // Switch to Somente áudio
    fireEvent.click(screen.getByText('Somente áudio'));
    expect(screen.getByText('Formato de áudio')).toBeInTheDocument();
    expect(screen.getByText('MP3')).toBeInTheDocument();
    expect(screen.getByText('M4A')).toBeInTheDocument();
    expect(screen.getByText('WAV')).toBeInTheDocument();
    expect(screen.getByText('FLAC')).toBeInTheDocument();
    expect(screen.getByText('OPUS')).toBeInTheDocument();

    // Switch to Batch mode
    const batchLabel = screen.getByText(/Download em lote/i);
    fireEvent.click(batchLabel);
    expect(screen.getByPlaceholderText(/Cole os links das mídias aqui, um por linha/i)).toBeInTheDocument();

    // Switch back to single mode and test SSRF prevention
    fireEvent.click(batchLabel);
    const input = screen.getByPlaceholderText(/Cole o link \(YouTube, Shorts, Instagram/i);
    fireEvent.change(input, { target: { value: 'http://127.0.0.1:8080/exploit' } });
    expect(screen.getByText(/Bloqueio de segurança: URLs locais ou privadas não são permitidas/i)).toBeInTheDocument();
  });
});
