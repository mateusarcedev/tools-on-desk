import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { DropZone } from '../common/DropZone';

interface DocumentsScreenProps {
  onShowToast: (msg: string, kind?: 'ok' | 'err' | 'warn') => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onShowToast }) => {
  const [activeTool, setActiveTool] = useState('pdf2word');
  const [files, setFiles] = useState<string[]>([]);
  const [ocr, setOcr] = useState(true);
  const [keepLayout, setKeepLayout] = useState(true);
  const [pdfa, setPdfa] = useState(false);
  const [compression, setCompression] = useState('Recomendada');

  const tools = [
    { id: 'pdf2word', label: 'PDF → Word' },
    { id: 'word2pdf', label: 'Word → PDF' },
    { id: 'merge', label: 'Unir PDFs' },
    { id: 'split', label: 'Dividir PDF' },
    { id: 'compress', label: 'Comprimir PDF' },
  ];

  const handleFiles = (fileList: FileList | File[]) => {
    const names = Array.from(fileList).map((f) => f.name);
    setFiles((prev) => [...prev, ...names]);
    onShowToast(`${names.length} documento(s) adicionado(s)`);
  };

  const handleRun = () => {
    if (files.length === 0) {
      onShowToast('Adicione ao menos um arquivo para converter', 'warn');
      return;
    }

    onShowToast(
      'Módulo preparado! O motor de conversão LibreOffice Headless + Extrator estruturado será integrado na Missão 02.',
      'warn'
    );
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
      {/* Toolbar */}
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
        <div style={{ display: 'flex', gap: 6 }}>
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

        {files.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setFiles([])}>
            Limpar arquivos
          </Button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <DropZone
          onFilesSelected={handleFiles}
          accept=".pdf,.doc,.docx,.odt"
          title="Solte arquivos PDF ou Word aqui"
          subtitle="Processamento local seguro, seus arquivos nunca saem da sua máquina"
        />

        {files.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
              Arquivos carregados ({files.length}):
            </div>
            {files.map((name, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'var(--surface-2)',
                  borderRadius: 6,
                  fontSize: '12px',
                  color: 'var(--fg)',
                }}
              >
                <span>{name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--fg-faint)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Options Box */}
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
            Opções de conversão
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Switch
              label="OCR em documentos digitalizados"
              desc="Reconhece texto em páginas escaneadas"
              checked={ocr}
              onChange={setOcr}
            />

            <Switch
              label="Preservar layout exato"
              desc="Mantém colunas, tabelas e fontes"
              checked={keepLayout}
              onChange={setKeepLayout}
            />

            <Switch
              label="Compatibilidade PDF/A"
              desc="Padrão para arquivamento de longo prazo"
              checked={pdfa}
              onChange={setPdfa}
            />
          </div>

          {activeTool === 'compress' && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'block', marginBottom: 6 }}>
                Nível de compressão
              </label>
              <SegmentedControl
                options={['Baixa', 'Recomendada', 'Extrema']}
                value={compression}
                onChange={setCompression}
                size="sm"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" onClick={handleRun}>
              Executar operação
            </Button>
          </div>
        </div>

        {/* Contract Note */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            gap: 12,
          }}
        >
          <Icon name="alert" size={18} style={{ color: 'var(--mint)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '12px', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
            <strong>Arquitetura de Documentos:</strong> O Arce Tools utilizará LibreOffice em modo headless{' '}
            e extratores de texto estruturados para garantir conversão 100% offline sem depender de APIs externas na nuvem.
          </div>
        </div>
      </div>
    </div>
  );
};
