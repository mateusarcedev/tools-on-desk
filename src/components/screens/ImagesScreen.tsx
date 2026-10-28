import React, { useRef, useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';
import { ImageFormat, ImageItem, ImageTool } from '../../types/images';
import { TauriService } from '../../services/tauri';

interface ImagesScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
  onOpenExplorer: (path?: string) => void;
}

export const ImagesScreen: React.FC<ImagesScreenProps> = ({
  onShowToast,
  onOpenExplorer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<ImageTool>('convert');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Conversion options
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('JPG');
  const [quality, setQuality] = useState(85);
  const [targetWidth, setTargetWidth] = useState(1920);
  const [preserveRatio, setPreserveRatio] = useState(true);

  // PDF options
  const [pdfPageSize, setPdfPageSize] = useState<'A4' | 'Carta' | 'Ajustar'>('A4');
  const [pdfMargin, setPdfMargin] = useState<'Nenhuma' | 'Pequena' | 'Grande'>('Pequena');

  const [outputFolder, setOutputFolder] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const tools: { id: ImageTool; label: string }[] = [
    { id: 'convert', label: 'Converter formato' },
    { id: 'resize', label: 'Redimensionar' },
    { id: 'compress', label: 'Comprimir' },
    { id: 'pdf', label: 'Imagens → PDF' },
  ];

  const handleSelectFiles = async () => {
    try {
      const selected = await TauriService.selectFiles({
        multiple: true,
        extensions: ['png', 'jpg', 'jpeg'],
        title: 'Selecionar imagens',
      });

      if (selected.length > 0) {
        addFilesFromPaths(selected);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleBrowserFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const newItems: ImageItem[] = arr.map((f, i) => {
      const url = URL.createObjectURL(f);
      return {
        id: `${Date.now()}-${i}`,
        name: f.name,
        w: 1920,
        h: 1080,
        kb: f.size / 1024,
        url,
        previewUrl: url,
      };
    });

    setImages((prev) => [...prev, ...newItems]);
    onShowToast(`${newItems.length} imagem(ns) adicionada(s)`);
  };

  const addFilesFromPaths = (paths: string[]) => {
    const newItems: ImageItem[] = paths.map((p, i) => {
      const name = p.split(/[\\/]/).pop() || `imagem_${i}`;
      return {
        id: `${Date.now()}-${i}`,
        name,
        path: p,
        w: 1920,
        h: 1080,
        kb: 1024,
        previewUrl: `https://asset.localhost/${p}`,
      };
    });

    setImages((prev) => [...prev, ...newItems]);
    onShowToast(`${newItems.length} imagem(ns) adicionada(s)`);
  };

  const handleSelectFolder = async () => {
    const folder = await TauriService.selectFolder();
    if (folder) {
      setOutputFolder(folder);
      onShowToast(`Pasta de saída definida: ${folder}`);
    }
  };

  const handleRunOperation = async () => {
    if (images.length === 0) {
      onShowToast('Adicione ao menos uma imagem para processar', 'warn');
      return;
    }

    setIsProcessing(true);
    try {
      const sys = await TauriService.getSystemInfo();
      const folder = outputFolder || sys.defaultExportFolder;
      const filePaths = images.map((img) => img.path || img.name);

      if (activeTool === 'pdf') {
        const outPdf = `${folder}\\imagens_${Date.now()}.pdf`;
        await TauriService.startImagesToPdfTask({
          files: filePaths,
          pageSize: pdfPageSize,
          margin: pdfMargin,
          singlePdf: true,
          outputPdf: outPdf,
        });
        onShowToast(`Tarefa criada: PDF com ${images.length} páginas`);
      } else {
        const fmt = activeTool === 'compress' ? 'JPG' : targetFormat;
        const q = activeTool === 'compress' ? 70 : quality;
        const tw = activeTool === 'resize' ? targetWidth : undefined;

        await TauriService.startImageConversionTask({
          files: filePaths,
          format: fmt,
          quality: q,
          targetWidth: tw,
          preserveRatio,
          outputFolder: folder,
        });
        onShowToast(`Tarefa criada: Conversão de ${images.length} imagens`);
      }
    } catch (err: any) {
      onShowToast(`Erro ao iniciar processamento: ${err}`, 'err');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentImage = images[selectedIdx] || images[0];

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
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/jpg"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleBrowserFiles(e.target.files);
        }}
      />

      {/* Subheader Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {tools.map((t) => {
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
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
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button size="sm" variant="secondary" onClick={handleSelectFiles}>
            <Icon name="plus" size={14} />
            Adicionar imagens
          </Button>
          {images.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setImages([])}
              style={{ color: 'var(--fg-faint)' }}
            >
              Limpar lista
            </Button>
          )}
        </div>
      </div>

      {/* Main Body */}
      {images.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <div style={{ maxWidth: 460, width: '100%' }}>
            <DropZone
              onFilesSelected={handleBrowserFiles}
              title="Solte imagens aqui para processar"
              subtitle="Suporta PNG e JPEG com conversão e redimensionamento real"
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Thumbnail List */}
          <div
            style={{
              width: 260,
              borderRight: '1px solid var(--line)',
              background: 'var(--surface)',
              overflowY: 'auto',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--mono)',
                color: 'var(--fg-faint)',
                padding: '4px 6px',
              }}
            >
              {images.length} IMAGEM{images.length > 1 ? 'NS' : ''} SELECIONADA
              {images.length > 1 ? 'S' : ''}
            </div>

            {images.map((img, i) => {
              const isSelected = selectedIdx === i;
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    border: isSelected ? '1px solid var(--line)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {img.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Icon name="images" size={16} style={{ color: 'var(--fg-dim)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: isSelected ? 'var(--fg)' : 'var(--fg-dim)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {img.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--fg-faint)', marginTop: 2 }}>
                      {Math.round(img.kb)} KB
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImages((prev) => prev.filter((_, idx) => idx !== i));
                      setSelectedIdx(Math.max(0, selectedIdx - 1));
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--fg-faint)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Center Preview View */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'var(--bg)',
            }}
          >
            {currentImage && (
              <div
                style={{
                  maxWidth: '85%',
                  maxHeight: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                    border: '1px solid var(--line)',
                    background: '#151515',
                  }}
                >
                  {currentImage.previewUrl ? (
                    <img
                      src={currentImage.previewUrl}
                      alt={currentImage.name}
                      style={{
                        maxHeight: '52vh',
                        maxWidth: '100%',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 320,
                        height: 220,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--fg-dim)',
                      }}
                    >
                      <Icon name="images" size={48} />
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--fg-dim)',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                  }}
                >
                  {currentImage.name} · {Math.round(currentImage.kb)} KB
                </div>
              </div>
            )}
          </div>

          {/* Right Parameters Panel */}
          <div
            style={{
              width: 320,
              borderLeft: '1px solid var(--line)',
              background: 'var(--surface)',
              overflowY: 'auto',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>
                Configurações da operação
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--fg-dim)', margin: 0 }}>
                {activeTool === 'pdf'
                  ? 'Gere um documento PDF multipágina.'
                  : 'Processe em lote com alta fidelidade.'}
              </p>
            </div>

            {/* Tool specific settings */}
            {activeTool === 'convert' && (
              <div>
                <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                  Formato de saída
                </label>
                <SegmentedControl
                  options={['JPG', 'PNG']}
                  value={targetFormat}
                  onChange={(val) => setTargetFormat(val as ImageFormat)}
                />
              </div>
            )}

            {(activeTool === 'convert' || activeTool === 'compress') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
                  <span style={{ color: 'var(--fg-dim)' }}>Qualidade da imagem</span>
                  <strong style={{ color: 'var(--fg)' }}>{quality}%</strong>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--mint)' }}
                />
              </div>
            )}

            {activeTool === 'resize' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Largura alvo</span>
                    <strong style={{ color: 'var(--fg)' }}>{targetWidth} px</strong>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={3840}
                    step={80}
                    value={targetWidth}
                    onChange={(e) => setTargetWidth(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--mint)' }}
                  />
                </div>

                <Switch
                  label="Manter proporção original"
                  checked={preserveRatio}
                  onChange={setPreserveRatio}
                />
              </div>
            )}

            {activeTool === 'pdf' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                    Tamanho da página
                  </label>
                  <SegmentedControl
                    options={['A4', 'Carta', 'Ajustar']}
                    value={pdfPageSize}
                    onChange={(val) => setPdfPageSize(val as any)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                    Margens
                  </label>
                  <SegmentedControl
                    options={['Nenhuma', 'Pequena', 'Grande']}
                    value={pdfMargin}
                    onChange={(val) => setPdfMargin(val as any)}
                  />
                </div>
              </div>
            )}

            {/* Target Output Folder */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Pasta de exportação
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  readOnly
                  placeholder="Pasta padrão (Documentos/ToolsOnDesk)"
                  value={outputFolder}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--fg)',
                    fontSize: '11px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                />
                <Button size="sm" variant="secondary" onClick={handleSelectFolder}>
                  Escolher
                </Button>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Run Action */}
            <Button
              variant="primary"
              onClick={handleRunOperation}
              disabled={isProcessing}
              style={{ width: '100%', height: 38 }}
            >
              {isProcessing
                ? 'Enviando para a fila...'
                : activeTool === 'pdf'
                ? `Gerar PDF com ${images.length} página(s)`
                : `Processar ${images.length} imagem(ns)`}
            </Button>

            {outputFolder && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenExplorer(outputFolder)}
                style={{ width: '100%' }}
              >
                <Icon name="folder" size={13} />
                Abrir pasta de exportação
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
