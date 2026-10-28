# Instruções para Agentes de IA e Desenvolvedores — ARCE TOOLS

Este documento define regras obrigatórias de arquitetura, padrões de código, estilo visual e procedimentos para qualquer IA ou desenvolvedor que for manter ou expandir o **Arce Tools** (Missões 01 a 06).

---

## 1. Diretrizes Visuais Inegociáveis (Design System)

- **Fidelidade Visual Absoluta**: A referência visual oficial é o protótipo `Arce Tools (standalone).html` e o `mateusarce.dev Design System.html`. **NUNCA substitua os componentes por frameworks genéricos (Tailwind padrão, Bootstrap, MUI, shadcn sem estilização customizada)**.
- **Tipografia**: O aplicativo utiliza exclusivamente:
  - `Geist` para textos, rótulos, botões, modais e títulos.
  - `Geist Mono` para códigos, atalhos de teclado (ex: `Ctrl+K`), métricas de arquivos, dimensões e especificações técnicas.
  - Ambas as fontes devem sempre ser carregadas localmente a partir de `/public/fonts/`. Não use CDNs.
- **Paleta de Cores**:
  - Dark Theme: Fundo `#0B0F10`, Superfície `#141A1C`, Borda `#1F292B`, Acento Menta `#15F5BA`, Texto Primário `#F3F4F6`.
  - Light Theme: Fundo `#F8FAFC`, Superfície `#FFFFFF`, Borda `#E2E8F0`, Acento Menta `#076B39`, Texto Primário `#0F172A`.
  - Todas as cores devem ser consumidas via variáveis CSS definidas em `src/styles/tokens.css` (`var(--bg)`, `var(--mint)`, `var(--surface)`, `var(--line)`).
- **Janela e Barra de Título (Frameless)**:
  - `"decorations": false` no `tauri.conf.json`.
  - A barra superior do aplicativo utiliza `data-tauri-drag-region` e botões de controle de janela nativos customizados. Não adicione decorações do Windows que dupliquem a barra.
- **Atalhos e Microinterações**:
  - Preservar o menu lateral recolhível (expandido 230px, recolhido 64px com tooltip).
  - Preservar a paleta de comandos `Ctrl+K` e o drawer de tarefas ativas `Ctrl+J`.
  - Preservar transições rápidas (150ms-200ms) e estados visuais hover/active/focus-visible em mint.

---

## 2. Princípios de Arquitetura e Engenharia

### 2.1 Backend Rust (`src-tauri/`)
1. **Tratamento de Erros**:
   - Utilize a enum tipada `AppError` em `src-tauri/src/error.rs` que implementa `thiserror::Error` e `serde::Serialize`.
   - **NUNCA use `.unwrap()` ou `.expect()` em código de produção ou manipuladores de comandos IPC**. Propague erros com o operador `?`.
2. **Supervisão de Motores Externos (FFmpeg, ffprobe, yt-dlp)**:
   - Toda execução de binários externos deve passar por `ExternalToolManager::run_with_cancellation` ou `tokio::process::Command::new(binary_path).args(arg_vec)`.
   - **NUNCA execute comandos por interpolação ou concatenação de strings em shells (`cmd.exe /c` ou `powershell -Command` são expressamente proibidos)**.
   - Sempre utilize a flag de processo `CREATE_NO_WINDOW = 0x08000000` no Windows.
   - Encerre o processo filho (`child.kill()`) imediatamente quando o `CancellationToken` for acionado.
   - Limpe arquivos temporários ou corrompidos gerados por cancelamentos.
3. **Defesa contra SSRF (Server-Side Request Forgery)**:
   - Toda URL recebida para download ou inspeção deve ser validada preventivamente:
     - Bloquear esquemas não-HTTP/HTTPS.
     - Bloquear `localhost`, `127.0.0.1`, `::1`.
     - Bloquear redes privadas RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e RFC 3927 (`169.254.*`).
4. **Poster Studio — Regras Matemáticas e Geometria**:
   - Margens não-imprimíveis e sobreposição física (*overlap*): $SW = CW - OV$. A largura total montada é $C \cdot SW + OV$.
   - A silhueta humana de referência deve sempre ter altura calculada matematicamente proporcional a 1,80 m (1800 mm).
   - Efeitos de retícula e pontilhismo (halftone, Floyd-Steinberg) devem ser calculados com amostragem física no Rust com antialiasing.
