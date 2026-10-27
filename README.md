# Arce Tools

**Arce Tools** é um aplicativo desktop multiferramentas, gratuito, offline-first, de alta performance e visualmente premium, construído com **Tauri 2**, **Rust**, **React 19** e **TypeScript**.

O design foi rigorosamente reproduzido a partir do protótipo oficial do **Claude Design**, mantendo fidelidade estrita às famílias tipográficas **Geist** e **Geist Mono**, tema escuro nativo com destaque em **verde-menta** (`#15F5BA`), tema claro correspondente, atalhos de teclado ágeis (`Ctrl+K`, `Ctrl+J`) e microinterações fluidas.

---

## 🚀 Funcionalidades Implementadas

### 1. Módulo de Áudio (Novo na Missão 02)
- **Inspeção de Metadados Reais:** Análise instantânea via `ffprobe` com duração precisa, taxa de amostragem (Hz), número de canais e bitrate original.
- **Conversão de Formatos:** MP3, WAV, FLAC, M4A, OGG e OPUS com ajuste de bitrate (128k a 320k) e canais (Mono/Estéreo).
- **Normalização de Volume:** Algoritmo broadcast padrão EBU R128 (`loudnorm=I=-14:LRA=11:TP=-1.5`) para streaming e podcasts.
- **Corte por Intervalo:** Recorte temporal milimétrico com início e fim configuráveis em segundos.
- **Waveform Dinâmico:** Visualizador de forma de onda reativo e leve sem sobrecarregar a memória do React.
- **Extração de Áudio de Vídeos:** Conversão direta de trilhas sonoras de vídeos para qualquer formato de áudio.

### 2. Módulo de Vídeo (Novo na Missão 02)
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

### 3. Módulo de Downloads (Novo na Missão 02)
- **Motor Integrado yt-dlp:** Extração e download de mídias a partir de fontes e plataformas permitidas.
- **Validação Estrita de URLs:** Prevenção contra injeção de parâmetros ou metacaracteres de shell.
- **Consulta Prévia de Metadados:** Exibição do título, canal/autor, miniatura e duração antes de iniciar o download.
- **Seletores de Qualidade e Formato:** Opções de resolução de vídeo (1080p, 720p, 480p) ou modo "Somente áudio" (MP3, M4A, FLAC).
- **Downloads em Lote:** Suporte a listas de URLs para enfileiramento sequencial.
- **Conformidade Ética e Legal:** Sem bypass de DRM ou violação de criptografia de fluxos protegidos.

### 4. Poster Studio (Missão 01)
- Divisão de imagens em folhas **A4**, **A3** ou dimensões personalizadas para montagem de pôsteres gigantes para impressão (estilo Rasterbator).
- Margens físicas configuráveis (mm), sobreposição entre folhas (overlap) para colagem e marcas de corte vetoriais.
- Cálculo de DPI efetivo com alerta visual para resoluções abaixo de 150 DPI.
- Gerador próprio em Rust puro de PDFs multipágina compatíveis com a especificação **PDF 1.4**.

### 5. Conversão e Otimização de Imagens (Missão 01)
- Conversão individual ou em lote entre PNG e JPEG.
- Redimensionamento por amostragem **Lanczos3** de alta fidelidade visual.
- Compilação de múltiplas imagens em um único arquivo PDF.

### 6. Motor Global de Tarefas & Shell Desktop
- Fila assíncrona baseada em Tokio com controle de concorrência por semáforo e persistência contínua em SQLite (modo WAL).
- Cancelamento verdadeiro de tarefas que encerra processos externos (`child.kill()`) e remove arquivos parciais corrompidos.
- Paleta universal de comandos (`Ctrl+K`) e gaveta de tarefas ativas (`Ctrl+J`).

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
# 1. Testes do Frontend (Vitest - 10 testes)
pnpm test

# 2. Testes Nativos do Backend (Rust MSVC - 7 testes com synthetic FFmpeg)
cargo test --manifest-path src-tauri/Cargo.toml
```

### Compilando para Produção
```powershell
# Build do Frontend
pnpm build

# Build do Executável Nativo Windows
cargo build --release --manifest-path src-tauri/Cargo.toml
```
O executável otimizado será gerado em `target/release/arce-tools.exe` com apenas **~7 MB** de tamanho.
