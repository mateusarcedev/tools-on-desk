import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  desc?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  desc,
}) => {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
    >
      {(label || desc) && (
        <div style={{ minWidth: 0, flex: 1 }}>
          {label && (
            <div style={{ color: 'var(--fg)', fontSize: '13px', fontWeight: 500 }}>
              {label}
            </div>
          )}
          {desc && (
            <div style={{ color: 'var(--fg-faint)', fontSize: '11.5px', marginTop: 2 }}>
              {desc}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          width: 34,
          height: 20,
          borderRadius: 10,
          background: checked ? 'var(--mint)' : 'var(--surface-2)',
          border: '1px solid var(--line)',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: checked ? 'var(--bg)' : 'var(--fg-dim)',
            transform: checked ? 'translateX(14px)' : 'translateX(0)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s',
          }}
        />
      </div>
    </label>
  );
};
