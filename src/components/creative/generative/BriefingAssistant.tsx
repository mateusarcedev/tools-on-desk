import React, { useState } from 'react';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface BriefingData {
  goal: string;
  niche: string;
  tone: string;
  format: '9:16' | '16:9' | '1:1';
  headline: string;
  offer: string;
}

interface BriefingAssistantProps {
  onComplete: (data: { prompt: string; style: string; aspectRatio: string; recommendedSkills: string[] }) => void;
  onCancel: () => void;
}

export const BriefingAssistant: React.FC<BriefingAssistantProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<BriefingData>({
    goal: 'Promoção Relâmpago de Produto',
    niche: 'Tecnologia & Gadgets',
    tone: 'Energético & Urgente',
    format: '9:16',
    headline: 'Mega Oferta Exclusiva',
    offer: '50% OFF e Frete Grátis',
  });

  const handleGenerate = () => {
    const prompt = `Crie uma peça profissional de alto impacto para ${data.niche}. Objetivo: ${data.goal}. Tom: ${data.tone}. Destaque principal: "${data.headline}" com a oferta: "${data.offer}". Tipografia moderna, iluminação de estúdio e contraste apurado.`;
    
    const style = data.tone.includes('Elegante') ? 'Minimalista' : data.tone.includes('Tecnológico') ? '3D' : 'Publicitário';

    const recommendedSkills = [
      'art-direction',
      'advertising-design',
      'kinetic-typography',
      data.format === '9:16' ? 'short-form-storytelling' : 'commercial-scriptwriting',
    ];

    onComplete({
      prompt,
      style,
      aspectRatio: data.format,
      recommendedSkills,
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 24,
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'rgba(21, 245, 186, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--mint)',
            }}
          >
            <Icon name="sparkles" size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>
              Assistente de Briefing Criativo
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              Etapa {step} de 3 · Transforme sua ideia em anúncios e vídeos profissionais
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Qual é o objetivo principal da peça?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                'Promoção Relâmpago de Produto',
                'Apresentação de Marca Institucional',
                'Reels / TikTok para Redes Sociais',
                'Animação de Logotipo com Glow',
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setData({ ...data, goal: opt })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    textAlign: 'left',
                    fontSize: 13,
                    border: data.goal === opt ? '1px solid var(--mint)' : '1px solid var(--line)',
                    backgroundColor: data.goal === opt ? 'rgba(21, 245, 186, 0.08)' : 'var(--bg)',
                    color: data.goal === opt ? 'var(--mint)' : 'var(--fg)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Nicho ou Categoria de Mercado
            </label>
            <select
              value={data.niche}
              onChange={(e) => setData({ ...data, niche: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                fontSize: 13,
              }}
            >
              <option value="Tecnologia & Gadgets">Tecnologia & Gadgets</option>
              <option value="Moda & Acessórios">Moda & Acessórios</option>
              <option value="Comida & Restaurantes">Comida & Restaurantes</option>
              <option value="Saúde & Fitness">Saúde & Fitness</option>
              <option value="Serviços & B2B">Serviços & B2B</option>
              <option value="Educação & Cursos">Educação & Cursos</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" onClick={() => setStep(2)}>
              Próximo: Estilo & Tom →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Tom da Comunicação
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                'Energético & Urgente',
                'Elegante & Minimalista',
                'Cinematográfico & Emocional',
                'Tecnológico & Futurista',
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setData({ ...data, tone: t })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    textAlign: 'left',
                    fontSize: 13,
                    border: data.tone === t ? '1px solid var(--mint)' : '1px solid var(--line)',
                    backgroundColor: data.tone === t ? 'rgba(21, 245, 186, 0.08)' : 'var(--bg)',
                    color: data.tone === t ? 'var(--mint)' : 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Formato & Proporção
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: '9:16', label: 'Vertical 9:16', desc: 'Reels, TikTok, Shorts' },
                { id: '16:9', label: 'Horizontal 16:9', desc: 'YouTube, Web, TV' },
                { id: '1:1', label: 'Quadrado 1:1', desc: 'Instagram Feed, Ads' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setData({ ...data, format: f.id as any })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    textAlign: 'center',
                    border: data.format === f.id ? '1px solid var(--mint)' : '1px solid var(--line)',
                    backgroundColor: data.format === f.id ? 'rgba(21, 245, 186, 0.08)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: data.format === f.id ? 'var(--mint)' : 'var(--fg)' }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Voltar
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Próximo: Mensagem & Oferta →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Título / Chamada Principal (Headline)
            </label>
            <input
              type="text"
              value={data.headline}
              onChange={(e) => setData({ ...data, headline: e.target.value })}
              placeholder="Ex: MEGA OFERTA DE LANÇAMENTO"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              Benefício ou Oferta de Destaque
            </label>
            <input
              type="text"
              value={data.offer}
              onChange={(e) => setData({ ...data, offer: e.target.value })}
              placeholder="Ex: 50% OFF + Frete Grátis Hoje"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: 'rgba(21, 245, 186, 0.05)',
              border: '1px dashed rgba(21, 245, 186, 0.3)',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            <strong style={{ color: 'var(--mint)' }}>Síntese Inteligente:</strong> Ao concluir, as skills de Direção de Arte, Composição Tipográfica e Motion Transitions serão ativadas automaticamente para estruturar seu projeto.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Voltar
            </Button>
            <Button variant="primary" onClick={handleGenerate}>
              <Icon name="sparkles" size={16} /> Estruturar Projeto no Estúdio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
