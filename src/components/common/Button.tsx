import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  style,
  disabled,
  ...props
}) => {
  const isSm = size === 'sm';

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isSm ? 6 : 8,
    height: isSm ? 30 : 36,
    padding: isSm ? '0 12px' : '0 16px',
    borderRadius: isSm ? 7 : 8,
    fontFamily: 'var(--sans)',
    fontSize: isSm ? '12.5px' : '13px',
    fontWeight: variant === 'primary' ? 600 : 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    border: 'none',
    ...style,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--mint)',
      color: 'var(--bg)',
    },
    secondary: {
      background: 'transparent',
      border: '1px solid var(--line)',
      color: 'var(--fg)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--fg-dim)',
    },
    danger: {
      background: 'var(--pink-dim)',
      color: 'var(--pink)',
      border: '1px solid rgba(233, 100, 121, 0.25)',
    },
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
