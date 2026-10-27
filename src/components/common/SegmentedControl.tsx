import React from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: (Option<T> | T)[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const icon = typeof opt === 'string' ? null : opt.icon;
        const isSelected = value === val;

        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: isSm ? 26 : 28,
              padding: isSm ? '0 10px' : '0 12px',
              border: isSelected ? '1px solid var(--line)' : '1px solid transparent',
              borderRadius: 6,
              background: isSelected ? 'var(--surface-2)' : 'transparent',
              color: isSelected ? 'var(--fg)' : 'var(--fg-dim)',
              fontFamily: 'var(--sans)',
              fontSize: isSm ? '12px' : '12.5px',
              fontWeight: isSelected ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {icon}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
