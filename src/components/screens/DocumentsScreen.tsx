import React, { useEffect, useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { DropZone } from '../common/DropZone';
import { TauriService } from '../../services/tauri';
import { LibreOfficeStatus, PdfInfo, PdfPageAction } from '../../types/document';

interface DocumentsScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

type DocumentTool = 'pdf2word' | 'word2pdf' | 'merge' | 'split' | 'organize' | 'compress';

interface MergeFileItem {
  path: string;
  name: string;
  sizeFormatted?: string;
  pageCount?: number;
}

interface PageItem {
  originalPage: number;
  rotationDeg: number;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onShowToast }) => {
  const [activeTool, setActiveTool] = useState<DocumentTool>('pdf2word');

  // Single file state (PDF to Word, Word to PDF, Split, Organize, Compress)
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [inspecting, setInspecting] = useState(false);

  // LibreOffice state (Word to PDF)
  const [libreOffice, setLibreOffice] = useState<LibreOfficeStatus | null>(null);
  const [checkingLo, setCheckingLo] = useState(false);

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<MergeFileItem[]>([]);
  const [mergeOutputName, setMergeOutputName] = useState('documento_unido.pdf');

  // Split state
  const [splitMode, setSplitMode] = useState<'all' | 'ranges' | 'every_n'>('all');
  const [splitRanges, setSplitRanges] = useState('1-3, 5');
  const [splitEveryN, setSplitEveryN] = useState(2);
  const [splitExportSingle, setSplitExportSingle] = useState(false);

  // Organize state
  const [pagesList, setPagesList] = useState<PageItem[]>([]);

  // Compress state
  const [compressLevel, setCompressLevel] = useState<'lossless' | 'recommended' | 'extreme'>('recommended');

  // PDF to DOCX mode
  const [pdfToDocxMode, setPdfToDocxMode] = useState<'editable_text' | 'layout_preserve'>('editable_text');

  // General processing flag
  const [processing, setProcessing] = useState(false);

  // Tool tabs
  const tools: { id: DocumentTool; label: string }[] = [
    { id: 'pdf2word', label: 'PDF → Word' },
    { id: 'word2pdf', label: 'Word → PDF' },
    { id: 'merge', label: 'Unir PDFs' },
    { id: 'split', label: 'Dividir PDF' },
    { id: 'organize', label: 'Organizar páginas' },
    { id: 'compress', label: 'Comprimir PDF' },
  ];

  // Inspect PDF whenever selectedFile changes (if not in Word to PDF)
  useEffect(() => {
    if (activeTool === 'word2pdf') {
      setPdfInfo(null);
      return;
    }

    if (selectedFile && selectedFile.toLowerCase().endsWith('.pdf')) {
      setInspecting(true);
      TauriService.inspectPdf(selectedFile)
        .then((info) => {
          setPdfInfo(info);
          if (activeTool === 'organize') {
            setPagesList(
              info.pages.map((p) => ({
                originalPage: p.pageNumber,
                rotationDeg: p.rotationDeg || 0,
              }))
            );
          }
        })
        .catch((err) => {
          console.warn('PDF inspection failed:', err);
          setPdfInfo(null);
          onShowToast(`Não foi possível inspecionar o PDF: ${err}`, 'err');
        })
        .finally(() => setInspecting(false));
    } else {
      setPdfInfo(null);
      setPagesList([]);
    }
  }, [selectedFile, activeTool]);

  // Check LibreOffice status on mount or when switching to word2pdf
  useEffect(() => {
    if (activeTool === 'word2pdf' && !libreOffice) {
      setCheckingLo(true);
      TauriService.checkLibreOfficeStatus()
        .then((status) => setLibreOffice(status))
        .catch((err) => console.warn('LibreOffice check failed:', err))
        .finally(() => setCheckingLo(false));
    }
  }, [activeTool, libreOffice]);

  // Handler for selecting single file via native dialog
  const handleSelectSingleFile = async () => {
    const isWord = activeTool === 'word2pdf';
    const extensions = isWord ? ['docx', 'doc', 'odt', 'rtf', 'txt'] : ['pdf'];
    const title = isWord ? 'Selecionar documento Word/Writer' : 'Selecionar arquivo PDF';

    const selected = await TauriService.selectFiles({
      multiple: false,
      extensions,
      title,
    });

    if (selected && selected.length > 0) {
      setSelectedFile(selected[0]);
    }
  };

  // Handler for dropping single file
  const handleDropSingle = (filesList: FileList | File[]) => {
    const file = filesList[0];
    if (!file) return;

    const path = (file as any).path || file.name;
    setSelectedFile(path);
  };

  // Merge: select multiple files
  const handleSelectMergeFiles = async () => {
    const selected = await TauriService.selectFiles({
      multiple: true,
      extensions: ['pdf'],
      title: 'Selecionar arquivos PDF para unir',
    });

    if (selected.length > 0) {
      addMergeFiles(selected);
    }
  };

  const handleDropMerge = (filesList: FileList | File[]) => {
    const paths = Array.from(filesList).map((f) => (f as any).path || f.name);
    addMergeFiles(paths);
  };

  const addMergeFiles = async (paths: string[]) => {
    const newItems: MergeFileItem[] = [];
    for (const p of paths) {
      const fileName = p.split(/[/\\]/).pop() || p;
      try {
        const info = await TauriService.inspectPdf(p);
        newItems.push({
          path: p,
          name: fileName,
          sizeFormatted: info.fileSizeFormatted,
          pageCount: info.pageCount,
        });
      } catch {
        newItems.push({ path: p, name: fileName });
      }
    }
    setMergeFiles((prev) => [...prev, ...newItems]);
    onShowToast(`${paths.length} PDF(s) adicionado(s) à lista de união`);
  };

  const moveMergeFile = (index: number, direction: 'up' | 'down') => {
    setMergeFiles((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Organize: page manipulation
  const movePage = (index: number, direction: 'left' | 'right') => {
    setPagesList((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const rotatePage = (index: number) => {
    setPagesList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, rotationDeg: (item.rotationDeg + 90) % 360 } : item
      )
    );
  };

  const removePage = (index: number) => {
    setPagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const rotateAllPages = () => {
    setPagesList((prev) =>
      prev.map((item) => ({ ...item, rotationDeg: (item.rotationDeg + 90) % 360 }))
    );
  };

  const resetPages = () => {
    if (pdfInfo) {
      setPagesList(
        pdfInfo.pages.map((p) => ({
          originalPage: p.pageNumber,
          rotationDeg: p.rotationDeg || 0,
        }))
      );
    }
  };

  // Parse split ranges for preview
  const parseRangesCount = (rangeStr: string, totalPages: number): number => {
    const parts = rangeStr.split(',');
    const pages = new Set<number>();
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const s = parseInt(startStr, 10);
        const e = parseInt(endStr, 10);
        if (!isNaN(s) && !isNaN(e) && s > 0 && e >= s) {
          for (let p = s; p <= Math.min(e, totalPages); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p > 0 && p <= totalPages) {
          pages.add(p);
        }
      }
    }
    return pages.size;
  };

  // Execution Handlers
  const handleExecute = async () => {
    setProcessing(true);
    try {
      if (activeTool === 'pdf2word') {
        if (!selectedFile) {
          onShowToast('Selecione um arquivo PDF para converter', 'warn');
          return;
        }
        if (pdfInfo?.isEncrypted) {
          onShowToast('O PDF está protegido por senha. Desproteja-o antes de converter.', 'err');
          return;
        }

        await TauriService.startPdfToDocx({
          sourcePath: selectedFile,
          mode: pdfToDocxMode,
        });
        onShowToast('Conversão de PDF para Word (.docx) iniciada!', 'ok');
      } else if (activeTool === 'word2pdf') {
        if (!selectedFile) {
          onShowToast('Selecione um documento Word/Writer para converter', 'warn');
          return;
        }

        if (libreOffice && !libreOffice.isAvailable) {
          onShowToast(
            'LibreOffice não foi detectado no sistema. A conversão offline requer o LibreOffice instalado.',
            'warn'
          );
        }

        await TauriService.startWordToPdf({
          sourcePath: selectedFile,
        });
        onShowToast('Conversão Word para PDF enviada para a fila de tarefas!', 'ok');
      } else if (activeTool === 'merge') {
        if (mergeFiles.length < 2) {
          onShowToast('Adicione pelo menos 2 arquivos PDF para unir', 'warn');
          return;
        }

        const sysInfo = await TauriService.getSystemInfo();
        const targetPath = `${sysInfo.defaultExportFolder}\\${mergeOutputName.trim() || 'documento_unido.pdf'}`;

        await TauriService.startPdfMerge({
          sourcePaths: mergeFiles.map((f) => f.path),
          targetPath,
        });
        onShowToast(`União de ${mergeFiles.length} PDFs iniciada!`, 'ok');
      } else if (activeTool === 'split') {
        if (!selectedFile) {
          onShowToast('Selecione um arquivo PDF para dividir', 'warn');
          return;
        }

        const sysInfo = await TauriService.getSystemInfo();
        await TauriService.startPdfSplit({
          sourcePath: selectedFile,
          targetDir: sysInfo.defaultExportFolder,
          mode: splitMode,
          ranges: splitMode === 'ranges' ? splitRanges : undefined,
          everyN: splitMode === 'every_n' ? splitEveryN : undefined,
          exportSingle: splitExportSingle,
        });
        onShowToast('Operação de divisão de PDF iniciada!', 'ok');
      } else if (activeTool === 'organize') {
        if (!selectedFile) {
          onShowToast('Selecione um arquivo PDF para organizar', 'warn');
          return;
        }
        if (pagesList.length === 0) {
          onShowToast('O documento não possui páginas válidas para exportar', 'warn');
          return;
        }

        const sysInfo = await TauriService.getSystemInfo();
        const baseName = selectedFile.split(/[/\\]/).pop()?.replace(/\.pdf$/i, '') || 'documento';
        const targetPath = `${sysInfo.defaultExportFolder}\\${baseName}_organizado.pdf`;

        const pagesPayload: PdfPageAction[] = pagesList.map((p) => ({
          originalPage: p.originalPage,
          rotationDeg: p.rotationDeg,
        }));

        await TauriService.startPdfOrganize({
          sourcePath: selectedFile,
          targetPath,
          pages: pagesPayload,
        });
        onShowToast(`Novo PDF organizado (${pagesList.length} páginas) em processamento!`, 'ok');
      } else if (activeTool === 'compress') {
        if (!selectedFile) {
          onShowToast('Selecione um arquivo PDF para comprimir', 'warn');
          return;
        }

        const sysInfo = await TauriService.getSystemInfo();
        const baseName = selectedFile.split(/[/\\]/).pop()?.replace(/\.pdf$/i, '') || 'documento';
        const targetPath = `${sysInfo.defaultExportFolder}\\${baseName}_comprimido.pdf`;

        await TauriService.startPdfCompress({
          sourcePath: selectedFile,
          targetPath,
          level: compressLevel,
        });
        onShowToast(`Compressão estrutural em andamento!`, 'ok');
      }
    } catch (err: any) {
      onShowToast(`Erro ao iniciar operação: ${err}`, 'err');
    } finally {
      setProcessing(false);
    }
  };

  const copyWingetCommand = async () => {
    const cmd = 'winget install TheDocumentFoundation.LibreOffice';
    await TauriService.copyToClipboard(cmd);
    onShowToast('Comando winget copiado para a área de transferência!', 'ok');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Sub-toolbar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-soft)',
        }}
      >
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {tools.map((t) => {
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  setSelectedFile(null);
                  setPdfInfo(null);
                }}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 7,
                  border: isSelected ? '1px solid var(--mint-edge)' : '1px solid transparent',
                  background: isSelected ? 'var(--mint-dim)' : 'transparent',
                  color: isSelected ? 'var(--mint)' : 'var(--fg-dim)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {((activeTool !== 'merge' && selectedFile) || (activeTool === 'merge' && mergeFiles.length > 0)) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedFile(null);
              setPdfInfo(null);
              setMergeFiles([]);
              setPagesList([]);
            }}
          >
            Limpar seleção
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 48px',
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ======================================================== */}
        {/* 1. PDF TO WORD */}
        {/* ======================================================== */}
        {activeTool === 'pdf2word' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Conversor PDF para Word (.docx)
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Extrai o texto estruturado, parágrafos e cabeçalhos do PDF diretamente para um documento DOCX nativo editável, 100% offline.
              </p>
            </div>

            {!selectedFile ? (
              <DropZone
                onFilesSelected={handleDropSingle}
                accept=".pdf"
                multiple={false}
                title="Solte seu arquivo PDF aqui"
                subtitle="ou clique para navegar no computador"
                actionText="Selecionar PDF"
              />
            ) : (
              renderPdfInspectorCard(selectedFile, pdfInfo, inspecting, handleSelectSingleFile)
            )}

            {selectedFile && pdfInfo && (
              <div
                style={{
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                  Modo de conversão
                </div>
                <div>
                  <SegmentedControl
                    options={['Texto editável', 'Preservar layout']}
                    value={pdfToDocxMode === 'editable_text' ? 'Texto editável' : 'Preservar layout'}
                    onChange={(val) =>
                      setPdfToDocxMode(val === 'Texto editável' ? 'editable_text' : 'layout_preserve')
                    }
                    size="sm"
                  />
                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 8 }}>
                    {pdfToDocxMode === 'editable_text'
                      ? 'Recomendado: reconstrói texto corrido com títulos e formatação fluida no Microsoft Word.'
                      : 'Preserva blocos visuais de texto em páginas isoladas.'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <Button
                    variant="primary"
                    onClick={handleExecute}
                    disabled={processing || pdfInfo.isEncrypted}
                  >
                    Converter para Word (.docx)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* 2. WORD TO PDF */}
        {/* ======================================================== */}
        {activeTool === 'word2pdf' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Conversor Word para PDF
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Converte arquivos DOCX, DOC e ODT em PDFs de alta fidelidade utilizando o motor LibreOffice Headless com perfil isolado.
              </p>
            </div>

            {/* LibreOffice Status Card */}
            <div
              style={{
                background: 'var(--surface)',
                border: `1px solid ${libreOffice?.isAvailable ? 'var(--mint-edge)' : 'var(--amber-edge, var(--line))'}`,
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: libreOffice?.isAvailable ? 'var(--mint-dim)' : 'var(--amber-dim, var(--surface-2))',
                  display: 'grid',
                  placeItems: 'center',
                  color: libreOffice?.isAvailable ? 'var(--mint)' : 'var(--amber, #f59e0b)',
                  flexShrink: 0,
                }}
              >
                <Icon name={libreOffice?.isAvailable ? 'check' : 'alert'} size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                  {checkingLo
                    ? 'Verificando presença do LibreOffice...'
                    : libreOffice?.isAvailable
                    ? `LibreOffice Ativo ${libreOffice.version ? `(${libreOffice.version})` : ''}`
                    : 'LibreOffice não detectado'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: 4, lineHeight: 1.45 }}>
                  {libreOffice?.isAvailable ? (
                    <span>
                      Motor de renderização headless pronto para conversão offline segura sem macros nem telemetria.
                    </span>
                  ) : (
                    <div>
                      <span>
                        Para converter DOCX para PDF com fidelidade 100% nativa sem nuvem, instale o LibreOffice via terminal do Windows:
                      </span>
                      <div
                        style={{
                          marginTop: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'var(--surface-2)',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontFamily: 'var(--mono)',
                          fontSize: '11.5px',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span>winget install TheDocumentFoundation.LibreOffice</span>
                        <button
                          onClick={copyWingetCommand}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--mint)',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                          title="Copiar comando"
                        >
                          <Icon name="copy" size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!selectedFile ? (
              <DropZone
                onFilesSelected={handleDropSingle}
                accept=".docx,.doc,.odt,.rtf,.txt"
                multiple={false}
                title="Solte seu arquivo Word ou Writer aqui"
                subtitle="formatos aceitos: .docx, .doc, .odt"
                actionText="Selecionar documento"
              />
            ) : (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                    {selectedFile.split(/[/\\]/).pop()}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)', marginTop: 2 }}>
                    {selectedFile}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={handleSelectSingleFile}>
                  Alterar arquivo
                </Button>
              </div>
            )}

            {selectedFile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button variant="primary" onClick={handleExecute} disabled={processing}>
                  Converter para PDF
                </Button>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* 3. MERGE PDFS */}
        {/* ======================================================== */}
        {activeTool === 'merge' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Unir Múltiplos Arquivos PDF
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Combine páginas de múltiplos documentos PDF na ordem desejada em um único arquivo limpo e otimizado.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <DropZone
                  onFilesSelected={handleDropMerge}
                  accept=".pdf"
                  multiple={true}
                  title="Solte arquivos PDF para unir"
                  subtitle="adicione quantos PDFs desejar e ordene-os abaixo"
                  actionText="Adicionar PDFs"
                />
              </div>
            </div>

            {mergeFiles.length > 0 && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                    Ordem de junção ({mergeFiles.length} arquivos)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '12px', color: 'var(--mint)', fontFamily: 'var(--mono)' }}>
                      Total: {mergeFiles.reduce((acc, f) => acc + (f.pageCount || 0), 0)} páginas
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleSelectMergeFiles}>
                      Adicionar mais
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mergeFiles.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--surface-2)',
                        borderRadius: 7,
                        fontSize: '12.5px',
                        color: 'var(--fg)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '11px',
                            color: 'var(--fg-faint)',
                            width: 20,
                          }}
                        >
                          #{i + 1}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {file.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--fg-dim)' }}>
                            {file.pageCount ? `${file.pageCount} páginas` : 'Processando...'}
                            {file.sizeFormatted ? ` · ${file.sizeFormatted}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => moveMergeFile(i, 'up')}
                          disabled={i === 0}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: i === 0 ? 'var(--fg-faint)' : 'var(--fg)',
                            cursor: i === 0 ? 'default' : 'pointer',
                            padding: 4,
                          }}
                          title="Mover para cima"
                        >
                          <Icon name="arrow-up" size={13} />
                        </button>
                        <button
                          onClick={() => moveMergeFile(i, 'down')}
                          disabled={i === mergeFiles.length - 1}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: i === mergeFiles.length - 1 ? 'var(--fg-faint)' : 'var(--fg)',
                            cursor: i === mergeFiles.length - 1 ? 'default' : 'pointer',
                            padding: 4,
                          }}
                          title="Mover para baixo"
                        >
                          <Icon name="arrow-down" size={13} />
                        </button>
                        <button
                          onClick={() => removeMergeFile(i)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--pink)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Remover da lista"
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                    Nome do arquivo de saída
                  </label>
                  <input
                    type="text"
                    value={mergeOutputName}
                    onChange={(e) => setMergeOutputName(e.target.value)}
                    placeholder="documento_unido.pdf"
                    style={{
                      width: '100%',
                      height: 34,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 7,
                      padding: '0 12px',
                      color: 'var(--fg)',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button variant="primary" onClick={handleExecute} disabled={processing || mergeFiles.length < 2}>
                    Unir {mergeFiles.length} PDFs
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* 4. SPLIT PDF */}
        {/* ======================================================== */}
        {activeTool === 'split' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Dividir Documento PDF
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Separe páginas individuais, intervalos selecionados ou divida em blocos uniformes de páginas.
              </p>
            </div>

            {!selectedFile ? (
              <DropZone
                onFilesSelected={handleDropSingle}
                accept=".pdf"
                multiple={false}
                title="Solte o PDF a ser dividido aqui"
                subtitle="ou clique para navegar no computador"
                actionText="Selecionar PDF"
              />
            ) : (
              renderPdfInspectorCard(selectedFile, pdfInfo, inspecting, handleSelectSingleFile)
            )}

            {selectedFile && pdfInfo && (
              <div
                style={{
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                  Modo de divisão
                </div>

                <SegmentedControl
                  options={['Todas as páginas', 'Intervalos específicos', 'A cada N páginas']}
                  value={
                    splitMode === 'all'
                      ? 'Todas as páginas'
                      : splitMode === 'ranges'
                      ? 'Intervalos específicos'
                      : 'A cada N páginas'
                  }
                  onChange={(val) => {
                    if (val === 'Todas as páginas') setSplitMode('all');
                    else if (val === 'Intervalos específicos') setSplitMode('ranges');
                    else setSplitMode('every_n');
                  }}
                  size="sm"
                />

                {splitMode === 'all' && (
                  <div style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>
                    Gera {pdfInfo.pageCount} arquivos separados no formato:
                    <code style={{ marginLeft: 6, color: 'var(--mint)' }}>pagina-001.pdf</code> ...{' '}
                    <code style={{ color: 'var(--mint)' }}>
                      pagina-{String(pdfInfo.pageCount).padStart(3, '0')}.pdf
                    </code>
                  </div>
                )}

                {splitMode === 'ranges' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>
                      Digite os números ou intervalos separados por vírgula (ex: 1-3, 5, 8-10):
                    </label>
                    <input
                      type="text"
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="1-3, 5"
                      style={{
                        height: 34,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 7,
                        padding: '0 12px',
                        color: 'var(--fg)',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11.5px', color: 'var(--mint)' }}>
                      Total selecionado: {parseRangesCount(splitRanges, pdfInfo.pageCount)} página(s) de{' '}
                      {pdfInfo.pageCount}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <input
                        type="checkbox"
                        id="splitSingle"
                        checked={splitExportSingle}
                        onChange={(e) => setSplitExportSingle(e.target.checked)}
                        style={{ accentColor: 'var(--mint)' }}
                      />
                      <label htmlFor="splitSingle" style={{ fontSize: '12px', color: 'var(--fg)' }}>
                        Exportar páginas selecionadas como um único arquivo consolidado
                      </label>
                    </div>
                  </div>
                )}

                {splitMode === 'every_n' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '12px', color: 'var(--fg-dim)' }}>
                      Número de páginas por arquivo:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={pdfInfo.pageCount}
                      value={splitEveryN}
                      onChange={(e) => setSplitEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{
                        width: 120,
                        height: 34,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 7,
                        padding: '0 12px',
                        color: 'var(--fg)',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11.5px', color: 'var(--fg-dim)' }}>
                      Irá gerar aproximadamente {Math.ceil(pdfInfo.pageCount / splitEveryN)} arquivos de saída.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button variant="primary" onClick={handleExecute} disabled={processing}>
                    Dividir PDF
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* 5. ORGANIZE PAGES */}
        {/* ======================================================== */}
        {activeTool === 'organize' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Organizador e Rotacionador de Páginas
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Reordene, gire 90° e remova páginas indesejadas. O arquivo original nunca é sobrescrito.
              </p>
            </div>

            {!selectedFile ? (
              <DropZone
                onFilesSelected={handleDropSingle}
                accept=".pdf"
                multiple={false}
                title="Solte o PDF para organizar suas páginas"
                subtitle="ou clique para navegar no computador"
                actionText="Selecionar PDF"
              />
            ) : (
              renderPdfInspectorCard(selectedFile, pdfInfo, inspecting, handleSelectSingleFile)
            )}

            {selectedFile && pdfInfo && pagesList.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                    Páginas no documento de saída ({pagesList.length} páginas)
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" variant="secondary" onClick={rotateAllPages}>
                      Girar todas 90°
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetPages}>
                      Restaurar ordem
                    </Button>
                  </div>
                </div>

                {/* Grid of Pages */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 12,
                    maxHeight: 380,
                    overflowY: 'auto',
                    padding: 4,
                  }}
                >
                  {pagesList.map((p, idx) => (
                    <div
                      key={`${p.originalPage}-${idx}`}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 100,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          borderRadius: 6,
                          display: 'grid',
                          placeItems: 'center',
                          marginBottom: 8,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--fg-dim)',
                            transform: `rotate(${p.rotationDeg}deg)`,
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          Pág {p.originalPage}
                        </span>

                        {p.rotationDeg !== 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              fontSize: '10px',
                              fontFamily: 'var(--mono)',
                              background: 'var(--mint-dim)',
                              color: 'var(--mint)',
                              padding: '1px 4px',
                              borderRadius: 4,
                            }}
                          >
                            {p.rotationDeg}°
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--fg-dim)', marginBottom: 6 }}>
                        Posição #{idx + 1}
                      </div>

                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          onClick={() => movePage(idx, 'left')}
                          disabled={idx === 0}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: idx === 0 ? 'var(--fg-faint)' : 'var(--fg)',
                            cursor: idx === 0 ? 'default' : 'pointer',
                            padding: 2,
                          }}
                          title="Mover para esquerda"
                        >
                          <Icon name="arrow-up" size={12} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          onClick={() => rotatePage(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--mint)',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                          title="Girar 90°"
                        >
                          <Icon name="retry" size={12} />
                        </button>
                        <button
                          onClick={() => movePage(idx, 'right')}
                          disabled={idx === pagesList.length - 1}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: idx === pagesList.length - 1 ? 'var(--fg-faint)' : 'var(--fg)',
                            cursor: idx === pagesList.length - 1 ? 'default' : 'pointer',
                            padding: 2,
                          }}
                          title="Mover para direita"
                        >
                          <Icon name="arrow-down" size={12} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          onClick={() => removePage(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--pink)',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                          title="Excluir página"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button variant="primary" onClick={handleExecute} disabled={processing || pagesList.length === 0}>
                    Salvar novo PDF organizado ({pagesList.length} págs)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* 6. COMPRESS PDF */}
        {/* ======================================================== */}
        {activeTool === 'compress' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
                Compressão de PDF sem perda visual
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: '13px', margin: 0 }}>
                Otimiza dicionários estruturais, poda fluxos não referenciados e recompacta streams via Deflate, reportando a economia real de bytes.
              </p>
            </div>

            {!selectedFile ? (
              <DropZone
                onFilesSelected={handleDropSingle}
                accept=".pdf"
                multiple={false}
                title="Solte o PDF a ser comprimido aqui"
                subtitle="ou clique para navegar no computador"
                actionText="Selecionar PDF"
              />
            ) : (
              renderPdfInspectorCard(selectedFile, pdfInfo, inspecting, handleSelectSingleFile)
            )}

            {selectedFile && pdfInfo && (
              <div
                style={{
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                  Nível de otimização estrutural
                </div>

                <SegmentedControl
                  options={['Sem perdas', 'Recomendada', 'Extrema']}
                  value={
                    compressLevel === 'lossless'
                      ? 'Sem perdas'
                      : compressLevel === 'recommended'
                      ? 'Recomendada'
                      : 'Extrema'
                  }
                  onChange={(val) => {
                    if (val === 'Sem perdas') setCompressLevel('lossless');
                    else if (val === 'Recomendada') setCompressLevel('recommended');
                    else setCompressLevel('extreme');
                  }}
                  size="sm"
                />

                <div style={{ fontSize: '12px', color: 'var(--fg-dim)', lineHeight: 1.45 }}>
                  {compressLevel === 'lossless' && (
                    <span>
                      <strong>Sem perdas:</strong> Remove objetos mortos e recompacta streams de conteúdo. Fidelidade 100% idêntica às imagens originais.
                    </span>
                  )}
                  {compressLevel === 'recommended' && (
                    <span>
                      <strong>Recomendada:</strong> Poda metadados redundantes, unifica fontes duplicadas e compacta árvores de páginas. Ideal para anexar em e-mails.
                    </span>
                  )}
                  {compressLevel === 'extreme' && (
                    <span>
                      <strong>Extrema:</strong> Remove anotações desnecessárias, miniaturas prévias embutidas e metadados XML para obter o menor tamanho possível.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button variant="primary" onClick={handleExecute} disabled={processing}>
                    Comprimir PDF
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Helper renderer for PDF Inspector Card
function renderPdfInspectorCard(
  filePath: string,
  pdfInfo: PdfInfo | null,
  inspecting: boolean,
  onChangeFile: () => void
) {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--surface-2)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--mint)',
              flexShrink: 0,
            }}
          >
            <Icon name="documents" size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--fg)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {fileName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--fg-dim)', marginTop: 2 }}>
              {inspecting ? 'Inspecionando estrutura do PDF...' : filePath}
            </div>
          </div>
        </div>

        <Button size="sm" variant="secondary" onClick={onChangeFile}>
          Alterar
        </Button>
      </div>

      {pdfInfo && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            paddingTop: 10,
            borderTop: '1px solid var(--line)',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 5,
              background: 'var(--surface-2)',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              color: 'var(--fg)',
            }}
          >
            {pdfInfo.pageCount} {pdfInfo.pageCount === 1 ? 'página' : 'páginas'}
          </span>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: 5,
              background: 'var(--surface-2)',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              color: 'var(--fg)',
            }}
          >
            {pdfInfo.fileSizeFormatted}
          </span>

          {pdfInfo.orientation && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 5,
                background: 'var(--surface-2)',
                fontSize: '11px',
                color: 'var(--fg-dim)',
              }}
            >
              {pdfInfo.orientation}
            </span>
          )}

          {pdfInfo.hasSelectableText ? (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 5,
                background: 'var(--mint-dim)',
                color: 'var(--mint)',
                fontSize: '11px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="check" size={11} /> Texto selecionável
            </span>
          ) : (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 5,
                background: 'var(--amber-dim, rgba(245, 158, 11, 0.15))',
                color: 'var(--amber, #f59e0b)',
                fontSize: '11px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="alert" size={11} /> Digitalização / Sem texto selecionável
            </span>
          )}

          {pdfInfo.isEncrypted && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 5,
                background: 'var(--pink-dim)',
                color: 'var(--pink)',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              Criptografado com senha
            </span>
          )}
        </div>
      )}
    </div>
  );
}
