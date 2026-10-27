# ARCE TOOLS — Arquitetura do Sistema

Documento de especificação técnica e arquitetura da aplicação desktop **Arce Tools** (Missões 01, 02 e 02.5).

---

## 1. Visão Geral

O **Arce Tools** é um aplicativo desktop multiferramentas offline-first, de alta fidelidade visual e baixo consumo de recursos, projetado nativamente para Windows 11 (x64) com suporte para Linux e macOS.

A arquitetura adota o modelo desacoplado do **Tauri 2**, separando estritamente a interface do usuário (Webview2 / React 19) do motor de execução nativo de alto desempenho (Rust / Tokio / SQLite) e dos motores externos especializados (**FFmpeg**, **ffprobe**, **yt-dlp**).

```mermaid
flowchart TD
    subgraph UI ["Frontend (React 19 + TypeScript + Vite)"]
        Shell["Application Shell\n(Frameless TitleBar, Sidebar, Command Palette, Task Drawer)"]
        Screens["Telas / Módulos\n(Início, Poster Studio, Imagens, Áudio, Vídeo, Downloads, Histórico, Configurações)"]
        State["Estado & Contexto\n(Tasks, History, Theme, Preferences)"]
        TauriClient["Camada de Serviços Tauri\n(@tauri-apps/api/core)"]
    end

    subgraph IPC ["Comunicação IPC"]
        Commands["Tauri Commands (invoke tipado)"]
        Events["Tauri Event Bus (emit / listen)"]
    end

    subgraph Core ["Backend Nativo (Rust 2021)"]
        CmdLayer["Commands Handler\n(tasks, history, poster, images, audio, video, downloads, system)"]
        TaskManager["TaskManager\n(Fila assíncrona, Concorrência configurável, Cancelamento)"]
        Engines["Motores Nativos Internos\n(PosterEngine, ImageEngine)"]
        DB["SQLite Bundled Database\n(tasks, history, preferences)"]
        FS["File System & Native Dialogs\n(tauri-plugin-dialog, tauri-plugin-opener)"]
        ToolManager["ExternalToolManager\n(Detecção, Sanitização, Process Supervision, CancellationToken)"]
    end

    subgraph External ["Motores Especializados Externos"]
        FFmpeg["FFmpeg 8.1\n(Conversão, Compressão, Recorte, Normalização)"]
        FFprobe["ffprobe\n(Inspeção profunda de codecs, streams e metadados)"]
        YtDlp["yt-dlp\n(Extração e download multiplataforma de mídias autorizadas)"]
    end

    Shell --> Screens
    Screens --> State
    State --> TauriClient
    TauriClient --> Commands
    TauriClient <-- Events

    Commands --> CmdLayer
    CmdLayer --> TaskManager
    CmdLayer --> Engines
    CmdLayer --> ToolManager
    CmdLayer --> DB
    CmdLayer --> FS
    TaskManager --> DB
    TaskManager --> Events
    TaskManager --> Engines
    TaskManager --> ToolManager
    ToolManager --> FFmpeg
    ToolManager --> FFprobe
    ToolManager --> YtDlp
```

---

## 2. Camada de Motores Externos (`ExternalToolManager`)

