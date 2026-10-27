# Instruções para Agentes de IA e Desenvolvedores — ARCE TOOLS

Este documento define regras obrigatórias de arquitetura, padrões de código, estilo visual e procedimentos para qualquer IA ou desenvolvedor que for manter ou expandir o **Arce Tools**.

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
2. **Desacoplamento e I/O Não-Bloqueante**:
   - O thread de comandos do Tauri (`tauri::command`) nunca deve realizar operações de processamento intensivo de imagem, cálculo de grade de pôsteres ou gravação massiva de arquivos de forma síncrona.
   - Enfileire todo processamento pesado através do `TaskManager` (`tokio::sync::mpsc`).
   - Respeite tokens de cancelamento (`tokio_util::sync::CancellationToken`) em loops de processamento.
3. **Persistência SQLite**:
   - Utilize transações para operações em lote.
   - Sempre utilize o modo WAL (`PRAGMA journal_mode=WAL`).
   - Trate encerramentos abruptos: qualquer tarefa pendente/em execução ao iniciar o app deve ser recuperada consistentemente.
4. **Chamadas Externas Estruturadas**:
   - Ao executar executáveis externos ou sidecars (ex.: FFmpeg, yt-dlp nas próximas fases), sempre utilize chamadas estruturadas (`std::process::Command::new` com vetor de argumentos `.args(&[...])`). **NUNCA concatene comandos em strings para execução em shell (`cmd.exe /c ...` ou `sh -c ...`)**.
5. **Prevenção de Colisão de Arquivos**:
   - Nunca sobrescreva arquivos existentes do usuário silenciosamente. Use a função `resolve_unique_filename` para gerar variantes numeradas (`arquivo (1).png`).

### 2.2 Frontend React (`src/`)
1. **TypeScript Estrito**:
   - `strict: true` ativado no `tsconfig.json`.
   - Todas as chamadas Tauri devem ter interfaces de solicitação e resposta tipadas em `src/types/`.
2. **Gerenciamento de Memória e Desempenho**:
   - **NÃO armazene buffers binários ou imagens em Base64 grandes no estado React**. O backend deve processar diretamente os caminhos de arquivos (`filepath`).
   - Apenas metadados, dimensões e caminhos de arquivo devem trafegar pelo IPC.
   - Para pré-visualizações, utilize paths locais convertidos pelo Tauri ou representações vetoriais leves.
3. **Sem Mocks Fictícios de Sucesso**:
   - A interface nunca deve simular operações fictícias ou fingir que um download ou conversão ocorreu sem o motor real ter processado. Telas de ferramentas em preparação devem exibir banners explicativos honestos sobre o roadmap.

---

## 3. Ambiente e Procedimentos de Build

- **Ambiente Primário**: Windows 11 x64 nativo com toolchain MSVC (`x86_64-pc-windows-msvc`).
- **Dev Tools no Windows**:
  - Node.js e pnpm instalados.
  - Rust stable MSVC instalado via `rustup`.
  - Microsoft C++ Build Tools (Visual Studio 2022).
  - Windows 11 SDK.
  - WebView2 Runtime.
- **Compilação a partir de WSL2 / Ambiente Compartilhado**:
  - Para compilar no Windows host a partir do repositório compartilhado, redirecione o target dir para um disco local NTFS para evitar locks de arquivo de rede:
    ```powershell
    $env:CARGO_TARGET_DIR = "C:\Users\marce\AppData\Local\Temp\arce-target"
    $env:CARGO_INCREMENTAL = "0"
    cargo test
    cargo build --release
    ```
- **Testes Automatizados**:
  - Antes de submeter alterações, sempre execute:
    - Frontend: `pnpm test`
    - Backend: `cargo test`

---

## 4. Diretrizes Éticas e Legais

- O Arce Tools é um utilitário offline e respeitoso.
- Não implemente nenhum método para quebra de DRM ou download clandestino de fontes restritas.
- Mantenha conformidade com licenças de código aberto: crates Rust MIT/Apache-2.0 e FFmpeg sob LGPL v2.1+.
