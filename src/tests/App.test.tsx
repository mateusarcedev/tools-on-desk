import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Arce Tools App Shell', () => {
  it('renders titlebar with brand and title', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Arce Tools')).toBeInTheDocument();
    expect(screen.getByText('a/t')).toBeInTheDocument();
  });

  it('renders all 9 sidebar navigation items', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getAllByText('Início')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Downloads')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Documentos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Áudio')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vídeo')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Imagens')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pôsteres')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Histórico')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Configurações')[0]).toBeInTheDocument();
  });

  it('navigates between screens when clicking sidebar buttons', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('O que vamos fazer hoje?')).toBeInTheDocument();

    const postersBtn = screen.getAllByText('Pôsteres')[0];
    await act(async () => {
      fireEvent.click(postersBtn);
    });
    expect(screen.getAllByText('Poster Studio')[0]).toBeInTheDocument();

    const settingsBtn = screen.getAllByText('Configurações')[0];
    await act(async () => {
      fireEvent.click(settingsBtn);
    });
    expect(screen.getByText('Aparência e Tema')).toBeInTheDocument();
  });

  it('opens command palette when search bar is clicked and closes on Escape', async () => {
    await act(async () => {
      render(<App />);
    });

    const searchBtn = screen.getByText('Pesquisar ferramentas e ações');
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    expect(
      screen.getByPlaceholderText('Digite um comando, ferramenta ou atalho...')
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(
      screen.queryByPlaceholderText('Digite um comando, ferramenta ou atalho...')
    ).not.toBeInTheDocument();
  });
});
