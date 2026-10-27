# Arce Tools — Poster Studio (Documentação Técnica)

## 1. Visão Geral

O **Poster Studio** do Arce Tools é uma ferramenta nativa de rasterização e divisão de pôsteres em múltiplas folhas para impressão física, atingindo paridade funcional com a ferramenta web **Rasterbator.net** e expandindo com interface desktop moderna, processamento offline de alta performance e preview em tempo real.

O módulo atende dois perfis de uso:
1. **Modo Rápido (Quick Mode):** Arraste uma imagem, escolha a quantidade de folhas desejada e exporte o PDF final imediatamente.
2. **Modo Avançado (6 Etapas):** Wizard guiado passo a passo para controle minucioso de dimensões, orientação, margens, sobreposição, estilo artístico (retícula/halftone, dithering, alto contraste), paleta cromática, marcas de corte e numeração.

---

## 2. Geometria, Margens e Cálculo de Folhas

### Papéis Suportados
- **A4:** $210 \times 297\text{ mm}$
- **A3:** $297 \times 420\text{ mm}$
- **Letter:** $215.9 \times 279.4\text{ mm}$ ($8.5 \times 11\text{ polegadas}$)
- **Legal:** $215.9 \times 355.6\text{ mm}$ ($8.5 \times 14\text{ polegadas}$)
- **Personalizado:** Dimensões arbitrárias em milímetros definidas pelo usuário.
- **Orientações:** Retrato (*Portrait*) ou Paisagem (*Landscape*).

### Modelo Matemático de Sobreposição (*Overlap*)
Para que as folhas impressas possam ser montadas com precisão física e colagem sem descontinuidade visual:
- Seja $PW$ e $PH$ a largura e altura totais da folha.
- Seja $M$ a margem não-imprimível em cada lado ($M \ge 0$).
- A área útil de corte em cada folha é:
  $$CW = PW - 2M, \quad CH = PH - 2M$$
- Seja $OV$ a sobreposição de montagem ($0 \le OV < CW$).
- O passo físico de avanço entre folhas consecutivas é:
  $$SW = CW - OV, \quad SH = CH - OV$$
- Para um pôster de $C$ colunas e $R$ linhas, a largura e altura montadas são:
  $$W_{\text{total}} = C \cdot SW + OV$$
  $$H_{\text{total}} = R \cdot SH + OV$$
- Cada fatia física de imagem correspondente à folha $(c, r)$ cobre a região contínua do pôster:
  $$[X_{\text{start}}, X_{\text{end}}] = [c \cdot SW, \; c \cdot SW + CW]$$
  $$[Y_{\text{start}}, Y_{\text{end}}] = [r \cdot SH, \; r \cdot SH + CH]$$

### Preservação Proporcional de Aspect Ratio
O usuário pode configurar o tamanho especificando o número de colunas (largura em folhas) ou a largura final em centímetros. O número de linhas é calculado dinamicamente preservando a proporção exata da imagem:
$$H_{\text{desejado}} = \frac{W_{\text{total}}}{\text{aspect\_ratio}}$$
$$R = \left\lceil \frac{H_{\text{desejado}} - OV}{SH} \right\rceil$$

---

## 3. Silhueta Humana Proporcional (1,80 m)

Para dar noção intuitiva da escala física do pôster antes da impressão, o Poster Studio renderiza na tela de preview uma silhueta humana matematicamente proporcional de **1,80 m (180 cm)** de altura:

$$\text{Fator de Escala} = \frac{180.0}{H_{\text{total (cm)}}}$$

- Se o pôster tiver 90 cm de altura, a silhueta terá o dobro da altura do pôster no viewport.
- Se o pôster tiver 3,60 m de altura, a silhueta terá metade da altura do pôster.
- Um botão de alternância no viewport permite ocultar ou exibir a silhueta conforme a conveniência do usuário.

---

## 4. Indicador de Resolução e DPI Efetivo

O Poster Studio monitora continuamente o DPI efetivo que a imagem terá quando impressa nas dimensões configuradas:

$$\text{DPI} = \frac{\text{Largura em Pixels}}{W_{\text{total (mm)}} / 25.4}$$

### Classificação de Qualidade:
- **DPI < 100:** ⚠ *Baixa resolução* — Alerta visual exibido (a impressão pode apresentar granulação ou falta de nitidez).
- **100 ≤ DPI < 150:** ✓ *Boa definição* — Adequado para pôsteres visualizados a média distância.
- **DPI ≥ 150:** ✓ *Alta definição* — Nitidez de padrão fotográfico / editorial.

---

## 5. Efeitos Artísticos & Retícula (Halftone)

O motor nativo Rust implementa cinco modos visuais:

1. **Original:** Imagem com fidelidade de cores, recorte preciso e fatiamento sem retícula.
2. **Preto & Branco (Monocromático):** Conversão por luminância perceptual $L = 0.299R + 0.587G + 0.114B$.
3. **Retícula Monocromática (Halftone Mono - Estilo Rasterbator):**
   - Amostragem da luminância em grade configurável por *pitch* (espaçamento de pontos em mm).
   - Pontos circulares ou quadrados com antialiasing.
   - Diâmetro mínimo e máximo configuráveis.
   - Cores customizadas de ponto e fundo (ex: Preto & Branco, Cyberpunk Menta, Âmbar Retrô, Blueprint Azul).
4. **Retícula Colorida (Color Halftone):**
   - Amostragem dos canais de cor RGB/CMYK em grade regular com círculos dimensionados conforme o valor do canal e fundo customizável.
5. **Dithering Floyd-Steinberg:**
   - Difusão de erro bidimensional em matriz $3 \times 3$ gerando texturas estocásticas de alto nível artístico.
6. **Alto Contraste:**
   - Binarização limiarizada com contraste e brilho ajustáveis.

---

## 6. Motor de Geração de PDF (`printpdf`)

O backend Rust (`PosterEngine`) gera o PDF multipáginas:
- **Tamanho exato:** Cada página é criada com as dimensões físicas exatas em milímetros do papel selecionado.
- **Marcas de corte (Crop Marks):** Guias de alinhamento impressas nas bordas da área útil.
- **Legenda de montagem:** Rodapé discreto em cada folha indicando posição da matriz e numeração:
  `Folha 5 de 12 (Linha 2, Coluna 1)`
- **Controle assíncrono via TaskManager:** A geração do PDF roda em thread pool sem travar a interface do usuário, com progresso contínuo de 0% a 100% e cancelamento em tempo real.
- **Abertura direta no Explorer:** Botão de acesso rápido para abrir o diretório contendo o arquivo PDF gerado.
