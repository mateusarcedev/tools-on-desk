import React from 'react';
import { TemplateParameter } from '../../../types/creative';

interface ParameterAdjusterProps {
  parameters: TemplateParameter[];
  onChange: (paramId: string, newValue: string) => void;
}

export const ParameterAdjuster: React.FC<ParameterAdjusterProps> = ({
  parameters,
  onChange,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
          Parâmetros Editáveis do Template
        </h4>
        <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Ajuste textos, cores e dados em tempo real sem editar código.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {parameters.map((param) => (
          <div key={param.id}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--fg)',
                marginBottom: 4,
              }}
            >
              {param.label}
            </label>

            {param.param_type === 'text' && (
              <input
                type="text"
                value={param.current_value}
                onChange={(e) => onChange(param.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            )}

            {param.param_type === 'color' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={param.current_value.startsWith('#') ? param.current_value : '#15F5BA'}
                  onChange={(e) => onChange(param.id, e.target.value)}
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={param.current_value}
                  onChange={(e) => onChange(param.id, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                />
              </div>
            )}

            {param.param_type === 'select' && param.options && (
              <select
                value={param.current_value}
                onChange={(e) => onChange(param.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              >
                {param.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {param.param_type === 'number' && (
              <input
                type="number"
                value={param.current_value}
                onChange={(e) => onChange(param.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono, monospace)',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
