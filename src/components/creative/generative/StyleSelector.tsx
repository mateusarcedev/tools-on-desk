import React from 'react';
import { Icon } from '../../common/Icon';

export interface StyleOption {
  id: string;
  name: string;
  category: string;
  description: string;
  gradient: string;
  tags: string[];
}

export const VISUAL_STYLES: StyleOption[] = [
  {
    id: 'Publicitário',
    name: 'Publicitário',
    category: 'Comercial',
    description: 'Iluminação de estúdio comercial, nitidez máxima, foco no produto e apelo de vendas.',
    gradient: 'linear-gradient(135deg, #141A1C 0%, #15F5BA 100%)',
    tags: ['8k', 'Studio Lighting', 'High Contrast'],
  },
  {
    id: 'Fotográfico',
    name: 'Fotográfico',
    category: 'Realista',
    description: 'Textura analógica 35mm, profundidade de campo cinematográfica e luz natural.',
    gradient: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
    tags: ['35mm Film', 'Depth of Field', 'Natural'],
  },
  {
    id: 'Cinematográfico',
    name: 'Cinematográfico',
    category: 'Cinema',
    description: 'Lentes anamórficas, atmosfera dramática, color grading sofisticado e clima de filme.',
    gradient: 'linear-gradient(135deg, #0B0F10 0%, #0369A1 100%)',
    tags: ['Anamorphic', 'Color Graded', 'Dramatic'],
  },
  {
    id: 'Minimalista',
    name: 'Minimalista',
    category: 'Design',
    description: 'Espaço negativo generoso, linhas limpas, elegância sóbria e iluminação suave.',
    gradient: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)',
    tags: ['Clean Space', 'Subtle', 'Elegant'],
  },
  {
    id: 'Editorial',
    name: 'Editorial',
    category: 'Moda',
    description: 'Estilo Vogue e revistas internacionais, softbox refinado e paleta cosmopolita.',
    gradient: 'linear-gradient(135deg, #31102A 0%, #701A75 100%)',
    tags: ['High Fashion', 'Softbox', 'Editorial'],
  },
  {
    id: 'Ilustração',
    name: 'Ilustração',
    category: 'Arte Digital',
    description: 'Arte vetorial limpa, cores vibrantes, contornos definidos e estética contemporânea.',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)',
    tags: ['Vector', 'Vibrant', 'Stylized'],
  },
  {
    id: '3D',
    name: '3D & Render',
    category: 'Tecnologia',
    description: 'Render Octane/Raytracing, oclusão de ambiente, materiais físicos e reflexos.',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
    tags: ['Raytracing', 'Octane', 'Subsurface'],
  },
  {
    id: 'Produto',
    name: 'Produto & Hero',
    category: 'E-commerce',
    description: 'Hero shot com reflexo de piso, luz de recorte traseira e destaque de embalagem.',
    gradient: 'linear-gradient(135deg, #1C1917 0%, #78716C 100%)',
    tags: ['Hero Shot', 'Catalog', 'Reflections'],
  },
  {
    id: 'Social media',
    name: 'Social Media',
    category: 'Viral',
    description: 'Cores hiper saturadas, alto contraste para parar o scroll e engajamento máximo.',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #22C55E 100%)',
    tags: ['High CTR', 'Punchy', 'Eye Catching'],
  },
];

interface StyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (styleName: string) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelectStyle }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {VISUAL_STYLES.map((style) => {
        const isSelected = selectedStyle.toLowerCase() === style.name.toLowerCase();
        return (
          <div
            key={style.id}
            onClick={() => onSelectStyle(style.name)}
            style={{
              borderRadius: 10,
              border: isSelected ? '1px solid var(--mint)' : '1px solid var(--line)',
              backgroundColor: isSelected ? 'rgba(21, 245, 186, 0.06)' : 'var(--surface)',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 150ms ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Visual Header / Banner */}
            <div
              style={{
                height: 48,
                background: style.gradient,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 8px',
              }}
            >
              {isSelected && (
                <div
                  style={{
                    backgroundColor: 'var(--mint)',
                    color: '#0B0F10',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="check" size={12} />
                </div>
              )}
            </div>

            {/* Info Body */}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isSelected ? 'var(--mint)' : 'var(--fg)',
                  }}
                >
                  {style.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {style.category}
                </span>
              </div>

              <p
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  margin: '6px 0 8px 0',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {style.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {style.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 9,
                      padding: '2px 5px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