5. **Persistência SQLite e Integridade**:
   - Utilize transações para operações em lote e modo WAL (`PRAGMA journal_mode=WAL`).
   - Mantenha o `TaskManager` como fila única centralizada para todas as operações do sistema.
   - Previna colisões de arquivos no disco gerando sufixos numéricos (`arquivo (1).ext`).
6. **Respeito a Direitos Autorais e DRM**:
   - É expressamente proibida qualquer implementação de bypass de DRM ou violação de criptografia de fluxos de mídia.
7. **Armazenamento Seguro de Credenciais (Vault & NVIDIA Provider — Missão 06)**:
   - **NUNCA armazene chaves de API em texto puro no SQLite ou em arquivos de preferências legíveis**.
   - Criptografe credenciais via `SecureVault` utilizando algoritmo com derivação de chave e entropia da máquina local.
   - **NUNCA emita chaves de API em logs ou saídas IPC**. Aplique sanitização automática por regex (`NVIDIA_KEY_REGEX`) substituindo por `[PROTECTED_NVIDIA_KEY]`.
8. **Arce Motion Engine & Renderização de Vídeo (Missão 06)**:
   - Mantenha a renderização primária de Motion Design 100% nativa em Rust e FFmpeg (composição via `drawtext`, `overlay`, `scale`, `fade`).
   - O player de pré-visualização deve operar a 60 FPS contínuos via Canvas HTML5 sem recarregar o DOM.
   - A exportação para Remotion (`.tsx`) deve ser estruturada e limpa para desenvolvedores externos, sem forçar dependências de Node.js/Chromium/Puppeteer no usuário final.
9. **Isolamento de Workspace e OpenCode (Missão 06)**:
   - Toda execução de binários do OpenCode deve ocorrer com `CREATE_NO_WINDOW = 0x08000000` em um diretório de workspace isolado.
   - Caso o OpenCode não esteja instalado, utilize o orquestrador nativo em Rust (`orchestrate_rust_fallback`) para garantir funcionamento ininterrupto de todas as ferramentas criativas.

### 2.2 Frontend React (`src/`)
1. **TypeScript Estrito**:
   - `strict: true` ativado no `tsconfig.json`.
   - Todas as chamadas Tauri devem ter interfaces de solicitação e resposta tipadas em `src/types/`.
2. **Gerenciamento de Memória e Desempenho**:
   - **NÃO armazene buffers binários ou vídeos/áudios grandes no estado React**. O backend deve processar diretamente os caminhos de arquivos (`filepath`).
   - Metadados de mídia (duração, dimensões, codecs) devem ser obtidos pelo backend via `probeMedia` (`ffprobe`).
3. **Sem Mocks Fictícios de Sucesso**:
   - A interface nunca deve simular operações fictícias ou fingir que um download ou conversão ocorreu sem o motor real ter processado.

---

## 3. Ambiente e Procedimentos de Build

- **Ambiente Primário**: Windows 11 x64 nativo com toolchain MSVC (`x86_64-pc-windows-msvc`).
- **Dev Tools no Windows**:
  - Node.js e pnpm instalados.
  - Rust stable MSVC instalado via `rustup`.
  - Microsoft C++ Build Tools (Visual Studio 2022).
  - Windows 11 SDK.
  - WebView2 Runtime.
- **Compilação e Assets Embutidos**:
  - O `Cargo.toml` possui `[features] default = ["custom-protocol"]` para garantir que `tauri-codegen` sempre incorpore os arquivos estáticos de `../dist` diretamente no executável binário final.
  - Para compilar no Windows host a partir do repositório compartilhado WSL2:
    ```powershell
    $env:CARGO_TARGET_DIR = "C:\Users\marce\AppData\Local\Temp\arce-target"
    $env:CARGO_INCREMENTAL = "0"
    cargo test
    cargo build --release
    ```
- **Testes Automatizados Obrigatórios**:
  - Frontend: `pnpm test` (31 testes Vitest em 8 suítes)
  - Backend: `cargo test` (26 testes nativos MSVC)
