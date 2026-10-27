# Arce Tools

**Arce Tools** é um aplicativo desktop multiferramentas, gratuito, offline-first, de alta performance e visualmente premium, construído com **Tauri 2**, **Rust**, **React 19** e **TypeScript**.

O design foi rigorosamente reproduzido a partir do protótipo oficial do **Claude Design**, mantendo fidelidade estrita às famílias tipográficas **Geist** e **Geist Mono**, tema escuro nativo com destaque em **verde-menta** (`#15F5BA`), tema claro correspondente, atalhos de teclado ágeis (`Ctrl+K`, `Ctrl+J`) e barra de título customizada unificada sem duplicação de bordas de janela.

---

## 🚀 Funcionalidades Implementadas

### 1. Poster Studio Avançado (Referência Rasterbator.net & Além — Missão 02.5)
- **Dois Modos de Operação:**
  - *Modo Rápido:* Drop da imagem $\rightarrow$ seletor de folhas $\rightarrow$ exportação instantânea de PDF.
  - *Modo Avançado (6 Etapas):* Wizard completo com Imagem, Tamanho, Estilo, Cores, Impressão e Exportação.
- **Tipos de Papel e Orientação:** Suporte a **A4**, **A3**, **Letter**, **Legal** e **Personalizado** em milímetros, nas orientações Retrato e Paisagem.
- **Geometria de Margens e Sobreposição (*Overlap*):** Margens não-imprimíveis e sobreposição milimétrica para colagem contínua sem quebras de imagem.
- **Silhueta Humana Proporcional (1,80 m):** Proporção visual exata renderizada em relação à altura total do pôster montado (com toggle on/off).
- **Indicador de DPI Efetivo:** Monitoramento em tempo real da densidade de pixels impressos com alertas técnicos (Baixa resolução, Boa definição, Alta definição).
- **Estilos Artísticos de Retícula e Pontilhismo:**
  - *Original:* fidelidade total da foto.
  - *Preto & Branco:* conversão por luminância.
  - *Halftone Monocromático:* retícula geométrica estilo Rasterbator (pontos circulares ou quadrados antialiased com pitch e tamanhos min/max customizáveis).
  - *Halftone Colorido:* amostragem colorida em grade com fundo ajustável.
  - *Dithering Floyd-Steinberg:* difusão de erro bidimensional de padrão artístico.
  - *Alto Contraste:* binarização de alto impacto gráfico.
- **Paletas e Cores Customizadas:** Presets de cor (Cyberpunk Menta, Clássico P&B, Âmbar, Blueprint) e cores hexadecimais livres.
- **Workspace Interativo & Preview em Tempo Real:** Renderização Rust em base64 do efeito antes de exportar, zoom de 25% a 200%, ajuste de tela e numeração alfanumérica de cada folha (A1, A2, B1...).
- **Geração de PDF Multipágina:** Criação vetorial com marcas de corte, legendas de montagem e botão de acesso direto no Windows Explorer.

### 2. Downloader Multiplataforma & Seguro (Missão 02.5)
- **Reconhecimento Automático de 13+ Redes:** YouTube, YouTube Shorts, Instagram Posts & Reels, TikTok, Facebook / FB Watch, X (Twitter), Reddit, Pinterest, Vimeo, Twitch, SoundCloud, Dailymotion e compatíveis com yt-dlp.
- **Gestão Inteligente de Playlists:** Leitura via `--flat-playlist` sem download prévio, listagem de itens e seleção individual ou em lote.
- **Download em Lote (Multi-URL):** Textarea com suporte a dezenas de links, validação em tempo real e enfileiramento concorrente.
- **Extração de Áudio Expandida:** Extração de alta qualidade em **MP3**, **M4A**, **WAV**, **FLAC** e **OPUS**.
- **Defesa Rigorosa contra SSRF:** Bloqueio estrito de `localhost`, `127.0.0.1`, loopbacks IPv6, faixas privadas RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e metadados de nuvem RFC 3927 (`169.254.*`).
- **Card de Auditoria yt-dlp:** Indicador em tempo real de versão, status e conformidade com direitos autorais (sem quebra de DRM).

