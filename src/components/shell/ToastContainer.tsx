import React from 'react';

export interface ToastItem {
  id: number;
  text: string;
  kind?: 'ok' | 'err' | 'warn';
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 38,
        right: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const color =
          t.kind === 'err'
            ? 'var(--pink)'
            : t.kind === 'warn'
            ? 'var(--fg-faint)'
            : 'var(--mint)';

        return (
          <div
            key={t.id}
            style={{
              background: 'var(--surface)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '12.5px',
              fontFamily: 'var(--sans)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 360,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ lineHeight: 1.35 }}>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
};
