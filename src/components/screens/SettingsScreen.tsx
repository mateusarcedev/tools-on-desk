import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AppSettings, ThemePreference } from '../../types/settings';
import { TauriService } from '../../services/tauri';
import { ErrorLogStats } from '../../types/errorLog';
import { DependencyInfo, DependencyInstallProgress } from '../../types/dependencies';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onOpenSetupCenter?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
  onOpenSetupCenter,
}) => {
  const [errorStats, setErrorStats] = useState<ErrorLogStats | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);

  const [dependencies, setDependencies] = useState<DependencyInfo[]>([]);
  const [installingDep, setInstallingDep] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<DependencyInstallProgress | null>(null);

  const loadDependencies = async () => {
    try {
      const deps = await TauriService.getDependenciesStatus();
      setDependencies(deps);
    } catch (err) {
      console.warn('Failed to load dependencies:', err);
    }
  };

  useEffect(() => {
    TauriService.getErrorStats()
      .then((stats) => setErrorStats(stats))
      .catch(() => {});

    loadDependencies();

    const unlisten = TauriService.onDependencyInstallProgress((prog) => {
      setInstallProgress(prog);
      if (prog.phase === 'completed') {
        loadDependencies();
      }
    });

    return () => {
      unlisten();
    };
  }, []);

  const handleInstallDep = async (depId: string) => {
    setInstallingDep(depId);
    onShowToast(`Iniciando instalação de ${depId}...`, 'ok');
    try {
      await TauriService.installDependency(depId);
      onShowToast(`Componente ${depId} instalado e validado com sucesso!`, 'ok');
      await loadDependencies();
    } catch (err: any) {
      onShowToast(`Erro ao instalar ${depId}: ${err?.message || err}`, 'err');
    } finally {
      setInstallingDep(null);
      setInstallProgress(null);
    }
  };

  const handleUpdateDep = async (depId: string) => {
    setInstallingDep(depId);
    onShowToast(`Buscando atualizações para ${depId}...`, 'ok');
    try {
      await TauriService.updateDependency(depId);
      onShowToast(`Componente ${depId} atualizado com sucesso!`, 'ok');
      await loadDependencies();
    } catch (err: any) {
      onShowToast(`Erro ao atualizar ${depId}: ${err?.message || err}`, 'err');
    } finally {
      setInstallingDep(null);
      setInstallProgress(null);
    }
  };

  const handleVerifyDep = async (depId: string) => {
    onShowToast(`Verificando integridade de ${depId}...`);
    try {
      const updated = await TauriService.verifyDependency(depId);
      setDependencies((prev) => prev.map((d) => (d.id === depId ? updated : d)));
      onShowToast(`Verificação concluída: status ${updated.status}`);
    } catch (err: any) {
      onShowToast(`Falha na checagem: ${err?.message || err}`, 'err');
    }
  };

  const handleRemoveDep = async (depId: string) => {
    try {
      await TauriService.removeManagedDependency(depId);
      onShowToast(`Componente gerenciado ${depId} removido com sucesso.`);
      await loadDependencies();
    } catch (err: any) {
      onShowToast(`Erro ao remover: ${err?.message || err}`, 'err');
    }
  };

  const handleSelectLibreOfficeCustom = async () => {
    const selected = await TauriService.selectFile({
      title: 'Localizar soffice.exe do LibreOffice',
      filters: [{ name: 'Executável', extensions: ['exe'] }],
    });
    if (selected) {
      try {
        await TauriService.setCustomLibreOfficePath(selected);
        onShowToast('Caminho do LibreOffice configurado com sucesso!');
        await loadDependencies();
      } catch (err: any) {
        onShowToast(`Falha ao validar LibreOffice: ${err?.message || err}`, 'err');
      }
    }
  };

  const themes: { id: ThemePreference; label: string; icon: string }[] = [
    { id: 'Escuro', label: 'Escuro', icon: 'moon' },
    { id: 'Claro', label: 'Claro', icon: 'sun' },
    { id: 'Sistema', label: 'Sistema', icon: 'system' },
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

      {/* Ferramentas e Dependências (Missão 05) */}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              Ferramentas e Dependências
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: 2 }}>
              Gerencie os utilitários externos, instalações isoladas por usuário e atualizações automáticas.
            </div>
          </div>

          {onOpenSetupCenter && (
            <Button size="sm" variant="secondary" onClick={onOpenSetupCenter}>
              <Icon name="tool" size={14} /> Reabrir Assistente de Configuração
            </Button>
          )}
        </div>

        {/* Active installation / update progress banner */}
        {installingDep && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--mint)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mint)' }}>
                Processando: {installingDep}
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
                {installProgress?.percentage || 0}%
              </div>
            </div>

            <div style={{ width: '100%', height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${installProgress?.percentage || 0}%`,
                  background: 'var(--mint)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>
              {installProgress?.message || 'Transferindo dados com validação TLS/SHA-256...'}
            </div>
          </div>
        )}

        {/* Managed & External Dependencies List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dependencies.map((dep) => {
            const formatOrigin = (orig: string) => {
              switch (orig) {
                case 'managed':
                  return 'Gerenciado pelo Arce Tools (%LOCALAPPDATA%)';
                case 'win_get':
                  return 'Instalação WinGet';
                case 'system_path':
                  return 'PATH do Sistema';
                case 'custom_path':
                  return 'Caminho Personalizado';
                default:
                  return 'Não instalado';
              }
            };

            const getBadge = () => {
              switch (dep.status) {
                case 'ready':
                  return (
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--mint)',
                        background: 'rgba(21, 245, 186, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(21, 245, 186, 0.25)',
                      }}
                    >
                      Pronto
                    </span>
                  );
                case 'not_installed':
                  return (
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--amber)',
                        background: 'rgba(255, 170, 0, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(255, 170, 0, 0.25)',
                      }}
                    >
                      Não instalado
                    </span>
                  );
                case 'optional':
                  return (
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--fg-dim)',
                        background: 'var(--surface-2)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--line)',
                      }}
                    >
                      Opcional
                    </span>
                  );
                default:
                  return (
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--pink)',
                        background: 'rgba(255, 77, 141, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(255, 77, 141, 0.25)',
                      }}
                    >
                      Falha na checagem
                    </span>
                  );
              }
            };

            return (
              <div
                key={dep.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>
                        {dep.name}
                      </span>
                      {getBadge()}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 2 }}>
                      {dep.description}
                    </div>
                  </div>

                  {/* Actions depending on state */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {(dep.status === 'not_installed' || dep.canInstall) && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!!installingDep}
                        onClick={() => handleInstallDep(dep.id)}
                      >
                        Instalar
                      </Button>
                    )}

                    {dep.canUpdate && dep.status === 'ready' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!installingDep}
                        onClick={() => handleUpdateDep(dep.id)}
                      >
                        Atualizar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!!installingDep}
                      onClick={() => handleVerifyDep(dep.id)}
                    >
                      Verificar
                    </Button>

                    {dep.isManaged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!installingDep}
                        onClick={() => handleRemoveDep(dep.id)}
                      >
                        Remover
                      </Button>
                    )}

                    {dep.id === 'libreoffice' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!installingDep}
                        onClick={handleSelectLibreOfficeCustom}
                      >
                        Configurar caminho
                      </Button>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 8,
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--fg-dim)' }}>Versão: </span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
                      {dep.version || 'Não detectada'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--fg-dim)' }}>Origem: </span>
                    <span style={{ color: 'var(--fg)' }}>{formatOrigin(dep.origin)}</span>
                  </div>

                  {dep.path && (
                    <div style={{ gridColumn: '1 / -1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--fg-dim)' }}>Caminho: </span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-faint)', fontSize: '10.5px' }}>
                        {dep.path}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Native Engines Summary */}
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--fg-dim)' }}>
            Componentes Nativos Internos (Sem Dependências Externas):
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '11px', color: 'var(--fg-dim)' }}>
            <div>• Motor Rust Nativo 1.99 MSVC</div>
            <div>• Motor de Imagens (Lanczos3)</div>
            <div>• Poster Studio (PDF 1.4 Vectorial)</div>
            <div>• Document Engine (lopdf + docx-rs)</div>
            <div>• Banco de Dados SQLite (rusqlite WAL)</div>
          </div>
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
