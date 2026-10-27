import React from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AppSettings, ThemePreference } from '../../types/settings';
import { TauriService } from '../../services/tauri';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const themes: { id: ThemePreference; label: string; icon: string }[] = [
    { id: 'Escuro', label: 'Escuro', icon: 'moon' },
    { id: 'Claro', label: 'Claro', icon: 'sun' },
    { id: 'Sistema', label: 'Sistema', icon: 'system' },
  ];

  const components = [
    {
      id: 'rust',
      name: 'Motor Rust Nativo',
      desc: 'Cálculos matemáticos, persistência SQLite e geração de PDF',
      ver: '1.99 MSVC',
      status: 'installed',
    },
    {
      id: 'image',
      name: 'Motor de Imagens (Rust)',
      desc: 'Decodificação e codificação PNG/JPEG com Lanczos3',
      ver: '0.25',
      status: 'installed',
    },
    {
      id: 'ffmpeg',
      name: 'FFmpeg Multimídia',
      desc: 'Conversão e processamento de áudio e vídeo de alta performance',
      ver: '8.1 (Detectado)',
      status: 'installed',
    },
    {
      id: 'ytdlp',
      name: 'yt-dlp',
      desc: 'Análise de fontes permitidas sem bypass de DRM',
      ver: 'Missão 02',
      status: 'missing',
    },
    {
      id: 'lo',
      name: 'LibreOffice Headless',
      desc: 'Conversões avançadas de Word para PDF com fidelidade de fontes',
      ver: 'Missão 02',
      status: 'missing',
    },
  ];

  const handleSelectDownloadFolder = async () => {
    const selected = await TauriService.selectFolder('Selecionar pasta de downloads padrão');
    if (selected) {
      onUpdateSettings({ downloadFolder: selected });
      await TauriService.setPreference('download_folder', selected);
      onShowToast(`Pasta de downloads atualizada: ${selected}`);
    }
  };

  const handleSelectExportFolder = async () => {
    const selected = await TauriService.selectFolder('Selecionar pasta de exportações padrão');
    if (selected) {
      onUpdateSettings({ exportFolder: selected });
      await TauriService.setPreference('export_folder', selected);
      onShowToast(`Pasta de exportações atualizada: ${selected}`);
    }
  };

  const handleThemeChange = async (theme: ThemePreference) => {
    onUpdateSettings({ themePref: theme });
    await TauriService.setPreference('theme', theme);
    onShowToast(`Tema alterado para: ${theme}`);
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 32px 48px',
        maxWidth: 880,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--mint)',
            marginBottom: 6,
          }}
        >
          configurações
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
          Configurações
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Aparência, desempenho de processamento, pastas padrão e motores.
        </p>
      </div>

      {/* Appearance Section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
          Aparência e Tema
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {themes.map((t) => {
            const isSelected = settings.themePref === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: isSelected ? '1.5px solid var(--mint)' : '1px solid var(--line)',
                  background: isSelected ? 'var(--mint-dim)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--mint)' : 'var(--fg-dim)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '13px',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon name={t.icon} size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Performance & Concurrency */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
          Desempenho e Fila de Tarefas
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)' }}>
              Limite de tarefas simultâneas
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-faint)', marginTop: 2 }}>
              Controla o uso de CPU e memória para manter o computador ágil.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                const next = Math.max(1, settings.maxConcurrency - 1);
                onUpdateSettings({ maxConcurrency: next });
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              −
            </button>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '14px',
                fontWeight: 600,
                width: 24,
                textAlign: 'center',
                color: 'var(--fg)',
              }}
            >
              {settings.maxConcurrency}
            </span>
            <button
              onClick={() => {
                const next = Math.min(8, settings.maxConcurrency + 1);
                onUpdateSettings({ maxConcurrency: next });
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Folders Section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
          Pastas Padrão
        </h2>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Pasta padrão de downloads
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              readOnly
              value={settings.downloadFolder}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--fg)',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
              }}
            />
            <Button size="sm" variant="secondary" onClick={handleSelectDownloadFolder}>
              Alterar
            </Button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
            Pasta padrão de exportações e PDF
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              readOnly
              value={settings.exportFolder}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--fg)',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
              }}
            />
            <Button size="sm" variant="secondary" onClick={handleSelectExportFolder}>
              Alterar
            </Button>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <Switch
          label="Notificações de conclusão"
          desc="Exibe mensagem toast quando uma tarefa for finalizada"
          checked={settings.notifications}
          onChange={(val) => onUpdateSettings({ notifications: val })}
        />

        <Switch
          label="Salvar na mesma pasta do arquivo de origem"
          desc="Quando desmarcado, utiliza a pasta de exportação padrão"
          checked={settings.saveInSameFolder}
          onChange={(val) => onUpdateSettings({ saveInSameFolder: val })}
        />
      </div>

      {/* Components & Engine Status */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
          Motores e Componentes do Sistema
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {components.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--fg)' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--fg-dim)', marginTop: 2 }}>
                  {c.desc}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: c.status === 'installed' ? 'var(--mint)' : 'var(--fg-faint)',
                    background: 'var(--surface)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--line)',
                  }}
                >
                  {c.ver}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
