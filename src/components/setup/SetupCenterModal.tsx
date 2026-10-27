import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import {
  DependencyInfo,
  DependencyInstallProgress,
  SystemDiagnostics,
} from '../../types/dependencies';
import { TauriService } from '../../services/tauri';

interface SetupCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished: () => void;
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

type SetupStep = 'welcome' | 'system_check' | 'tool_setup' | 'ready';

export const SetupCenterModal: React.FC<SetupCenterModalProps> = ({
  isOpen,
  onClose,
  onFinished,
  onShowToast,
}) => {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  // Active installation state
  const [installingDep, setInstallingDep] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<DependencyInstallProgress | null>(null);
  const [installError, setInstallError] = useState<{ id: string; message: string; details?: string } | null>(null);
  const [copiedError, setCopiedError] = useState(false);

  // Load diagnostics
  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const diag = await TauriService.getSystemDiagnostics();
      setDiagnostics(diag);
    } catch (e: any) {
      onShowToast('Falha ao executar diagnóstico do sistema', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  // Listen to install progress events from backend
  useEffect(() => {
    const unlisten = TauriService.onDependencyInstallProgress((progress) => {
      setInstallProgress(progress);
      if (progress.phase === 'completed') {
        runDiagnostics();
      }
    });

    return () => {
      unlisten();
    };
  }, []);

  if (!isOpen) return null;

  const handleStartVerification = async () => {
    setStep('system_check');
    if (!diagnostics) {
      await runDiagnostics();
    }
  };

  const handleDismiss = async () => {
    try {
      await TauriService.completeFirstRun('dismissed');
      onShowToast('Configuração adiada. Você pode reabrir o assistente em Configurações.');
    } catch {
      // fallback
    }
    onClose();
  };

  const handleFinishSetup = async () => {
    try {
      await TauriService.completeFirstRun('completed');
      onShowToast('Arce Tools configurado com sucesso! Bem-vindo.');
    } catch {
      // fallback
    }
    onFinished();
  };

  const handleInstall = async (depId: string) => {
    setInstallingDep(depId);
    setInstallError(null);
    setCopiedError(false);
    setInstallProgress({
      dependencyId: depId,
      phase: 'downloading',
      bytesDownloaded: 0,
      percentage: 0,
      message: 'Conectando ao servidor oficial e iniciando transferência...',
    });

    try {
      await TauriService.installDependency(depId);
      onShowToast(`Componente ${depId} instalado e validado!`, 'ok');
      await runDiagnostics();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setInstallError({
        id: depId,
        message: 'Falha durante a instalação ou validação do componente.',
        details: errMsg,
      });
      onShowToast(`Erro ao instalar ${depId}: ${errMsg}`, 'err');
    } finally {
      setInstallingDep(null);
      setInstallProgress(null);
    }
  };

  const handleCopyInstallError = async () => {
    if (!installError) return;
    const report = [
      `=== ARCE TOOLS — RELATÓRIO DE ERRO DE DEPENDÊNCIA ===`,
      `Data: ${new Date().toISOString()}`,
      `Componente: ${installError.id}`,
      `Mensagem: ${installError.message}`,
      `Detalhes Técnicos: ${installError.details || 'Nenhum'}`,
      `======================================================`,
    ].join('\n');

    await TauriService.copyToClipboard(report);
    setCopiedError(true);
    onShowToast('Relatório de erro copiado para a área de transferência!', 'ok');
    setTimeout(() => setCopiedError(false), 2500);
  };

  const handleSelectCustomLibreOffice = async () => {
    const selected = await TauriService.selectFile({
      title: 'Localizar executável do LibreOffice (soffice.exe)',
      filters: [{ name: 'Executável', extensions: ['exe'] }],
    });

    if (selected) {
      try {
        await TauriService.setCustomLibreOfficePath(selected);
        onShowToast('Caminho do LibreOffice validado e configurado!', 'ok');
        await runDiagnostics();
      } catch (e: any) {
        onShowToast(`Executável inválido: ${e?.message || e}`, 'err');
      }
    }
  };

  const renderBadge = (status: DependencyInfo['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              fontWeight: 600,
              color: 'var(--mint)',
              background: 'rgba(21, 245, 186, 0.1)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(21, 245, 186, 0.25)',
            }}
          >
            <Icon name="check" size={12} /> Pronto
          </span>
        );
      case 'not_installed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              fontWeight: 600,
              color: 'var(--amber)',
              background: 'rgba(255, 170, 0, 0.1)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(255, 170, 0, 0.25)',
            }}
          >
            <Icon name="alert" size={12} /> Não instalado
          </span>
        );
      case 'optional':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontFamily: 'var(--mono)',
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
      case 'check_failed':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontFamily: 'var(--mono)',
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

  const ffmpegInfo = diagnostics?.dependencies.find((d) => d.id === 'ffmpeg');
  const ffprobeInfo = diagnostics?.dependencies.find((d) => d.id === 'ffprobe');
  const ytdlpInfo = diagnostics?.dependencies.find((d) => d.id === 'yt-dlp');
  const libreOfficeInfo = diagnostics?.dependencies.find((d) => d.id === 'libreoffice');

  const mediaReady = ffmpegInfo?.status === 'ready' && ffprobeInfo?.status === 'ready';
  const downloadReady = ytdlpInfo?.status === 'ready';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 9, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(21, 245, 186, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header with step indicators */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(21, 245, 186, 0.12)',
                border: '1px solid rgba(21, 245, 186, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mint)',
              }}
            >
              <Icon name="tool" size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
                Arce Tools — Assistente de Inicialização
              </div>
              <div style={{ fontSize: '11px', color: 'var(--fg-dim)', fontFamily: 'var(--mono)' }}>
                Configuração inteligente de dependências
              </div>
            </div>
          </div>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['welcome', 'system_check', 'tool_setup', 'ready'] as SetupStep[]).map((s) => (
              <div
                key={s}
                style={{
                  width: step === s ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: step === s ? 'var(--mint)' : 'var(--line)',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* STEP 1: WELCOME */}
          {step === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 6px' }}>
                  Vamos preparar seu Arce Tools
                </h1>
                <p style={{ fontSize: '13.5px', color: 'var(--fg-dim)', margin: 0, lineHeight: 1.5 }}>
                  Estamos verificando os componentes necessários para que suas ferramentas multimídia, de conversão e de download funcionem perfeitamente no seu computador.
                </p>
              </div>

              {/* Grid of Modules */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                {[
                  { name: 'Downloads', desc: 'YouTube, TikTok, Reels e 13+ fontes', icon: 'download' },
                  { name: 'Documentos', desc: 'União, divisão e PDF ↔ Word', icon: 'document' },
                  { name: 'Áudio', desc: 'Conversão, corte e normalização EBU', icon: 'audio' },
                  { name: 'Vídeo', desc: 'Compressão CRF e cortes precisos', icon: 'video' },
                  { name: 'Imagens', desc: 'Otimização Lanczos3 e lote', icon: 'image' },
                  { name: 'Poster Studio', desc: 'Mosaicos Rasterbator milimétricos', icon: 'poster' },
                ].map((mod) => (
                  <div
                    key={mod.name}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mint)' }}>
                      <Icon name={mod.icon as any} size={15} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                        {mod.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-dim)', lineHeight: 1.3 }}>
                      {mod.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(21, 245, 186, 0.05)',
                  border: '1px solid rgba(21, 245, 186, 0.2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--fg-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="check" size={16} />
                <span>
                  Instalação segura e isolada por usuário. Nenhuma alteração no PATH global ou permissões de administrador são necessárias.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: SYSTEM CHECK */}
          {step === 'system_check' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px', display: 'flex', alignItems: 'center' }}>
                  Verificação do Sistema
                  {loading && (
                    <span style={{ fontSize: '11px', color: 'var(--mint)', marginLeft: 8, fontWeight: 400, fontFamily: 'var(--mono)' }}>
                      (Analisando...)
                    </span>
                  )}
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--fg-dim)' }}>
                  Análise automatizada de compatibilidade de arquitetura, permissões e componentes.
                </div>
              </div>

              {/* System Specs Box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                }}
              >
                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Sistema Operacional</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>
                    {diagnostics?.osVersion || 'Windows 11'} ({diagnostics?.arch})
                  </div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Permissão no Diretório de Dados</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: diagnostics?.hasWritePermission ? 'var(--mint)' : 'var(--pink)', marginTop: 2 }}>
                    {diagnostics?.hasWritePermission ? 'Permitida (Gravação OK)' : 'Bloqueada'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Espaço Livre em Disco</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>
                    {(diagnostics?.availableDiskSpaceMb || 0) > 1024
                      ? `${((diagnostics?.availableDiskSpaceMb || 0) / 1024).toFixed(1)} GB disponíveis`
                      : `${diagnostics?.availableDiskSpaceMb || 0} MB disponíveis`}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>Conexão com a Internet</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: diagnostics?.internetConnected ? 'var(--mint)' : 'var(--amber)', marginTop: 2 }}>
                    {diagnostics?.internetConnected ? 'Conectado (HTTPS OK)' : 'Sem conexão'}
                  </div>
                </div>
              </div>

              {/* Dependencies Summary List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                  Status dos Componentes:
                </div>
                {diagnostics?.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>
                        {dep.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>
                        {dep.version ? `Versão ${dep.version}` : dep.description}
                      </div>
                    </div>
                    <div>{renderBadge(dep.status)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: TOOL SETUP */}
          {step === 'tool_setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>
                  Configuração das Ferramentas
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--fg-dim)' }}>
                  Instale os utilitários com apenas um clique para habilitar todo o potencial do Arce Tools.
                </div>
              </div>

              {/* Progress bar during install */}
              {installingDep && (
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--mint)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mint)' }}>
                      Instalando componente: {installingDep}...
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
                      {installProgress?.percentage || 0}%
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${installProgress?.percentage || 0}%`,
                        background: 'var(--mint)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>
                    {installProgress?.message || 'Processando transferência...'}
                  </div>
                </div>
              )}

              {/* Error card if installation failed */}
              {installError && (
                <div
                  style={{
                    background: 'rgba(255, 77, 141, 0.08)',
                    border: '1px solid var(--pink)',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink)', fontWeight: 600, fontSize: '13px' }}>
                    <Icon name="alert" size={16} />
                    {installError.message}
                  </div>
                  {installError.details && (
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--fg-dim)',
                        background: 'var(--surface)',
                        padding: 8,
                        borderRadius: 6,
                        maxHeight: 80,
                        overflowY: 'auto',
                      }}
                    >
                      {installError.details}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Button size="sm" variant="primary" onClick={() => handleInstall(installError.id)}>
                      Tentar novamente
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCopyInstallError}>
                      {copiedError ? 'Copiado!' : 'Copiar erro'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Card 1: FFmpeg & ffprobe */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--fg)' }}>
                      Ferramentas de Áudio e Vídeo (FFmpeg + ffprobe)
                    </div>
                    {renderBadge(mediaReady ? 'ready' : 'not_installed')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 4 }}>
                    Habilita conversão e compressão de MP4/MKV, normalização EBU R128 e waveforms. (~35 MB)
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--fg-faint)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    Origem: Gyan.dev (Distribuidor oficial do projeto FFmpeg)
                  </div>
                </div>

                {!mediaReady && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!!installingDep}
                    onClick={() => handleInstall('ffmpeg')}
                  >
                    Instalar
                  </Button>
                )}
              </div>

              {/* Card 2: yt-dlp */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--fg)' }}>
                      Motor de Downloads (yt-dlp)
                    </div>
                    {renderBadge(downloadReady ? 'ready' : 'not_installed')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 4 }}>
                    Download de vídeos e áudios de fontes permitidas sem violação de DRM. (~18 MB)
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--fg-faint)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    Origem: GitHub Releases oficial do yt-dlp
                  </div>
                </div>

                {!downloadReady && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!!installingDep}
                    onClick={() => handleInstall('yt-dlp')}
                  >
                    Instalar
                  </Button>
                )}
              </div>

              {/* Card 3: LibreOffice (Optional) */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--fg)' }}>
                        LibreOffice — Opcional
                      </div>
                      {renderBadge(libreOfficeInfo?.status || 'optional')}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 4 }}>
                      Necessário somente para algumas conversões complexas de documentos do Word (.docx) para PDF.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="secondary" onClick={runDiagnostics}>
                    Detectar novamente
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleSelectCustomLibreOffice}>
                    Configurar caminho
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onShowToast('Comando copiado: winget install TheDocumentFoundation.LibreOffice')}
                  >
                    Copiar comando winget
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: READY */}
          {step === 'ready' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(21, 245, 186, 0.15)',
                  border: '1px solid var(--mint)',
                  color: 'var(--mint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <Icon name="check" size={28} />
              </div>

              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 6px' }}>
                  Tudo pronto para começar!
                </h1>
                <p style={{ fontSize: '13.5px', color: 'var(--fg-dim)', margin: 0 }}>
                  Seu ambiente foi configurado e validado. Você já pode desfrutar de todas as ferramentas do Arce Tools.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
                  Resumo das suas ferramentas:
                </div>
                <div style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="check" size={14} /> Pôsteres, Imagens e Documentos: 100% nativos e operacionais
                </div>
                <div style={{ fontSize: '12px', color: mediaReady ? 'var(--fg-dim)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={mediaReady ? 'check' : 'alert'} size={14} />
                  Áudio e Vídeo: {mediaReady ? 'Motores FFmpeg ativos' : 'Requer instalação posterior'}
                </div>
                <div style={{ fontSize: '12px', color: downloadReady ? 'var(--fg-dim)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={downloadReady ? 'check' : 'alert'} size={14} />
                  Downloads: {downloadReady ? 'Motor yt-dlp ativo' : 'Requer instalação posterior'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {step === 'welcome' && (
            <>
              <Button variant="ghost" onClick={handleDismiss}>
                Configurar depois
              </Button>
              <Button variant="primary" onClick={handleStartVerification}>
                Verificar meu computador
              </Button>
            </>
          )}

          {step === 'system_check' && (
            <>
              <Button variant="ghost" onClick={() => setStep('welcome')}>
                Voltar
              </Button>
              <Button variant="primary" onClick={() => setStep('tool_setup')}>
                Continuar para Ferramentas
              </Button>
            </>
          )}

          {step === 'tool_setup' && (
            <>
              <Button variant="ghost" onClick={() => setStep('system_check')}>
                Voltar
              </Button>
              <Button variant="primary" onClick={() => setStep('ready')} disabled={!!installingDep}>
                Concluir Configuração
              </Button>
            </>
          )}

          {step === 'ready' && (
            <>
              <div />
              <Button variant="primary" onClick={handleFinishSetup}>
                Começar a usar o Arce Tools
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
