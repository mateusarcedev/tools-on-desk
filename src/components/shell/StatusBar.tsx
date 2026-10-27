import React from 'react';
import { Task } from '../../types/task';

interface StatusBarProps {
  tasks: Task[];
  componentsSummary?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  tasks,
  componentsSummary = 'FFmpeg 8.1 · Rust 1.99 · SQLite 3.46',
}) => {
  const running = tasks.filter((t) => t.status === 'processing');
  const waiting = tasks.filter((t) => t.status === 'waiting');

  const statusText = running.length
    ? `Processando ${running.length} tarefa${running.length > 1 ? 's' : ''} · ${waiting.length} na fila`
    : 'Pronto · Sistema offline-first';

  return (
    <div
      style={{
        height: 26,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'var(--bg-soft)',
        borderTop: '1px solid var(--line)',
        fontSize: '11px',
        fontFamily: 'var(--mono)',
        color: 'var(--fg-faint)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: running.length ? 'var(--mint)' : 'var(--fg-faint)',
            animation: running.length ? 'at-pulse 1.6s ease-in-out infinite' : 'none',
          }}
        />
        <span>{statusText}</span>
      </div>

      <div style={{ opacity: 0.8 }}>{componentsSummary}</div>
    </div>
  );
};