Localizado em [`src-tauri/src/engines/external_tools.rs`](file:///home/mateusarcedev/projetos/arce-tools/src-tauri/src/engines/external_tools.rs):

### 2.1 Políticas Rígidas de Execução e Segurança
1. **Sem Injeção de Shell:** A execução de processos ocorre exclusivamente via `tokio::process::Command::new(binary_path).args(arg_vec)`. Nenhuma chamada passa por `cmd.exe /c` ou `powershell -Command`.
2. **Defesa contra SSRF:** Bloqueio prévio de endereços locais (`localhost`, `127.0.0.1`, `::1`), faixas privadas RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e metadados de nuvem/link-local (`169.254.*`).
3. **Sem Janelas Pretas:** No Windows, o processo é criado com a flag `CREATE_NO_WINDOW = 0x08000000`, mantendo a execução 100% invisível ao usuário final.
4. **Supervisão e Cancelamento Imediato:** Loops de processamento escutam tokens atômicos de cancelamento (`AtomicBool`). Caso o usuário cancele a tarefa, o subprocesso filho recebe um comando `child.kill().await` imediato, evitando processos zumbis ou vazamento de recursos.
5. **Limpeza de Arquivos Temporários:** Em caso de erro ou cancelamento no meio de uma conversão de áudio ou vídeo, arquivos parciais corrompidos são automaticamente deletados do disco.

### 2.2 Descoberta de Executáveis
A resolução de binários segue ordem determinística:
1. Pasta de binários locais da aplicação (`./binaries/` ou ao lado do executável em produção).
2. Diretórios conhecidos de instalação do WinGet em `%LOCALAPPDATA%\Microsoft\WinGet\Packages\...`.
3. Variável de ambiente `PATH` do sistema.

---

## 3. Motores Multimídia Implementados

### 3.1 MediaEngine (`media_engine.rs`)
Responsável pela inspeção não-bloqueante de arquivos de mídia via `ffprobe -v quiet -print_format json -show_format -show_streams`:
- Extração de duração física exata, tamanho em bytes e taxa de bits global.
- Detecção de streams de vídeo: resolução (largura $\times$ altura), taxa de quadros (FPS calculada de frações como 30000/1001 ou 30/1) e codec.
- Detecção de streams de áudio: taxa de amostragem (ex.: 44100 Hz), número de canais e codec.

### 3.2 AudioEngine (`audio_engine.rs`)
- **Conversão de Formatos:** MP3 (via `libmp3lame`), WAV (`pcm_s16le`), FLAC (`flac`), M4A/AAC (`aac`), OGG (`libvorbis`), OPUS (`libopus`).
- **Normalização de Volume:** Aplicação do padrão broadcast EBU R128 (`loudnorm=I=-14:LRA=11:TP=-1.5`).
- **Corte por Intervalo:** Segmentação temporal precisa por início e fim em segundos (`-ss` e `-to`).
- **Progresso Real:** Parser estruturado do output `-progress pipe:1 -nostats` calculando $\text{progresso} = \text{tempo decorrido} / \text{duração total}$.

### 3.3 VideoEngine (`video_engine.rs`)
- **Conversão de Formatos:** MP4, MKV e WEBM (`libx264`, `libx265`, `libvpx-vp9`).
- **Compressão de Vídeo:** Presets de taxa constante (CRF 18 para alta qualidade, CRF 23 para equilibrado, CRF 28 para arquivo menor).
- **Redimensionamento:** Escala proporcional adaptada (`scale=-2:1080`, `scale=-2:720`, `scale=-2:480`).
- **Modos de Corte:**
  - *Corte Rápido:* `-c copy` instantâneo sem perda de qualidade, alinhado aos keyframes mais próximos.
  - *Corte Preciso:* recodificação quadro a quadro com precisão exata.
- **Extração de Áudio e Frames:** Extração de áudio diretamente da trilha do vídeo ou captura de imagem estática (JPG/PNG) em um timestamp selecionado.

### 3.4 DownloadEngine (`download_engine.rs`)
- **Reconhecimento de 13+ Plataformas:** YouTube, Shorts, Instagram, Reels, TikTok, Facebook, X (Twitter), Reddit, Pinterest, Vimeo, Twitch, SoundCloud, Dailymotion e genérico.
- **Inspeção de Playlists:** `--dump-single-json --flat-playlist` para extração de índices, títulos e durações sem pré-download.
- **Download em Lote:** Enfileiramento em lote via textarea no TaskManager.
- **Formatos de Extração de Áudio:** MP3, M4A, WAV, FLAC e OPUS.
- **Defesa Rigorosa contra SSRF:** Rejeição de requisições a loopbacks e redes privadas.
- **Auditoria de Versão:** Comando `get_ytdlp_status` verificando versão e procedência.

### 3.5 PosterEngine (`poster_engine.rs`)
- **Paridade Rasterbator.net & Além:**
  - Suporte a papéis A4, A3, Letter, Legal e Personalizado.
  - Orientação Retrato / Paisagem.
  - Cálculo físico milimétrico de margens e sobreposição de montagem (*overlap*).
  - Silhueta humana proporcional de 1,80 m com alternância on/off no viewport.
  - Indicador em tempo real de DPI efetivo com faixas de qualidade.
  - Efeitos artísticos: Original, P&B, Halftone Monocromático (círculos e quadrados antialiased com pitch e min/max dot size configuráveis), Halftone Colorido, Dithering Floyd-Steinberg e Alto Contraste.
  - Geração de PDF via `printpdf` com marcas de corte e legendas alfanuméricas de montagem.
  - Renderizador de preview Rust em tempo real retornando base64 (`render_poster_preview`).

---

## 4. Contratos IPC Atualizados (Tauri Commands)

| Comando | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `probe_media` | `filePath: String` | `MediaInfo` | Inspeção profunda de codecs, streams e duração via ffprobe |
| `start_audio_convert` | `options: AudioConvertOptions` | `String (task_id)` | Enfileira conversão de áudio no TaskManager |
| `start_audio_trim` | `options: AudioTrimOptions` | `String (task_id)` | Enfileira corte de áudio por intervalo |
| `start_video_convert` | `options: VideoConvertOptions` | `String (task_id)` | Enfileira conversão de vídeo com codec e CRF |
| `start_video_compress`| `options: VideoCompressOptions`| `String (task_id)` | Enfileira compressão com presets de qualidade |
| `start_video_trim` | `options: VideoTrimOptions` | `String (task_id)` | Enfileira corte rápido ou preciso de vídeo |
| `start_video_extract_audio` | `options: VideoExtractAudioOptions` | `String (task_id)` | Extrai trilha sonora do vídeo para áudio |
| `start_video_extract_frame` | `options: VideoExtractFrameOptions` | `String (task_id)` | Extrai imagem estática de um frame |
| `fetch_download_info`| `url: String` | `MediaDownloadInfo` | Obtém título, miniatura, plataforma e itens de playlist |
| `get_ytdlp_status` | Nenhum | `YtDlpStatus` | Retorna versão, caminho e disponibilidade do yt-dlp |
| `start_download` | `options: DownloadOptions` | `String (task_id)` | Enfileira download de vídeo ou áudio via yt-dlp |
| `check_external_tools`| Nenhum | `ExternalToolsStatus`| Retorna versão, caminho e licença de FFmpeg, ffprobe e yt-dlp |
| `get_tasks` | Nenhum | `Vec<Task>` | Lista todas as tarefas persistidas |
| `cancel_task` | `id: String` | `()` | Cancela a tarefa e encerra subprocessos associados |
| `retry_task` | `id: String` | `()` | Re-enfileira tarefa falha ou cancelada |
| `calculate_poster_spec`| `options: PosterOptions`| `PosterSpec` | Calcula colunas, linhas, páginas, dimensões montadas, DPI e razão de escala humana |
| `render_poster_preview`| `options: PosterOptions`| `String (data_url)`| Gera preview processado em base64 com efeitos artísticos em tempo real |
| `start_poster_task` | `options: PosterOptions` | `String (task_id)` | Enfileira geração de PDF multipágina do pôster |
| `start_image_conversion_task` | `options: ImageConvertOptions` | `String (task_id)` | Enfileira conversão/resize de imagens |
| `start_images_to_pdf_task` | `options: ImagesToPdfOptions` | `String (task_id)` | Enfileira compilação de imagens em PDF |
| `get_system_info` | Nenhum | `SystemInfo` | Pastas padrão do sistema e SO |
| `open_path_in_explorer` | `path: String` | `()` | Revela arquivo ou pasta no Windows Explorer |