### 3. Módulo de Áudio (Missão 02)
- **Inspeção de Metadados Reais:** Análise instantânea via `ffprobe` com duração precisa, taxa de amostragem (Hz), número de canais e bitrate original.
- **Conversão de Formatos:** MP3, WAV, FLAC, M4A, OGG e OPUS com ajuste de bitrate (128k a 320k) e canais (Mono/Estéreo).
- **Normalização de Volume:** Algoritmo broadcast padrão EBU R128 (`loudnorm=I=-14:LRA=11:TP=-1.5`) para streaming e podcasts.
- **Corte por Intervalo:** Recorte temporal milimétrico com início e fim configuráveis em segundos.
- **Waveform Dinâmico:** Visualizador de forma de onda reativo e leve sem sobrecarregar a memória do React.
- **Extração de Áudio de Vídeos:** Conversão direta de trilhas sonoras de vídeos para qualquer formato de áudio.

### 4. Módulo de Vídeo (Missão 02)
- **Inspeção e Metadados de Vídeo:** Detecção de resolução original (largura $\times$ altura), taxa de quadros (FPS), codec de vídeo e duração real.
- **Conversão de Contêineres:** MP4, MKV e WEBM com suporte a codecs modernos (`libx264`, `libx265`, `libvpx-vp9`).
- **Compressão com Presets de CRF:**
  - Qualidade alta (CRF 18)
  - Equilibrado (CRF 23)
  - Arquivo menor (CRF 28)
  - Redimensionamento opcional com aspect ratio preservado (`1080p`, `720p`, `480p`).
- **Dois Modos de Corte de Vídeo:**
  - *Corte Rápido:* `-c copy` instantâneo sem perda de qualidade, aproveitando keyframes.
  - *Corte Preciso:* recodificação quadro a quadro com precisão cirúrgica.
- **Extração de Frames Estáticos:** Captura de fotos em alta resolução em timestamps selecionados nos formatos JPG e PNG.
- **Remoção de Áudio:** Opção de exportação com áudio desativado (Mudo).

### 5. Conversão e Otimização de Imagens (Missão 01)
- Conversão individual ou em lote entre PNG e JPEG.
- Redimensionamento por amostragem **Lanczos3** de alta fidelidade visual.
- Compilação de múltiplas imagens em um único arquivo PDF.

### 6. Motor Global de Tarefas & Shell Desktop
- Fila assíncrona baseada em Tokio com controle de concorrência por semáforo e persistência contínua em SQLite (modo WAL).
- Cancelamento verdadeiro de tarefas que encerra processos externos (`child.kill()`) e remove arquivos parciais corrompidos.
- Paleta universal de comandos (`Ctrl+K`) e gaveta de tarefas ativas (`Ctrl+J`).
- Barra de título unificada sem bordas duplicadas do Windows 11 (`data-tauri-drag-region`).

---

## 🛠️ Motores Externos e Licenciamento

O Arce Tools orquestra ferramentas consagradas da indústria sob chamadas estruturadas e seguras (`ExternalToolManager`):

| Ferramenta | Versão Validada | Origem | Licença | Finalidade |
|---|---|---|---|---|
| **FFmpeg** | 8.1.1 full_build | Gyan.dev / WinGet | GPL v3 / LGPL v2.1+ | Processamento de áudio e vídeo |
| **ffprobe** | 8.1.1 full_build | Gyan.dev / WinGet | GPL v3 / LGPL v2.1+ | Inspeção profunda de streams e codecs |
| **yt-dlp** | 2026.10.26 | GitHub / WinGet | The Unlicense | Download de mídias de fontes autorizadas |

---

## 💻 Requisitos e Instalação (Windows 11)

### Pré-requisitos
- **Windows 11 x64**
- **Node.js** (v20+ recomendado) e **pnpm**
- **Rust stable** com a toolchain MSVC (`x86_64-pc-windows-msvc`):
  ```powershell
  winget install Rustlang.Rustup
  rustup default stable-x86_64-pc-windows-msvc
  ```
- **Microsoft C++ Build Tools** (Visual Studio 2022) e **Windows 11 SDK**
- **Microsoft Edge WebView2 Runtime** (nativo do Windows 11)
- **FFmpeg e yt-dlp** (detectados automaticamente via WinGet ou no PATH):
  ```powershell
  winget install Gyan.FFmpeg
  winget install yt-dlp.yt-dlp
  ```

### Executando em Modo Desenvolvimento
```bash
# Na raiz do projeto
pnpm install
pnpm tauri dev
```

### Executando os Testes Automatizados
```bash
# 1. Testes do Frontend (Vitest - 12 testes)
pnpm test

# 2. Testes Nativos do Backend (Rust MSVC - 8 testes)
cargo test
```

### Compilação de Produção
```bash
# Frontend
pnpm build

# Binário Nativo Release Windows x64
cargo build --release
```
O executável final é gerado em `target/release/arce-tools.exe` (~7.73 MB).
