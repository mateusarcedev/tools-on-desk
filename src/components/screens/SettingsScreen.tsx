import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AppSettings, ThemePreference } from '../../types/settings';
import { TauriService } from '../../services/tauri';
import { ExternalToolsStatus } from '../../types/tools';
import { LibreOfficeStatus } from '../../types/document';
import { ErrorLogStats } from '../../types/errorLog';

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
  const [toolsStatus, setToolsStatus] = useState<ExternalToolsStatus | null>(null);
  const [libreOfficeStatus, setLibreOfficeStatus] = useState<LibreOfficeStatus | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorLogStats | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);

  useEffect(() => {
    TauriService.checkExternalTools()
      .then((status) => setToolsStatus(status))
      .catch(() => {});

    TauriService.checkLibreOfficeStatus()
      .then((status) => setLibreOfficeStatus(status))
      .catch(() => {});

    TauriService.getErrorStats()
      .then((stats) => setErrorStats(stats))
      .catch(() => {});
  }, []);

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
      ver: '0.25 (Lanczos3)',
      status: 'installed',
    },
    {
      id: 'ffmpeg',
      name: 'FFmpeg Multimídia',
      desc: 'Conversão, compressão e recorte de áudio e vídeo de alta performance',
      ver: toolsStatus?.ffmpeg.available
        ? `${toolsStatus.ffmpeg.version?.split(' ')[2] || '8.1.1'} (${toolsStatus.ffmpeg.license || 'Operacional'})`
        : 'Não detectado',
      status: toolsStatus?.ffmpeg.available ? 'installed' : 'missing',
    },
    {
      id: 'ffprobe',
      name: 'ffprobe Inspector',
      desc: 'Inspeção precisa de streams, codecs, taxas de amostragem e durações',
      ver: toolsStatus?.ffprobe.available
        ? `${toolsStatus.ffprobe.version?.split(' ')[2] || '8.1.1'}`
        : 'Não detectado',
      status: toolsStatus?.ffprobe.available ? 'installed' : 'missing',
    },
    {
      id: 'ytdlp',
      name: 'yt-dlp',
      desc: 'Downloads de fontes permitidas sem bypass de DRM e com respeito a direitos autorais',
      ver: toolsStatus?.ytDlp.available
        ? `${toolsStatus.ytDlp.version || '2026.10.26'} (${toolsStatus.ytDlp.license || 'Unlicense'})`
        : 'Não detectado',
      status: toolsStatus?.ytDlp.available ? 'installed' : 'missing',
    },
    {
      id: 'docengine',
      name: 'Document Engine (lopdf + docx-rs)',
      desc: 'Inspeção, divisão, mesclagem, rotação e conversão estruturada PDF ↔ DOCX',
      ver: 'lopdf 0.46 + docx-rs 0.4',
      status: 'installed',
    },
    {
      id: 'lo',
      name: 'LibreOffice Headless',
      desc: 'Conversões avançadas de Word para PDF com fidelidade de layout e fontes',
      ver: libreOfficeStatus?.isAvailable
        ? `${libreOfficeStatus.version || 'Ativo'} (${libreOfficeStatus.path || 'Local'})`
        : 'Não detectado',
      status: libreOfficeStatus?.isAvailable ? 'installed' : 'missing',
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
          08 · preferências
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            margin: '0 0 6px',
          }}
        >
          Configurações do Arce Tools
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '13.5px', margin: 0 }}>
          Personalize aparência, pastas de destino, concorrência e verifique o estado dos motores nativos.
        </p>
      </div>

      {/* Theme Section */}
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
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: isSelected ? '1.5px solid var(--mint)' : '1px solid var(--line)',
                  background: isSelected ? 'var(--mint-dim)' : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  color: isSelected ? 'var(--mint)' : 'var(--fg)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon name={t.icon} size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Concurrency */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
            Tarefas simultâneas (Concorrência)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: 2 }}>
            Número máximo de conversões executadas em paralelo pelo TaskManager
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--line)',
              borderRadius: 8,
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                const next = Math.max(1, settings.maxConcurrency - 1);
                onUpdateSettings({ maxConcurrency: next });
              }}
              style={{
                width: 32,
                height: 32,
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              −
            </button>
            <span
              style={{
                width: 32,
                textAlign: 'center',
                fontFamily: 'var(--mono)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--mint)',
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
                background: 'transparent',
                border: 'none',
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

      {/* Diagnostics and Error Logs Section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>
            Diagnósticos e Registros de Erros
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>
            Gerencie o histórico persistente de erros e diagnósticos técnicos mantidos no SQLite local.
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Registros Armazenados</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg)', marginTop: 2 }}>
              {errorStats?.total ?? 0}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--pink)' }}>Não Resolvidos</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--pink)', marginTop: 2 }}>
              {errorStats?.unresolved ?? 0}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Uso em Disco (SQLite)</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--mint)',
                marginTop: 2,
                fontFamily: 'var(--mono)',
              }}
            >
              {((errorStats?.databaseSizeBytes || 0) / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>

        {/* Retention Policy */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)' }}>
              Política de retenção de registros
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 2 }}>
              Registros com data anterior ao período selecionado podem ser eliminados
            </div>
          </div>

          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
            style={{
              height: 32,
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '0 10px',
              color: 'var(--fg)',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value={7}>Manter últimos 7 dias</option>
            <option value={30}>Manter últimos 30 dias</option>
            <option value={90}>Manter últimos 90 dias</option>
            <option value={0}>Limpar todos os registros</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const allLogs = await TauriService.getAllErrorLogsForExport();
              const jsonStr = JSON.stringify(allLogs, null, 2);
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `arce-tools-diagnostico-completo-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              onShowToast('Relatório completo exportado com sucesso!');
            }}
          >
            Exportar relatório JSON
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              const days = retentionDays === 0 ? undefined : retentionDays;
              const count = await TauriService.clearErrorLogs(days);
              const updated = await TauriService.getErrorStats();
              setErrorStats(updated);
              onShowToast(`${count} registros removidos de acordo com a política selecionada`, 'warn');
            }}
          >
            {retentionDays === 0 ? 'Limpar todo o histórico' : `Limpar registros > ${retentionDays} dias`}
          </Button>
        </div>
      </div>
    </div>
  );
};
