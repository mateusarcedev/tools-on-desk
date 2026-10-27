import React, { useState } from 'react';
import { Icon } from './Icon';

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  actionText?: string;
  style?: React.CSSProperties;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  accept,
  multiple = true,
  title = 'Arraste arquivos para cá',
  subtitle = 'ou clique para navegar no computador',
  actionText = 'Selecionar arquivos',
  style,
}) => {
  const [isOver, setIsOver] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `1.5px dashed ${isOver ? 'var(--mint)' : 'var(--line)'}`,
        background: isOver ? 'var(--mint-dim)' : 'transparent',
        borderRadius: 12,
        padding: '36px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.18s ease',
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
      />

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: isOver ? 'var(--mint-dim)' : 'var(--surface)',
          border: `1px solid ${isOver ? 'var(--mint-edge)' : 'var(--line)'}`,
          display: 'grid',
          placeItems: 'center',
          color: isOver ? 'var(--mint)' : 'var(--fg-dim)',
          transition: 'all 0.18s ease',
        }}
      >
        <Icon name="upload" size={22} />
      </div>

      <div>
        <div style={{ color: 'var(--fg)', fontSize: '14px', fontWeight: 500 }}>
          {isOver ? 'Solte os arquivos agora' : title}
        </div>
        <div style={{ color: 'var(--fg-faint)', fontSize: '12px', marginTop: 3 }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          marginTop: 4,
          height: 28,
          padding: '0 12px',
          borderRadius: 6,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          color: 'var(--fg)',
          fontSize: '12px',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {actionText}
      </div>
    </div>
  );
};
