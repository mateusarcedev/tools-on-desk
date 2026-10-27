# ARCE TOOLS — Status de Implementação

Documento de acompanhamento detalhado de fases, requisitos e conformidade das **Missões 01, 02 e 02.5**.

---

## 1. Resumo Executivo das Missões

| Área | Missão | Status | Detalhes |
|---|:---:|:---:|---|
| **Ambiente Windows 11 Nativo** | 01 | Concluído | Rust 1.99.1 (MSVC), VS 2022 Tools, Windows SDK, WebView2 |
| **Shell e Interface Desktop** | 01 & 02.5 | Concluído | 9 telas fiéis ao design, barra sem decorações nativas duplicadas, temas |
| **Motor Global de Tarefas** | 01 & 02 | Concluído | Tokio mpsc, SQLite WAL, cancelamento cooperativo, concorrência |
| **Poster Studio (Avançado)** | 02.5 | Concluído | Paridade com Rasterbator, Modo Rápido + Stepper 6 etapas, A4/A3/Letter/Legal/Custom, silhueta 1.80m, DPI tracking, Halftone, Floyd-Steinberg, preview Rust base64, PDF printpdf |
| **Conversão de Imagens** | 01 | Concluído | PNG/JPEG, resize Lanczos3, qualidade, imagens para PDF |
| **Módulo Áudio (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP3/WAV/FLAC/AAC/OGG/OPUS, bitrate, loudnorm, trim |
| **Módulo Vídeo (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP4/MKV/WEBM, presets de compressão CRF, trim rápido e preciso, extração de frame |
| **Módulo Downloads (Multiplataforma)**| 02.5 | Concluído | yt-dlp, 13+ plataformas, detecção de playlists, download em lote, áudio (MP3/M4A/WAV/FLAC/OPUS), defesa contra SSRF |
| **Gerenciador de Motores Externos**| 02 | Concluído | `ExternalToolManager`: detecção, validação, encerramento limpo, sanitização |
| **Testes Automatizados** | 01, 02 & 02.5 | Concluído | 12 testes Vitest (frontend) + 8 testes nativos Rust MSVC (backend) — 100% aprovados |

---

## 2. Checklist Detalhado da Missão 02.5

### 2.1 Poster Studio Avançado (Referência Rasterbator.net & Além)
- [x] **Dois Modos de Trabalho:**
  - *Modo Rápido:* Drop da imagem $\rightarrow$ seletor de folhas / presets $\rightarrow$ exportação direta de PDF.
  - *Modo Avançado (6 Etapas):* 1. Imagem $\rightarrow$ 2. Tamanho $\rightarrow$ 3. Estilo $\rightarrow$ 4. Cores $\rightarrow$ 5. Impressão $\rightarrow$ 6. Exportação.
- [x] **Tipos de Papel e Orientação:**
  - Suporte nativo a A4, A3, Letter (Carta), Legal (Ofício) e dimensões Personalizadas em mm.
  - Orientação Retrato (*Portrait*) e Paisagem (*Landscape*).
- [x] **Geometria de Margens e Sobreposição (*Overlap*):**
  - Margens configuráveis para impressoras domésticas.
  - Sobreposição física ($CW = PW - 2M$, $SW = CW - OV$) garantindo montagem sem folgas ou saltos.
  - Preservação estrita do aspect ratio da imagem de origem.
- [x] **Silhueta Humana Proporcional (1,80 m):**
  - Proporção matemática exata calculada a partir da altura final do pôster montado.
  - Botão de alternância (toggle) no viewport para ocultar ou exibir a silhueta.
- [x] **Indicador de Qualidade e DPI Efetivo:**
  - Cálculo contínuo em tempo real baseado nos pixels reais da imagem e dimensões físicas.
  - Badges informativas: Baixa resolução (< 100 DPI), Boa definição (100–149 DPI) e Alta definição (≥ 150 DPI).
- [x] **Estilos Artísticos & Efeitos de Retícula:**
  - Original com fidelidade total de cores.
  - Preto & Branco monocromático.
  - Retícula Monocromática (*Halftone Mono*): pontos circulares ou quadrados com antialiasing, pitch e tamanhos min/max ajustáveis.
  - Retícula Colorida (*Color Halftone*): pontos coloridos por canal sobre fundo customizado.
  - Dithering Floyd-Steinberg: difusão de erro bidimensional em escala de cinza de alta precisão.
  - Alto Contraste: binarização com controles de brilho, contraste e inversão.
- [x] **Paletas e Cores Customizadas:**
  - Presets (Clássico P&B, Invertido Escuro, Cyberpunk Menta, Retrô Âmbar, Blueprint Azul, Sépia Editorial).
  - Seletores de cor de ponto e cor de fundo via color picker hexadecimal.
- [x] **Preview Interativo & Workspace:**
  - Backend Rust com renderizador de preview em base64 (`render_poster_preview`).
  - Zoom de 25% a 200%, ajuste à tela (fit) e grade de folhas com coordenadas alfanuméricas (A1, A2, B1...).
- [x] **Motor de PDF e Abertura no Explorer:**
  - Geração física exata via `printpdf`.
  - Marcas de corte e numeração de folhas com coordenadas de montagem (`Folha X de Y (Linha R, Coluna C)`).
  - Botão para revelar o PDF gerado diretamente no Windows Explorer.

---

### 2.2 Downloader Multiplataforma & Segurança
- [x] **Reconhecimento Automático de Plataformas:**
  - YouTube, YouTube Shorts, Instagram Posts & Reels, TikTok, Facebook / FB Watch, X (Twitter), Reddit, Pinterest, Vimeo, Twitch, SoundCloud, Dailymotion e plataformas compatíveis com yt-dlp.
- [x] **Suporte Completo a Playlists:**
  - Inspeção via `--flat-playlist` sem baixar os vídeos previamente.
  - Listagem com títulos, numeração e durações.
  - Seleção em massa ("Selecionar todos") e individual.
- [x] **Download em Lote (Multi-URL):**
  - Textarea com validação em tempo real de links por linha.
  - Enfileiramento sequencial e concorrente no `TaskManager`.
- [x] **Formatos de Extração de Áudio Expandidos:**
  - Suporte completo a MP3, M4A, WAV, FLAC e OPUS.
- [x] **Defesa Estrita contra SSRF:**
  - Bloqueio de localhost, loopbacks (`127.0.0.1`, `::1`), IPs privados RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e link-local/cloud metadata (`169.254.*`).
  - Validação no frontend e no backend Rust.
- [x] **Auditoria e Status do yt-dlp:**
  - Comando `get_ytdlp_status` informando versão e status do binário.
  - Card de status no rodapé com indicador verde de prontidão.

---

## 3. Cobertura de Testes Automatizados

### Backend Rust (8 testes nativos MSVC — 100% aprovados)
- `test_sqlite_tasks_and_history`: Validação de transações SQLite, estados e recuperação de tarefas.
- `test_poster_engine_calculation_and_pdf`: Validação de cálculo físico de grade, marcas de corte e PDF 1.4.
- `test_mandatory_rasterbator_example_4x3_12_sheets`: Teste de paridade com o caso de referência 4x3 12 folhas A4, margem 10mm, sobreposição 5mm e silhueta proporcional (~2.19).
- `test_image_engine_conversion`: Conversão PNG $\leftrightarrow$ JPEG e amostragem Lanczos3.
- `test_download_url_validation_and_ssrf`: Validação de URLs seguras e rejeição estrita de URLs SSRF / locais.
- `test_external_tools_discovery`: Detecção e auditoria de versão de FFmpeg, ffprobe e yt-dlp.
- `test_synthetic_audio_conversion_and_probe`: Geração de áudio sintético com FFmpeg lavfi, inspeção via `ffprobe`, conversão para MP3 192k e corte com verificação de integridade da saída.
- `test_synthetic_video_operations`: Geração de vídeo sintético de teste, inspeção de streams de vídeo via `ffprobe`, corte temporal e extração de frame JPG em disco.

### Frontend Vitest (12 testes unitários — 100% aprovados)
- `navigation.test.ts`: Rotas de navegação do app.
- `poster.test.ts`:
  - Cálculo de dimensões, margens e overlap A4.
  - Verificação da configuração obrigatória 4x3 12 folhas do Rasterbator e silhueta humana.
  - Geometria de papéis Letter, Legal e orientação Paisagem.
- `App.test.tsx`: Renderização do shell, barra de título, gaveta `Ctrl+J`, paleta `Ctrl+K`.
- `mediaScreens.test.tsx`:
  - `AudioScreen`: Renderização de controles de formato, bitrate, switches de loudnorm e trim, estados desabilitados.
  - `VideoScreen`: Alternância entre as 5 ferramentas (Converter, Comprimir, Extrair áudio, Cortar trecho, Extrair frame) e seus controles específicos.
  - `DownloadsScreen`: Badges de plataformas suportadas, alternância Vídeo/Áudio com formatos expandidos (MP3, M4A, WAV, FLAC, OPUS), modo em lote e bloqueio imediato contra SSRF.
