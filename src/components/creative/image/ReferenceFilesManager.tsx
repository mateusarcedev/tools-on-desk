import React, { useState } from 'react';
import {
  CreativeAsset,
  ProcessedReference,
  ReferencePurpose,
} from '../../../types/creative';
import { TauriService } from '../../../services/tauri';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface ReferenceFilesManagerProps {
  references: ProcessedReference[];
  onChangeReferences: (updated: ProcessedReference[]) => void;
  availableAssets?: CreativeAsset[];
  agentId: string;
  modelId: string;
  onShowToast?: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

const PURPOSE_OPTIONS: { id: ReferencePurpose; label: string }[] = [
  { id: 'product', label: 'Referência de produto' },
  { id: 'style', label: 'Referência de estilo' },
  { id: 'composition', label: 'Referência de composição' },
  { id: 'lighting', label: 'Referência de iluminação' },
  { id: 'character', label: 'Referência de personagem' },
  { id: 'brand_identity', label: 'Identidade visual' },
  { id: 'instructions', label: 'Documento de instruções' },
  { id: 'additional_context', label: 'Contexto adicional' },
];

export const ReferenceFilesManager: React.FC<ReferenceFilesManagerProps> = ({
  references,
  onChangeReferences,
  availableAssets = [],
  agentId,
  modelId,
  onShowToast,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);
  const [showAssetLibraryModal, setShowAssetLibraryModal] = useState<boolean>(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachFiles = async (paths: string[]) => {
    if (paths.length === 0) return;
    setIsProcessing(true);

    try {
      const newItems = paths.map((p) => ({
        filePath: p,
        purpose: 'product' as ReferencePurpose,
      }));

      const processed = await TauriService.inspectReferenceFilesBatch(
        newItems,
        agentId,
        modelId
      );

      // Merge avoiding duplicates by file_path
      const existingPaths = new Set(references.map((r) => r.file_path));
      const filteredNew = processed.filter((p) => !existingPaths.has(p.file_path));

      onChangeReferences([...references, ...filteredNew]);
      onShowToast?.(
        `${filteredNew.length} arquivo(s) de referência analisado(s) com sucesso!`,
        'ok'
      );
    } catch (err: any) {
      console.error('Falha ao processar arquivos de referência:', err);
      onShowToast?.(`Erro ao inspecionar arquivos: ${err?.message || err}`, 'err');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPicker = async () => {
    try {
      const selected = await TauriService.selectFiles({
        title: 'Selecionar Arquivos de Referência (Fotos, PDFs, DOCXs, Textos)',
        multiple: true,
        filters: [
          {
            name: 'Arquivos Suportados',
            extensions: [
              'png',
              'jpg',
              'jpeg',
              'webp',
              'bmp',
              'gif',
              'pdf',
              'docx',
              'txt',
              'md',
              'json',
              'csv',
              'svg',
            ],
          },
          {
            name: 'Imagens',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'],
          },
          {
            name: 'Documentos',
            extensions: ['pdf', 'docx', 'txt', 'md'],
          },
        ],
      });

      if (selected && selected.length > 0) {
        await handleAttachFiles(selected);
      }
    } catch (err: any) {
      console.warn('Seleção cancelada ou erro:', err);
    }
  };

  const handleReplaceItem = async (index: number) => {
    try {
      const selected = await TauriService.selectFile({
        title: 'Substituir Arquivo de Referência',
      });

      if (selected && typeof selected === 'string') {
        const updatedItem = await TauriService.inspectReferenceFile(
          selected,
          references[index].purpose,
          agentId,
          modelId
        );
        const copy = [...references];
        copy[index] = updatedItem;
        onChangeReferences(copy);
        onShowToast?.('Arquivo de referência substituído com sucesso.', 'ok');
      }
    } catch (err: any) {
      console.warn('Substituição cancelada:', err);
    }
  };

  const handleRemoveItem = (index: number) => {
    const copy = references.filter((_, i) => i !== index);
    onChangeReferences(copy);
  };

  const handlePurposeChange = (index: number, newPurpose: ReferencePurpose) => {
    const copy = [...references];
    copy[index] = { ...copy[index], purpose: newPurpose };
    onChangeReferences(copy);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filePaths: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        // In Tauri drag & drop, the File object typically contains the path property
        const fullPath = (file as any).path || file.name;
        if (fullPath) filePaths.push(fullPath);
      }
      if (filePaths.length > 0) {
        await handleAttachFiles(filePaths);
      }
    }
  };

  const getStatusBadge = (ref: ProcessedReference) => {
    if (ref.extraction_status === 'ready') {
      return (
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: 'rgba(21, 245, 186, 0.12)',
            color: 'var(--mint)',
            border: '1px solid rgba(21, 245, 186, 0.3)',
            fontFamily: 'var(--mono, monospace)',
          }}
        >
          ✓ Pronto
        </span>
      );
    }
    if (ref.extraction_status === 'scanned_pdf_ocr_unavailable') {
      return (
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            color: '#F59E0B',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontFamily: 'var(--mono, monospace)',
          }}
          title="PDF digitalizado sem camada textual pesquisável"
        >
          ⚠ Sem OCR
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'var(--mono, monospace)',
        }}
      >
        Erro de Leitura
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--line)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              Arquivos de referência ({references.length})
            </h4>
            <span
              style={{
                fontSize: 10,
                color: 'var(--mint)',
                backgroundColor: 'rgba(21, 245, 186, 0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'var(--mono, monospace)',
              }}
            >
              Multimodal Inputs
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Envie fotos de produtos, identidades visuais (PDF/DOCX), roteiros e referências de estilo para orientar a IA.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {availableAssets.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAssetLibraryModal(true)}
              style={{ height: 28, fontSize: 11 }}
            >
              Biblioteca
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenPicker}
            disabled={isProcessing}
            style={{ height: 28, fontSize: 11 }}
          >
            <Icon name="upload" size={12} />
            {isProcessing ? 'Processando...' : 'Adicionar Arquivos'}
          </Button>
        </div>
      </div>

      {/* Drag & Drop Prompt / Drop Area */}
      {references.length === 0 ? (
        <div
          onClick={handleOpenPicker}
          style={{
            border: isDragging ? '2px dashed var(--mint)' : '1px dashed var(--line)',
            backgroundColor: isDragging ? 'rgba(21, 245, 186, 0.05)' : 'var(--bg)',
            borderRadius: 8,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ color: 'var(--mint)', marginBottom: 6 }}>
            <Icon name="upload" size={20} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
            Arraste fotos ou documentos aqui, ou clique para explorar
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            PNG, JPEG, WebP, PDF, DOCX, TXT, Markdown, SVG (máx. 50 MB por arquivo)
          </div>
        </div>
      ) : (
        /* Attached Reference Cards List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {references.map((item, idx) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--surface-2, #141A1C)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Thumbnail / File Icon */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 6,
                    backgroundColor: '#050708',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.preview_data_url ? (
                    <img
                      src={item.preview_data_url}
                      alt={item.file_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : item.file_type === 'image' ? (
                    <img
                      src={`file://${item.file_path}`}
                      alt={item.file_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--mint)',
                        fontFamily: 'var(--mono, monospace)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.file_type}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', wordBreak: 'break-all' }}>
                      {item.file_name}
                    </span>
                    {getStatusBadge(item)}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono, monospace)', marginTop: 2 }}>
                    {formatSize(item.file_size_bytes)}
                    {item.width && item.height ? ` · ${item.width}x${item.height}px` : ''}
                    {item.page_count ? ` · ${item.page_count} página(s)` : ''}
                    {` · `}
                    <span style={{ color: item.compatibility.agent_compatible ? 'var(--mint)' : 'var(--muted)' }}>
                      {item.compatibility.mode === 'multimodal_vision'
                        ? 'Visão Multimodal'
                        : item.compatibility.mode === 'text_extraction'
                        ? 'Texto Extraído'
                        : 'Metadados'}
                    </span>
                  </div>
                </div>

                {/* Purpose Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Finalidade:</span>
                  <select
                    value={item.purpose}
                    onChange={(e) => handlePurposeChange(idx, e.target.value as ReferencePurpose)}
                    style={{
                      height: 28,
                      padding: '0 8px',
                      borderRadius: 4,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      fontSize: 11,
                      fontFamily: 'Geist, sans-serif',
                    }}
                  >
                    {PURPOSE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {item.extracted_text && (
                    <button
                      type="button"
                      onClick={() => setExpandedTextId(expandedTextId === item.id ? null : item.id)}
                      title="Ver texto extraído"
                      style={{
                        background: 'none',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--fg-dim)',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {expandedTextId === item.id ? 'Ocultar Texto' : 'Ver Texto'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleReplaceItem(idx)}
                    title="Substituir arquivo"
                    style={{
                      background: 'none',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      padding: '4px 6px',
                      color: 'var(--fg-dim)',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Substituir
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remover anexo"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>

              {/* Collapsible Extracted Document Text */}
              {expandedTextId === item.id && item.extracted_text && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 4,
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--line)',
                    maxHeight: 140,
                    overflowY: 'auto',
                    fontSize: 11,
                    fontFamily: 'var(--mono, monospace)',
                    color: 'var(--fg-dim)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.4,
                  }}
                >
                  {item.extracted_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Purpose Disclaimer */}
      {references.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.3 }}>
          ℹ A finalidade selecionada orienta a análise do briefing pelo modelo de IA, sem garantia de reprodução idêntica de traços ou logos proprietários.
        </div>
      )}

      {/* Asset Library Selection Modal */}
      {showAssetLibraryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowAssetLibraryModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              backgroundColor: 'var(--surface)',
              borderRadius: 10,
              border: '1px solid var(--line)',
              padding: 20,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                Selecione Assets da Biblioteca Local
              </h4>
              <button
                onClick={() => setShowAssetLibraryModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {availableAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={async () => {
                    await handleAttachFiles([asset.file_path]);
                    setShowAssetLibraryModal(false);
                  }}
                  style={{
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    padding: 8,
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ height: 80, backgroundColor: '#000', borderRadius: 4, overflow: 'hidden' }}>
                    <img
                      src={`file://${asset.file_path}`}
                      alt={asset.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {asset.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
