# ToolsOnDesk (ex-Arce Tools) — Status de Implementação

Documento de acompanhamento detalhado de fases, requisitos e conformidade das **Missões 01 a 07**.

> [!NOTE]
> **Histórico:** As Missões 01 a 06 foram implementadas e estabilizadas sob o nome **Arce Tools**. A partir da **Missão 07**, o software evoluiu para o nome de trabalho **ToolsOnDesk**, com infraestrutura de caminhos centralizada e migração atômica de dados.

---

## 1. Resumo Executivo das Missões

| Área | Missão | Status | Detalhes |
|---|:---:|:---:|---|
| **Ambiente Windows 11 Nativo** | 01 | Concluído | Rust 1.99.1 (MSVC), VS 2022 Tools, Windows SDK, WebView2 |
| **Shell e Interface Desktop** | 01 & 02.5 | Concluído | 9 telas fiéis ao design, barra sem decorações nativas duplicadas, temas |
| **Motor Global de Tarefas** | 01, 02 & 03 | Concluído | Tokio mpsc, SQLite WAL, cancelamento cooperativo, concorrência, captura persistente de erros |
| **Poster Studio (Avançado)** | 02.5 | Concluído | Paridade com Rasterbator, Modo Rápido + Stepper 6 etapas, A4/A3/Letter/Legal/Custom, silhueta 1.80m, DPI tracking, Halftone, Floyd-Steinberg, preview Rust base64, PDF printpdf |
| **Conversão de Imagens** | 01 | Concluído | PNG/JPEG, resize Lanczos3, qualidade, imagens para PDF |
| **Módulo Áudio (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP3/WAV/FLAC/AAC/OGG/OPUS, bitrate, loudnorm, trim |
| **Módulo Vídeo (Real)** | 02 | Concluído | FFmpeg/ffprobe, MP4/MKV/WEBM, presets de compressão CRF, trim rápido e preciso, extração de frame |
| **Módulo Downloads (Multiplataforma)**| 02.5 & 04 | Concluído | yt-dlp, 13+ plataformas, detecção de playlists, download em lote, áudio (MP3/M4A/WAV/FLAC/OPUS), defesa contra SSRF, limpeza automática de parciais `.part` |
| **Document Engine (Real)** | 03 | Concluído | PDF Inspector, PDF Merge (renumeração de objetos), PDF Split (todos, intervalos, cada N), PDF Organize (reordenação e rotação sem sobrescrever original), PDF Compress (Deflate e poda estrutural), Word para PDF (LibreOffice headless isolado), PDF para Word (extração e geração de DOCX via docx-rs) |
| **Central de Erros e Diagnósticos** | 03 & 04 | Concluído | Tabela SQLite `error_logs`, índices, sanitização avançada em 7 camadas, deduplicação em 3s, filtros normalizados (case/period), cópia individual com feedback visual, "Copiar todos" de todo o banco, exportações TXT e JSON |
| **Auditoria e Encerramento de Processos** | 04 | Concluído | `taskkill /F /T /PID` no Windows para eliminação total de processos filhos órfãos, verificação periódica de cancelamento |
| **Instalador Oficial Windows (NSIS)** | 04 & 05 | Concluído | `Arce Tools_0.1.0_x64-setup.exe` (4,68 MB) com instalação por usuário (`currentUser`), desinstalador limpo e atalhos |
| **Setup Center (Central de Configuração)**| 05 | Concluído | Assistente de 4 etapas (Boas-vindas, Verificação, Ferramentas, Pronto), persistência SQLite e atalhos |
| **DependencyManager (Nativo Rust)** | 05 | Concluído | Descoberta em 4 níveis, instalação isolada em `%LOCALAPPDATA%`, proteção Zip Slip, SHA-256 e rollback atômico |
| **Arce Creative Studio & IA** | 06 | Concluído | 8 sub-views, Briefing Generativo, StyleSelector, StoryboardApprover, AME Canvas 60 FPS, compilador FFmpeg MP4, Remotion TSX, NVIDIA NIM Provider, SecureVault, 16 Skills SKILL.md, OpenCode Sandbox |
| **Rebranding & Migração ToolsOnDesk** | 07 | Concluído | Nome ToolsOnDesk, `com.toolsondesk.desktop`, `PathManager` em Rust, Migração transacional em 10 passos, SQLite Online Backup API, Windows DPAPI (`crypt32.dll`), zeroize de memória, zero dados deletados, modal React |
| **Portabilidade Nativa Multiplataforma**| 08 | Concluído | Camada `PlatformServices` (Windows, Linux, macOS), XDG Base Directory, Apple Keychain, POSIX PGID SIGTERM/KILL, WebKitGTK 4.1, WKWebView, GitHub Actions CI/CD e contratos Android |
| **Testes Automatizados** | Todas | Concluído | 34 testes Vitest (frontend) + 31 testes nativos Rust (backend) — 100% aprovados |

---

## 2. Checklist Detalhado da Missão 03

### 2.1 Módulo de Documentos (Document Engine)
- [x] **PDF Inspector (`inspect_pdf`):**
  - Contagem de páginas, tamanho formatado em KB/MB, orientação (Retrato/Paisagem).
  - Dimensões tipográficas da folha (`MediaBox`) com suporte a inteiros e reais.
  - Detecção de proteção por senha / criptografia.
  - Detecção de texto selecionável vs documento digitalizado/rasterizado.
- [x] **PDF Merge Engine (`merge_pdfs`):**
  - União de múltiplos arquivos PDF na ordem exata definida pelo usuário.
  - Algoritmo de renumeração de identificadores de objetos indiretos (`lopdf`) evitando colisões de nós.
  - Reconstrução da árvore raiz `/Pages` e contagem agregada de páginas.
- [x] **PDF Split Engine (`split_pdf`):**
  - Modo `all`: Extração de cada página individual (`documento_pag_001.pdf`).
  - Modo `ranges`: Parsing robusto de intervalos compostos (ex: `1-3, 5, 8-10`) com validação sintática.
  - Modo `every_n`: Fatiamento em lotes homogêneos de $N$ páginas.
  - Opção para consolidar páginas selecionadas em arquivo único ou múltiplos arquivos.
- [x] **PDF Organize Engine (`organize_pdf`):**
  - Reordenação de páginas com arrastar/mover para esquerda/direita.
  - Rotação individual ou em lote em incrementos de 90°.
  - Exclusão de páginas indesejadas.
  - **Preservação total do original**: Arquivo original nunca é sobrescrito, salvando a nova versão organizada na pasta de exportações.
- [x] **PDF Compress Engine (`compress_pdf`):**
  - Otimização estrutural com poda de dicionários órfãos (`prune_objects`).
  - Recompressão de fluxos de dados com Deflate/FlateDecode seguro.
  - Níveis de compressão: Sem perdas (Estrutural), Recomendada e Extrema.
  - Relatório real de percentual de economia em bytes gravados.
- [x] **Conversão Word para PDF (`convert_word_to_pdf`):**
  - Integração com LibreOffice em modo headless com isolamento de perfil (`-env:UserInstallation`).
  - Detecção inteligente no sistema (arquivos de programas, registro do Windows, PATH).
  - Alerta amigável e comando `winget` com botão de cópia caso não instalado.
- [x] **Conversão PDF para Word (`convert_pdf_to_docx`):**
  - Extração de texto de parágrafos estruturados via `lopdf`.
  - Construção de documento DOCX nativo compatível com Microsoft Word via `docx-rs`.
  - Alerta transparente quando o PDF é puramente imagético/escaneado informando a necessidade de OCR óptico.

### 2.2 Central de Erros e Diagnósticos Persistente
- [x] **Persistência SQLite Relacional:**
  - Tabela `error_logs` com 6 índices de alta performance (`created_at`, `severity`, `module`, `status`, `task_id`, `error_code`).
  - Captura centralizada em todas as tarefas do TaskManager, comandos IPC Tauri e exceções do React.
- [x] **Sanitização de Dados Confidenciais:**
  - Máscara regex para senhas, tokens Bearer, chaves de API, credenciais em URLs e caminhos confidenciais de perfil (`C:\Users\[USER]\...`).
  - Truncamento protetivo em 8.192 caracteres evitando exaustão de memória.
- [x] **Interface Dedicada na Tela Histórico:**
  - Duas abas de navegação: "Atividades Concluídas" e "Erros e Diagnósticos".
  - Cards de métricas KPI: Total de Registros, Falhas Críticas, Não Resolvidos, Uso do Banco Local em KB.
  - Filtros multifatoriais: Busca textual, Período (24h, 7d, 30d, Todos), Módulo, Severidade e Status.
  - Cards expansíveis com detalhes técnicos monospaçados, causa raiz e rastreamento de pilha.
  - Botão de resolução rápida (`unresolved` $\leftrightarrow$ `resolved`).
- [x] **Atalho Direto em Tarefas com Falha (`TaskDrawer`):**
  - Botão "Copiar erro" direto no card da tarefa.
  - Botão "Ver detalhes do erro", que navega para a Central de Diagnósticos com a falha correspondente expandida e iluminada.
- [x] **Cópia Nativa para a Área de Transferência:**
  - Integração direta com a API Win32 do Windows via crate `arboard`.
  - Botões para "Copiar erro" individual e "Copiar filtrados" em formato de relatório texto legível.
- [x] **Gestão e Retenção nas Configurações:**
  - Visor de tamanho do banco em disco.
  - Seletor de política de retenção automática (7, 30, 90 dias ou limpeza total).
  - Exportação de auditoria completa em arquivo JSON.
- [x] **Captura Global de Exceções da Interface:**
  - React `ErrorBoundary` com interface de recuperação amigável e registro automático do erro.
  - Listeners de janela para `unhandledrejection` e `error`.

---

## 3. Checklist Detalhado da Missão 05

### 3.1 Setup Center (Central de Configuração Inicial)
- [x] **Assistente em 4 Etapas:**
  - Etapa 1: Boas-vindas acolhedora apresentando os 6 módulos sem bloqueios desnecessários.
  - Etapa 2: Diagnóstico instantâneo de versão do Windows, arquitetura x64, permissão de escrita, espaço em disco e internet.
  - Etapa 3: Instalação assistida de FFmpeg/ffprobe e yt-dlp com barra de progresso em tempo real e tratamento de erros.
  - Etapa 4: Conclusão informando ferramentas prontas e botão "Começar a usar".
- [x] **Persistência de Estado no SQLite:**
  - Chave `first_run_status` em `preferences` (`completed` ou `dismissed`).
  - Reabertura permitida em Configurações e via Command Palette (`Ctrl+K`).

### 3.2 DependencyManager (Rust Nativo)
- [x] **Descoberta em Cascata:**
  - 1. `%LOCALAPPDATA%\ArceTools\binaries\` (Gerenciado).
  - 2. `./binaries/` (Empacotado).
  - 3. Pacotes e Links WinGet.
  - 4. `PATH` do sistema operacional.
- [x] **Segurança e Proteção:**
  - Exclusivamente conexões HTTPS com validação TLS.
  - Verificação de hash SHA-256.
  - Proteção estrita contra *Zip Slip* com `entry.enclosed_name()`.
  - Limite rígido de bytes para proteção contra *Zip Bomb*.
  - Atualização atômica com backup `.old` e rollback automático.
- [x] **Integração com a Central de Erros:**
  - 9 novos códigos estruturados de erro registrados na tabela `error_logs`.

### 3.3 Interface de Gerenciamento nas Configurações
- [x] Seção dedicada "Ferramentas e Dependências" com badges de status, versões, origens, caminhos seguros e botões de ação contextual (Instalar, Atualizar, Verificar, Remover).
- [x] Suporte a caminho customizado para o LibreOffice (`soffice.exe`).

---

## 4. Checklist Detalhado da Missão 06 (Arce Creative Studio)

### 4.1 Shell e Experiência do Creative Studio
- [x] Seção principal "Creative Studio" adicionada à navegação com ícone de varinha mágica e atalho `Ctrl+6`.
- [x] 8 subseções funcionais:
  - 1. Visão Geral (Hero, Templates Rápidos, Projetos Recentes, Estatísticas).
  - 2. AI Image Studio (Prompt, Estilos Visuais, Aspect Ratio, Resolução, Variações, Galeria).
  - 3. Motion Design Studio (Player 60 FPS Canvas, Controles de Timeline, Renderizador MP4, Exportador Remotion TSX).
  - 4. AI Video Studio (Modo A Generativo + Modo B Composto Local com FFmpeg).
  - 5. Biblioteca de Skills (16 skills embutidas no formato SKILL.md com busca, filtros de categoria e exportador).
  - 6. Meus Projetos (Listagem, Criação, Exclusão, Métricas e Abertura no Explorer).
  - 7. Biblioteca de Assets (Gerenciamento de Imagens, Vídeos e Áudios com Tags).
  - 8. Configurações IA (Status da Chave NVIDIA, Mascaramento, Validação e Lista de Modelos).

### 4.2 Interfaces Generativas (Open Intelligent UI Adaptado)
- [x] `BriefingAssistant`: Modal guiado em 3 etapas com síntese inteligente de objetivos e ativação automática de skills.
- [x] `StyleSelector`: 9 cartões visuais para estilos artísticos calibrados.
- [x] `ProposalComparator`: Comparação lado a lado com seleção de proposta aprovada.
- [x] `StoryboardApprover`: Inspeção cena a cena de scripts visuais com aprovação de keyframes.
- [x] `ParameterAdjuster`: Controles visuais para edição de templates sem necessidade de código.

### 4.3 Arce Motion Engine (AME) & Integração FFmpeg
- [x] Player em tempo real Canvas a 60 FPS com scrubbing, timecode e renderização de textos e formas.
- [x] Compilador de composições em Rust traduzindo cenas e camadas para grafos de filtros do FFmpeg (`lavfi`, `drawtext`, `overlay`, `scale`).
- [x] Exportador de código estruturado Remotion `.tsx` para desenvolvedores externos.

### 4.4 Provedor NVIDIA NIM & Segurança
- [x] `SecureVault`: Criptografia simétrica com entropia do hardware local. Zero texto puro no banco de dados.
- [x] Sanitização automática no `Sanitizer` mascarando chaves com regex `NVIDIA_KEY_REGEX`.
- [x] Separação de endpoints para geração de visão (`ai.api.nvidia.com`) e chat/planejamento (`integrate.api.nvidia.com`).
- [x] Tratamento honesto de quotas e permissões sem simulação fictícia.

### 4.5 Biblioteca de Skills & OpenCode
- [x] 16 skills embutidas categorizadas (Design Gráfico, Motion Design, Vídeo, 3D e Qualidade).
- [x] `OpenCodeManager`: Descoberta em PATH e diretórios de usuário, execução em sandbox invisível (`CREATE_NO_WINDOW`) e cancelamento imediato.
- [x] Fallback orquestrado 100% nativo em Rust quando o OpenCode não estiver instalado.

---

## 5. Checklist Detalhado da Missão 07 (ToolsOnDesk Rebranding & Migração Segura)

### 5.1 Identidade Visual e Metadados do Aplicativo
- [x] Nome atualizado para **ToolsOnDesk** em `Cargo.toml`, `tauri.conf.json`, `package.json`, `index.html` e telas.
- [x] Identificador Tauri atualizado para `com.toolsondesk.desktop`.
- [x] Ícones vetoriais e rasterizados em todas as resoluções (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `Square*Logo.png`).
- [x] Símbolo `t/d` aplicado na TitleBar unificada e cabeçalhos.
- [x] Zero referências a nomes pessoais em novos identificadores técnicos, diretórios ou metadados públicos.

### 5.2 Camada Centralizada de Resolução de Caminhos (`PathManager`)
- [x] Módulo `src-tauri/src/utils/paths.rs` centralizando todos os diretórios persistentes sob `%LOCALAPPDATA%\ToolsOnDesk\`.
- [x] Descoberta automática de dados legados do Arce Tools (`has_legacy_data`, `legacy_database_file`, `legacy_vault_file`).
- [x] Eliminação de qualquer caminho absoluto hardcoded no código fonte do backend e frontend.

### 5.3 Máquina de Estados de Migração Transacional (`MigrationManager`)
- [x] 10 etapas atômicas: `DISCOVERY`, `PREFLIGHT`, `BACKUP`, `COPY`, `DATABASE_MIGRATION`, `PATH_RECONCILIATION`, `CREDENTIAL_MIGRATION`, `VALIDATION`, `COMMIT`, `COMPLETED`.
- [x] Cópia consistente do SQLite via **SQLite Online Backup API** (`rusqlite::backup::Backup`), sem corrupção de WAL.
- [x] Preservação perpétua dos dados legados (nenhum dado da pasta antiga é deletado).
- [x] Reconciliação automática de caminhos nas tabelas `tasks`, `creative_assets` e `creative_projects`.
- [x] Geração de manifesto de auditoria (`manifest.json`) com contagem de registros e status.

### 5.4 Cofre de Credenciais com Windows DPAPI
- [x] Cifragem nativa do Windows via `CryptProtectData` e `CryptUnprotectData` (`crypt32.dll`).
- [x] Entropia suplementar de proteção (`TOOLSONDESK_DPAPI_ENTROPY_v1`).
- [x] Migração transparente e decifração em memória do cofre legado da M06.
- [x] Rotina `zeroize_bytes` sobrescrevendo buffers voláteis após o uso.
- [x] Sanitização estrita em logs via regex mascarando chaves com `[PROTECTED_NVIDIA_KEY]`.

### 5.5 Interface do Usuário e Experiência de Onboarding
- [x] Componente `MigrationModal.tsx` integrado no fluxo de montagem do React (`App.tsx`).
- [x] Progresso visual em tempo real com lista de etapas, indicador animado e métricas resumidas pós-migração.
- [x] Botão de detalhes técnicos expansíveis para transparência total com o usuário.

### 5.6 Testes Automatizados
- [x] Backend Rust: 29 testes nativos MSVC aprovados (100% de sucesso).
- [x] Frontend React: 34 testes Vitest em 9 suítes aprovados (100% de sucesso).
- [x] Compilação estrita: `pnpm build` limpo em 319 ms.

---

## 6. Checklist Detalhado da Missão 08 — Portabilidade Multiplataforma

### 6.1 Camada de Plataforma (`src-tauri/src/platform/`)
- [x] **`paths.rs` (`PathManager`)**:
  - Windows: `%LOCALAPPDATA%\ToolsOnDesk\` com guarda exclusiva para migração M07.
  - Linux: Padrão XDG Base Directory (`$XDG_DATA_HOME`, `$XDG_CONFIG_HOME`, `$XDG_CACHE_HOME`).
  - macOS: Convenção Apple (`~/Library/Application Support/ToolsOnDesk/`, `~/Library/Caches/ToolsOnDesk/`).
- [x] **`credentials.rs` (`CredentialStore`)**:
  - Windows: Windows DPAPI (`crypt32.dll`) com entropia e `zeroize_bytes`.
  - macOS: Apple Keychain Services nativo (`/usr/bin/security`).
  - Linux: FreeDesktop Secret Service via DBus / `secret-tool` com fallback baseado em entropia de hardware.
  - Mascaramento e sanitização contra vazamento em memória e logs.
- [x] **`processes.rs` (`ProcessManager`)**:
  - Windows: `CREATE_NO_WINDOW = 0x08000000` e cancelamento de árvore via `taskkill /F /T /PID`.
  - Unix (Linux & macOS): Grupos de processos (`process_group(0)`), `SIGTERM` inicial, polling gracioso de 300 ms, `SIGKILL` timeout e ceifa com `child.wait().await` para eliminar zumbis.
- [x] **`system.rs` (`PlatformSystem`)**:
  - Diagnóstico transparente de backend de webview (`WebView2`, `WebKitGTK 4.1`, `WKWebView`).
  - Consulta de espaço livre real no disco via Win32 `GetDiskFreeSpaceExW` e POSIX `libc::statvfs`.
- [x] **`linux.rs` & `macos.rs`**:
  - Descoberta de binários e candidatos LibreOffice em locais do sistema (`/usr/bin`, `/opt/homebrew/bin`, `/Applications/LibreOffice.app`).
  - Detecção de sessões Wayland e X11 no Linux.

### 6.2 Frontend Adaptável (`src/services/platform.ts`)
- [x] Detecção síncrona de sistema operacional em tempo de execução.
- [x] `TitleBar`: Traffic Lights nativos (fechar, minimizar, maximizar) à esquerda no macOS e botões à direita no Windows/Linux.
- [x] `Sidebar`: Modificadores dinâmicos nos atalhos (`⌘` no macOS, `Ctrl` no Windows/Linux).
- [x] Handlers globais de teclado respondem tanto a `ctrlKey` quanto a `metaKey`.

### 6.3 Infraestrutura de CI/CD Multiplataforma (GitHub Actions)
- [x] `.github/workflows/desktop-ci.yml`: Matriz para `windows-latest`, `ubuntu-22.04`, `macos-latest` (Apple Silicon arm64) e `macos-13` (Intel x86_64).
- [x] `.github/workflows/desktop-build.yml`: Empacotamento de NSIS `.exe`, `.deb`, `.AppImage`, `.dmg`, cálculo de SHA-256 e agregação de `build-manifest.json`.

### 6.4 Validação Técnica de Testes (M08)
- [x] Frontend React: 34 testes Vitest em 9 suítes aprovados (100% de sucesso).
- [x] Backend Rust: 31 testes unitários nativos aprovados (100% de sucesso).
- [x] Total: 65 testes automatizados aprovados sem regressões.

### 6.5 Preparação Arquitetural para Android
- [x] Contratos e interfaces desacoplados no Rust core para reutilização em Tauri Mobile (`docs/ANDROID-ROADMAP.md`).
- [x] Mapeamento das restrições de permissão (Scoped Storage / SAF) e subprocessos (Mobile FFmpeg `.so`).

