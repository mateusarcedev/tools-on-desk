use crate::domain::CreativeSkill;
use crate::error::AppResult;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

pub struct SkillManager {
    skills: Arc<RwLock<HashMap<String, CreativeSkill>>>,
}

impl SkillManager {
    pub fn new() -> Self {
        let mut map = HashMap::new();
        for skill in get_builtin_skills() {
            map.insert(skill.id.clone(), skill);
        }
        Self {
            skills: Arc::new(RwLock::new(map)),
        }
    }

    pub fn list_skills(&self, category: Option<&str>, query: Option<&str>) -> Vec<CreativeSkill> {
        let skills = self.skills.read();
        let mut list: Vec<CreativeSkill> = skills.values().cloned().collect();

        if let Some(cat) = category {
            if !cat.is_empty() && cat != "all" {
                list.retain(|s| s.category.eq_ignore_ascii_case(cat));
            }
        }

        if let Some(q) = query {
            let lower_q = q.to_lowercase();
            if !lower_q.is_empty() {
                list.retain(|s| {
                    s.name.to_lowercase().contains(&lower_q)
                        || s.display_name.to_lowercase().contains(&lower_q)
                        || s.description.to_lowercase().contains(&lower_q)
                });
            }
        }

        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    pub fn get_skill(&self, id: &str) -> Option<CreativeSkill> {
        self.skills.read().get(id).cloned()
    }

    pub fn toggle_skill(&self, id: &str, enabled: bool) -> AppResult<bool> {
        let mut skills = self.skills.write();
        if let Some(skill) = skills.get_mut(id) {
            skill.enabled = enabled;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn export_skills_to_disk(&self, base_dir: &Path) -> AppResult<()> {
        let skills_dir = base_dir.join("skills");
        let _ = std::fs::create_dir_all(&skills_dir);

        let skills = self.skills.read();
        for skill in skills.values() {
            let skill_dir = skills_dir.join(&skill.name);
            let _ = std::fs::create_dir_all(&skill_dir);
            let skill_file = skill_dir.join("SKILL.md");

            let tools_yaml = serde_json::to_string(&skill.tools).unwrap_or_else(|_| "[]".into());
            let content = format!(
                "---\nname: {}\ndisplay_name: \"{}\"\ndescription: \"{}\"\ncategory: {}\nversion: {}\ntools: {}\nlimitations: \"{}\"\nlicense: {}\n---\n\n{}",
                skill.name, skill.display_name, skill.description, skill.category, skill.version, tools_yaml, skill.limitations, skill.license, skill.content_md
            );

            let _ = std::fs::write(skill_file, content);
        }
        Ok(())
    }
}

fn get_builtin_skills() -> Vec<CreativeSkill> {
    vec![
        // 1. Art Direction
        CreativeSkill {
            id: "art-direction".into(),
            name: "art-direction".into(),
            display_name: "Direção de Arte & Estilo Visual".into(),
            description: "Define paleta de cores harmônica, contrastes visuais, hierarquia e clima estético para peças de alto impacto.".into(),
            category: "design".into(),
            version: "1.0.0".into(),
            tools: vec!["color-palette".into(), "image-generation".into()],
            limitations: "Requer modelo visual configurado para síntese de imagens.".into(),
            license: "MIT".into(),
            icon: "palette".into(),
            enabled: true,
            content_md: r#"# Art Direction Skill
## Diretrizes de Execução
1. Toda peça visual deve possuir uma cor dominante (60%), cor de suporte (30%) e cor de acento vibrante (10% mint/neon).
2. Manter contraste mínimo WCAG AA em textos sobrepostas a fundos e gradientes.
3. Utilizar proporção áurea e regra dos terços para ancorar o elemento de maior relevância.
4. Harmonizar a iluminação: sombras suaves (softbox), destaques rim light para separar produtos do fundo."#.into(),
        },

        // 2. Advertising Design
        CreativeSkill {
            id: "advertising-design".into(),
            name: "advertising-design".into(),
            display_name: "Design Publicitário & Banners".into(),
            description: "Criação de anúncios promocionais, posts patrocinados, criativos para tráfego pago e ofertas comerciais.".into(),
            category: "design".into(),
            version: "1.0.0".into(),
            tools: vec!["banner-composer".into(), "cta-engine".into()],
            limitations: "Focado em formatos digitais (Feed, Stories, Banners Web).".into(),
            license: "MIT".into(),
            icon: "megaphone".into(),
            enabled: true,
            content_md: r#"# Advertising Design Skill
## Princípios de Conversão
1. **Gancho Visual (Primeiro Segundo):** Destaque visual inconfundível do produto ou benefício.
2. **Proposta de Valor Clara:** Máximo de 7 palavras no título principal.
3. **Oferta e Urgência:** Selos de desconto com contraste máximo (ex: fundo menta ou amarelo com texto preto).
4. **Call To Action (CTA):** Botão claro 'Compre Agora', 'Saiba Mais' ou 'Aproveite' no terço inferior."#.into(),
        },

        // 3. Typography Composition
        CreativeSkill {
            id: "typography-composition".into(),
            name: "typography-composition".into(),
            display_name: "Composição Tipográfica".into(),
            description: "Regras de espaçamento, hierarquia tipográfica, tracking, leading e emparelhamento de fontes para layouts limpos.".into(),
            category: "design".into(),
            version: "1.0.0".into(),
            tools: vec!["font-manager".into(), "layout-engine".into()],
            limitations: "Aplica fontes disponíveis localmente (Geist, Geist Mono e fontes de sistema).".into(),
            license: "MIT".into(),
            icon: "type".into(),
            enabled: true,
            content_md: r#"# Typography Composition Skill
## Regras Tipográficas
1. Nunca utilizar mais de 2 famílias tipográficas na mesma composição.
2. Usar Geist para textos com excelente legibilidade e Geist Mono para números, métricas e selos de preço.
3. Respeitar o respiro de margem de pelo menos 5% das bordas do formato."#.into(),
        },

        // 4. Brand Identity
        CreativeSkill {
            id: "brand-identity".into(),
            name: "brand-identity".into(),
            display_name: "Identidade de Marca".into(),
            description: "Padronização de logotipos, regras de aplicação, zonas de proteção e consistência visual institucional.".into(),
            category: "design".into(),
            version: "1.0.0".into(),
            tools: vec!["logo-engine".into(), "brand-guidelines".into()],
            limitations: "Preserva arquivos SVG e PNG com canal alfa transparente.".into(),
            license: "MIT".into(),
            icon: "award".into(),
            enabled: true,
            content_md: r#"# Brand Identity Skill
## Preservação de Marca
1. O logotipo nunca deve ser deformado, esticado ou sofrer corte em suas proporções originais.
2. A zona de proteção ao redor do logotipo deve equivaler a no mínimo 50% da altura da marca.
3. Em fundos escuros, utilizar versões claras ou com contorno suave."#.into(),
        },

        // 5. Logo Animation
        CreativeSkill {
            id: "logo-animation".into(),
            name: "logo-animation".into(),
            display_name: "Animação de Logotipo".into(),
            description: "Entradas fluidas, escalas elásticas (spring), rotações cinemáticas, brilhos (glow) e saídas elegantes para marcas.".into(),
            category: "motion".into(),
            version: "1.0.0".into(),
            tools: vec!["motion-engine".into(), "spring-physics".into()],
            limitations: "Ideal para durações entre 3 e 6 segundos.".into(),
            license: "MIT".into(),
            icon: "sparkles".into(),
            enabled: true,
            content_md: r#"# Logo Animation Skill
## Core Motion Dynamics
1. **Entrada:** Escala de 0.6 para 1.0 com curva de easing elástica (spring damping 0.7).
2. **Brilho/Destaque:** Efeito sweep de luminosidade mint passando em 45 graus aos 2.0s.
3. **Estabilização:** Leve respiro flutuante (idle float) de 2% de deslocamento vertical."#.into(),
        },

        // 6. Kinetic Typography
        CreativeSkill {
            id: "kinetic-typography".into(),
            name: "kinetic-typography".into(),
            display_name: "Tipografia Cinética".into(),
            description: "Animações de texto palavra por palavra, slide-up com corte de máscara, efeito máquina de escrever e contadores dinâmicos.".into(),
            category: "motion".into(),
            version: "1.0.0".into(),
            tools: vec!["motion-engine".into(), "text-animator".into()],
            limitations: "Otimizado para manter legibilidade em 60fps.".into(),
            license: "MIT".into(),
            icon: "activity".into(),
            enabled: true,
            content_md: r#"# Kinetic Typography Skill
## Fórmulas de Animação
1. **Slide Up Fade:** Deslocamento em Y de +40px para 0px combinado com opacidade de 0 a 1 em 400ms.
2. **Preço Saltando:** Efeito pop com escala atingindo 1.15 e estabilizando em 1.0 com bounce.
3. **Escalonamento em cascata:** Atraso de 80ms entre palavras consecutivas."#.into(),
        },

        // 7. Motion Transitions
        CreativeSkill {
            id: "motion-transitions".into(),
            name: "motion-transitions".into(),
            display_name: "Transições de Movimento".into(),
            description: "Cortes dinâmicos, transições de zoom com motion blur simulado, wipes direcionais e dissoluções harmônicas entre cenas.".into(),
            category: "motion".into(),
            version: "1.0.0".into(),
            tools: vec!["transition-engine".into(), "compositor".into()],
            limitations: "Compatível com preview instantâneo e renderização MP4.".into(),
            license: "MIT".into(),
            icon: "shuffle".into(),
            enabled: true,
            content_md: r#"# Motion Transitions Skill
## Catálogo de Transições
- **Wipe Horizontal:** Cortina suave da esquerda para direita com gradiente de transição de 15%.
- **Zoom In Punch:** A cena atual expande 120% enquanto a próxima surge de 80% para 100%.
- **Fade to Dark:** Escurecimento sutil para separar blocos conceituais de anúncio."#.into(),
        },

        // 8. Short-Form Storytelling
        CreativeSkill {
            id: "short-form-storytelling".into(),
            name: "short-form-storytelling".into(),
            display_name: "Narrativa para Reels & Shorts".into(),
            description: "Estruturação de vídeos de 15 a 30 segundos em 3 atos: Gancho (0-3s), Entrega de Valor (3-11s) e Chamada Final (11-15s).".into(),
            category: "motion".into(),
            version: "1.0.0".into(),
            tools: vec!["story-template".into(), "timing-calculator".into()],
            limitations: "Formato 9:16 (1080x1920) vertical recomendado.".into(),
            license: "MIT".into(),
            icon: "smartphone".into(),
            enabled: true,
            content_md: r#"# Short-Form Storytelling Skill
## Cronograma de Atenção
- **0.0s - 3.0s:** Gancho com pergunta instigante ou visual surpreendente.
- **3.0s - 10.0s:** Demonstração visual do produto em ação com textos de apoio rápidos.
- **10.0s - 15.0s:** Oferta imperdível e seta/animação apontando para o botão de ação."#.into(),
        },

        // 9. Commercial Scriptwriting
        CreativeSkill {
            id: "commercial-scriptwriting".into(),
            name: "commercial-scriptwriting".into(),
            display_name: "Roteiro Comercial & Copywriting".into(),
            description: "Geração de textos persuasivos, scripts de narração, ganchos de abertura e copies adaptadas ao público-alvo.".into(),
            category: "video".into(),
            version: "1.0.0".into(),
            tools: vec!["script-generator".into(), "nvidia-llm".into()],
            limitations: "Utiliza modelos NVIDIA LLM para refino de linguagem.".into(),
            license: "MIT".into(),
            icon: "file-text".into(),
            enabled: true,
            content_md: r#"# Commercial Scriptwriting Skill
## Estrutura AIDA Adaptada
1. **Atenção:** Quebra de padrão no primeiro segundo.
2. **Interesse:** Foco na dor ou desejo do cliente, não apenas nas especificações técnicas.
3. **Desejo:** Transformação visual (Antes vs Depois).
4. **Ação:** Chamada explícita e direta."#.into(),
        },

        // 10. Storyboard Creation
        CreativeSkill {
            id: "storyboard-creation".into(),
            name: "storyboard-creation".into(),
            display_name: "Criação de Storyboards".into(),
            description: "Planejamento cena a cena com miniaturas visuais, anotações de câmera, falas e duração estimada de cada plano.".into(),
            category: "video".into(),
            version: "1.0.0".into(),
            tools: vec!["storyboard-matrix".into(), "image-gen".into()],
            limitations: "Organiza cenas editáveis pelo usuário antes da renderização.".into(),
            license: "MIT".into(),
            icon: "grid".into(),
            enabled: true,
            content_md: r#"# Storyboard Creation Skill
## Elementos por Cena
- Enquadramento (Plano Geral, Médio, Close-up ou Macro).
- Descrição da Ação e Movimento de Câmera.
- Texto na tela e áudio correspondente.
- Duração precisa em milissegundos."#.into(),
        },

        // 11. Video Editing
        CreativeSkill {
            id: "video-editing".into(),
            name: "video-editing".into(),
            display_name: "Edição de Vídeo & Montagem".into(),
            description: "Composição de trilhas, sincronização de cortes com batidas musicais, volume ducking para voz e mixagem limpa.".into(),
            category: "video".into(),
            version: "1.0.0".into(),
            tools: vec!["ffmpeg-timeline".into(), "audio-ducking".into()],
            limitations: "Executa 100% local através do motor FFmpeg de alto desempenho.".into(),
            license: "MIT".into(),
            icon: "video".into(),
            enabled: true,
            content_md: r#"# Video Editing Skill
## Práticas de Montagem
1. Volume da música de fundo a -18dB enquanto houver narração.
2. Cortes de imagem sincronizados com os transientes (batidas) do áudio.
3. Sem saltos bruscos de cor entre cenas sucessivas."#.into(),
        },

        // 12. Animated Captions
        CreativeSkill {
            id: "animated-captions".into(),
            name: "animated-captions".into(),
            display_name: "Legendas Dinâmicas & Estilizadas".into(),
            description: "Legendas estilo TikTok/Hormozi com realce de palavras-chave em cores mint, amarelo e branco, centralizadas e de alto contraste.".into(),
            category: "video".into(),
            version: "1.0.0".into(),
            tools: vec!["caption-styler".into(), "drawtext-filter".into()],
            limitations: "Garante legibilidade sobre qualquer imagem de fundo.".into(),
            license: "MIT".into(),
            icon: "message-square".into(),
            enabled: true,
            content_md: r#"# Animated Captions Skill
## Estilo das Legendas
- Fonte sem serifa pesada (Bold ou Black).
- Borda preta de 4px e sombra projetada suave.
- Máximo de 3 a 5 palavras por tela para não cobrir o conteúdo central."#.into(),
        },

        // 13. Procedural 3D Scenes
        CreativeSkill {
            id: "procedural-3d-scenes".into(),
            name: "procedural-3d-scenes".into(),
            display_name: "Cenas 3D & Profundidade".into(),
            description: "Efeitos de paralaxe em camadas, rotação de produtos em espaço 3D simulado e iluminação dinâmica com reflexos.".into(),
            category: "3d_quality".into(),
            version: "1.0.0".into(),
            tools: vec!["3d-matrix".into(), "perspective-transform".into()],
            limitations: "Suporte nativo via Canvas 2.5D e modelos gerados.".into(),
            license: "MIT".into(),
            icon: "box".into(),
            enabled: true,
            content_md: r#"# Procedural 3D Scenes Skill
## Técnicas de Profundidade
1. Três camadas de profundidade: Fundo distante (0.2x velocidade), Objeto principal (1.0x), Partículas em primeiro plano (1.5x).
2. Simulação de iluminação especular mint acompanhando a inclinação do objeto."#.into(),
        },

        // 14. Camera Animation
        CreativeSkill {
            id: "camera-animation".into(),
            name: "camera-animation".into(),
            display_name: "Animação de Câmera & Parallax".into(),
            description: "Movimentos cinemáticos: Pan lateral suave, Dolly In lento (Ken Burns effect), Roll sutil e transições gravitacionais.".into(),
            category: "3d_quality".into(),
            version: "1.0.0".into(),
            tools: vec!["camera-controller".into(), "easing-curves".into()],
            limitations: "Aceleração controlada sem causar desconforto visual.".into(),
            license: "MIT".into(),
            icon: "camera".into(),
            enabled: true,
            content_md: r#"# Camera Animation Skill
## Movimentos Padrão
- **Ken Burns Zoom:** Escala contínua de 1.00 para 1.08 ao longo de toda a duração da cena.
- **Pan Descendente:** Revelação do produto de cima para baixo com desaceleração cúbica."#.into(),
        },

        // 15. Product Lighting
        CreativeSkill {
            id: "product-lighting".into(),
            name: "product-lighting".into(),
            display_name: "Iluminação de Produto & Sombras".into(),
            description: "Iluminação profissional de três pontos (Key, Fill, Backlight), reflexos de piso e sombras de contato realistas.".into(),
            category: "3d_quality".into(),
            version: "1.0.0".into(),
            tools: vec!["lighting-presets".into(), "shadow-generator".into()],
            limitations: "Otimizado para fotografias de catálogo e e-commerce.".into(),
            license: "MIT".into(),
            icon: "sun".into(),
            enabled: true,
            content_md: r#"# Product Lighting Skill
## Configuração de Luz
- **Key Light:** 45 graus superior, intensidade 100%, temperatura neutra (5500K).
- **Fill Light:** Oposta, intensidade 40% para suavizar sombras sem eliminar volume.
- **Rim Light (Acento):** Luz traseira com brilho mint sutil para destacar silhueta."#.into(),
        },

        // 16. Visual Quality Review
        CreativeSkill {
            id: "visual-quality-review".into(),
            name: "visual-quality-review".into(),
            display_name: "Auditoria & Qualidade Visual".into(),
            description: "Checklist automático de conformidade: proporção, nitidez, ausência de clipping de áudio, contraste de texto e integridade dos assets.".into(),
            category: "3d_quality".into(),
            version: "1.0.0".into(),
            tools: vec!["quality-auditor".into(), "metadata-inspector".into()],
            limitations: "Executado antes do render final de qualquer projeto.".into(),
            license: "MIT".into(),
            icon: "check-circle".into(),
            enabled: true,
            content_md: r#"# Visual Quality Review Skill
## Checklist de Entrega
1. Nenhuma camada de texto excedendo as margens seguras (Safe Margins).
2. Taxa de quadros estável em 30 ou 60 FPS sem congelamentos.
3. Cores dentro do espaço sRGB padrão para compatibilidade em todos os displays."#.into(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_16_builtin_skills_present() {
        let mgr = SkillManager::new();
        let all = mgr.list_skills(None, None);
        assert_eq!(all.len(), 16);

        // Verify categories
        let design = mgr.list_skills(Some("design"), None);
        assert_eq!(design.len(), 4);

        let motion = mgr.list_skills(Some("motion"), None);
        assert_eq!(motion.len(), 4);

        let video = mgr.list_skills(Some("video"), None);
        assert_eq!(video.len(), 4);

        let quality_3d = mgr.list_skills(Some("3d_quality"), None);
        assert_eq!(quality_3d.len(), 4);

        // Verify toggle
        let res = mgr.toggle_skill("art-direction", false).unwrap();
        assert!(res);
        let updated = mgr.get_skill("art-direction").unwrap();
        assert!(!updated.enabled);
    }
}
