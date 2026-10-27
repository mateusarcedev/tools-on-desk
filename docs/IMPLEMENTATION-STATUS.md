# ARCE TOOLS — Status de Implementação

Documento de acompanhamento detalhado de fases, requisitos e conformidade das **Missões 01 e 02**.

---

## 1. Resumo Executivo das Missões

| Área | Missão | Status | Detalhes |
|---|:---:|:---:|---|
| **Ambiente Windows 11 Nativo** | 01 | Concluído | Rust 1.99.1 (MSVC), VS 2022 Tools, Windows SDK, WebView2 |
| **Shell e Interface Desktop** | 01 | Concluído | 9 telas fiéis ao Claude Design, navegação, atalhos, temas |
| **Motor Global de Tarefas** | 01 & 02 | Concluído | Tokio mpsc, SQLite WAL, cancelamento cooperativo, concorrência |
| **Poster Studio (Real)** | 01 | Concluído | Slicing de folhas, cálculo físico mm/pt, marcas de corte, PDF 1.4 |
| **Conversão de Imagens (Real)**| 01 | Concluído | PNG/JPEG, resize Lanczos3, qualidade, imagens para PDF |
| **Módulo Áudio (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP3/WAV/FLAC/AAC/OGG/OPUS, bitrate, loudnorm, trim |
| **Módulo Vídeo (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP4/MKV/WEBM, presets de compressão CRF, trim rápido e preciso, extração de frame |
| **Módulo Downloads (Real)** | 02 | Concluído | yt-dlp, validação estrita de URLs, consulta de metadados prévios, extração de áudio, downloads seguros |
| **Gerenciador de Motores Externos**| 02 | Concluído | `ExternalToolManager`: detecção, validação, encerramento limpo, sanitização |
| **Testes Automatizados** | 01 & 02 | Concluído | 10 testes Vitest (frontend) + 7 testes nativos Rust (backend com synthetic FFmpeg) |

---

## 2. Checklist Detalhado da Missão 02

### 2.1 Módulo Áudio (Implementação Real)
- [x] Detecção e inspeção de metadados reais via `MediaEngine::probe` (`ffprobe`).
- [x] Importação individual e múltipla via diálogo nativo (`selectFiles`) e drag-and-drop.
- [x] Exibição de metadados reais: duração formatada, sample rate (ex.: 44.1 kHz), número de canais (Mono/Estéreo) e bitrate.
- [x] Visualizador de onda (waveform) dinâmico sem reter arquivos binários pesados na memória do React.
- [x] Conversão entre formatos de áudio: MP3, WAV, FLAC, M4A, OGG e OPUS.
- [x] Configuração de taxa de bits (bitrate): 128 kbps, 192 kbps, 256 kbps, 320 kbps.
- [x] Configuração de canais: Estéreo (2) e Mono (1).
- [x] Normalização de volume inteligente via filtro broadcast `-filter:a loudnorm=I=-14:LRA=11:TP=-1.5`.
- [x] Corte de trecho (`audio.trim`) por intervalo com precisão de milissegundos.
- [x] Enfileiramento real no `TaskManager` com persistência no SQLite e atualização de histórico.

### 2.2 Módulo Vídeo (Implementação Real)
- [x] Leitura de resolução real (largura $\times$ altura), taxa de quadros (FPS), codec de vídeo e duração via `ffprobe`.
- [x] Conversão de formatos: MP4, MKV e WEBM com seleção de codecs (`libx264`, `libx265`, `libvpx-vp9`).
- [x] Compressão de vídeo com presets intuitivos:
  - Qualidade alta: CRF 18
  - Equilibrado: CRF 23
  - Arquivo menor: CRF 28
  - Redimensionamento opcional com preservação de aspect ratio (`scale=-2:1080`, `scale=-2:720`, `scale=-2:480`).
- [x] Dois modos tecnicamente distintos de corte:
  - Corte rápido (`fast_copy: true`): `-c copy` instantâneo baseado no keyframe mais próximo com aviso explicativo.
  - Corte preciso (`fast_copy: false`): recodificação quadro a quadro com precisão exata.
- [x] Extração de áudio de vídeos (`video.extract_audio`) para MP3, WAV, AAC e FLAC.
- [x] Extração de frame estático (`video.extract_frame`) em timestamp selecionado nos formatos JPG e PNG.
- [x] Opção de mudo (`mute_audio: true` via `-an`).

### 2.3 Módulo Downloads (Implementação Real)
- [x] Validação rigorosa de URLs (rejeição de caracteres de injeção de shell: `;`, `&`, `|`, `$`, `<`, `>`, `"`, quebras de linha).
- [x] Consulta prévia assíncrona de metadados via `yt-dlp --dump-single-json`:
  - Título, canal/autor, miniatura e duração real.
- [x] Seletor de qualidade de vídeo (1080p, 720p, 480p) e contêiner (MP4, MKV).
- [x] Modo "Somente áudio" com extração direta em MP3, M4A ou FLAC.
- [x] Seletor de pasta de destino personalizada via diálogo nativo (`selectFolder`).
- [x] Suporte a download em lote (múltiplos links, um por linha).
- [x] Progresso real capturado via `--progress-template` do yt-dlp (porcentagem, velocidade, ETA).
- [x] Política estrita de conformidade: proibição absoluta de bypass de DRM ou violação de criptografia.

### 2.4 Gerenciamento de Motores Externos (`ExternalToolManager`)
- [x] Descoberta automática de executáveis:
  - Diretório de binários da aplicação (`./binaries/`).
  - Diretórios do WinGet (`%LOCALAPPDATA%\Microsoft\WinGet\Packages\...`).
  - Variável de ambiente `PATH`.
- [x] Execução estruturada via `tokio::process::Command` sem passagem por interpretadores de shell (`cmd.exe /c` ou `powershell -Command` expressamente proibidos).
- [x] Flag de criação de processo no Windows `CREATE_NO_WINDOW = 0x08000000` (impede abertura de janelas pretas do prompt).
- [x] Cancelamento cooperativo seguro: encerramento imediato do processo filho (`child.kill()`) ao cancelar a tarefa no `TaskManager`.
- [x] Limpeza automática de arquivos parciais corrompidos em caso de falha ou cancelamento.
- [x] Prevenção de colisões com arquivos existentes (`nome (1).ext`).
- [x] Suporte completo a nomes de arquivos Unicode e caminhos com espaços.

---

## 3. Cobertura de Testes Automatizados

### Backend Rust (7 testes nativos MSVC — 100% aprovados)
- `test_sqlite_tasks_and_history`: Validação de transações SQLite, estados e recuperação de tarefas.
- `test_poster_engine_calculation_and_pdf`: Validação de cálculo físico de grade, marcas de corte e PDF 1.4.
- `test_image_engine_conversion`: Conversão PNG $\leftrightarrow$ JPEG e amostragem Lanczos3.
- `test_download_url_validation`: Validação de URLs seguras e rejeição de payloads maliciosos.
- `test_external_tools_discovery`: Detecção e auditoria de versão de FFmpeg, ffprobe e yt-dlp.
- `test_synthetic_audio_conversion_and_probe`: Geração de áudio sintético com FFmpeg lavfi, inspeção via `ffprobe`, conversão para MP3 192k e corte com verificação de integridade da saída.
- `test_synthetic_video_operations`: Geração de vídeo sintético de teste, inspeção de streams de vídeo via `ffprobe`, corte temporal e extração de frame JPG em disco.

### Frontend Vitest (10 testes unitários — 100% aprovados)
- `navigation.test.ts`: Rotas de navegação do app.
- `poster.test.ts`: Matemática de páginas e DPI do Poster Studio.
- `App.test.tsx`: Renderização do shell, barra de título, gaveta `Ctrl+J`, paleta `Ctrl+K`.
- `mediaScreens.test.tsx`:
  - `AudioScreen`: Renderização de controles de formato, bitrate, switches de loudnorm e trim, estados desabilitados.
  - `VideoScreen`: Alternância entre as 5 ferramentas (Converter, Comprimir, Extrair áudio, Cortar trecho, Extrair frame) e seus controles específicos.
  - `DownloadsScreen`: Input de link, alternância entre Vídeo e Somente áudio, validação e envio.
