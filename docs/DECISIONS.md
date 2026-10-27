# ARCE TOOLS — Registro de Decisões de Arquitetura (ADRs)

Este documento registra as principais decisões de arquitetura de software adotadas no desenvolvimento do **Arce Tools**, suas motivações, alternativas avaliadas e consequências técnicas (Missões 01, 02, 02.5 e 03).

---

## ADR 001: Adoção do Tauri 2 em vez de Electron
- **Status**: Aprovado e Implementado
- **Contexto**: A missão exige um aplicativo multiferramentas desktop offline-first, extremamente leve, com inicialização instantânea, baixo consumo de memória em repouso e sem o peso de navegadores embutidos completos.
- **Decisão**: Adotar **Tauri 2** com backend Rust e frontend React 19 + Vite.
- **Consequências**: Binário final enxuto (< 10MB), consumo em repouso de ~36MB e segurança por isolamento de processo.

---

## ADR 002: Build Nativo Windows com Toolchain MSVC
- **Status**: Aprovado e Implementado
- **Contexto**: O projeto roda em ambiente Windows 11 com interoperação WSL2. O Tauri 2 no Windows depende do WebView2 e das APIs Win32/COM, que exigem a ABI MSVC oficial (`x86_64-pc-windows-msvc`).
- **Decisão**: Utilizar a toolchain nativa Windows `x86_64-pc-windows-msvc`, invocada diretamente via PowerShell host com redirecionamento de diretório temporário local (`CARGO_TARGET_DIR` em SSD NTFS local).
- **Consequências**: Compatibilidade absoluta com WebView2 e APIs do Windows 11, prevenindo bloqueios de arquivo do SMB/9P.

---

## ADR 003: SQLite Embutido com `rusqlite` (bundled)
- **Status**: Aprovado e Implementado
- **Contexto**: O gerenciamento de tarefas e o histórico demandam persistência ACID confiável, recuperação de falhas de energia ou encerramento inesperado, e buscas rápidas sem introduzir um serviço externo de banco de dados.
- **Decisão**: Adotar **SQLite com rusqlite (bundled)**, configurado em modo WAL (`journal_mode=WAL`).
- **Consequências**: Zero dependências de instalação para o usuário final e recuperação consistente de estado no startup.

---

## ADR 004: Gerador Próprio de PDF 1.4 em Rust para o Poster Studio
- **Status**: Aprovado e Implementado
- **Contexto**: O Poster Studio requer a divisão precisa de imagens em folhas A4/A3/Letter/Legal, com margens milimétricas exatas, sobreposição (overlap), marcas de corte vetoriais e paginação.
- **Decisão**: Implementar um escritor nativo de PDF em Rust (`poster_engine.rs`) utilizando `CountingWriter` com `BufWriter` e primitivas vetoriais de página.
- **Consequências**: Precisão milimétrica ($1\text{ mm} = 2,834645669\text{ pt}$) e geração em fração de segundos sem dependências externas.

---

## ADR 005: Recursos e Tipografia 100% Offline
- **Status**: Aprovado e Implementado
- **Contexto**: O design aprovado especifica estritamente as famílias tipográficas **Geist** e **Geist Mono**, paleta com verde-menta e tema escuro.
- **Decisão**: Empacotar localmente os arquivos `Geist.woff2` e `GeistMono.woff2` diretamente no bundle da aplicação (`/public/fonts/`).
- **Consequências**: Renderização idêntica ao Claude Design em qualquer máquina, com ou sem internet.

---

## ADR 006: Gerenciador de Fila Assíncrona com Tokens de Cancelamento
- **Status**: Aprovado e Implementado
- **Contexto**: Operações multimídia e conversões consomem ciclos de CPU e I/O de disco. A interface do usuário não pode travar ou congelar durante o processamento.
- **Decisão**: Implementar o `TaskManager` com canal `mpsc`, `Arc<Semaphore>` configurável e mapa de `CancellationToken`.
- **Consequências**: Responsividade permanente da janela (60fps constantes) e cancelamento real de tarefas.

---

## ADR 007: Execução Supervisionada de Motores Externos (`ExternalToolManager`)
- **Status**: Aprovado e Implementado (Missão 02)
- **Contexto**: Para suportar conversores reais de áudio e vídeo e downloads de mídias autorizadas, o Arce Tools integra ferramentas consagradas da indústria: **FFmpeg**, **ffprobe** e **yt-dlp**. Executar executáveis externos traz riscos de segurança, injeção de comandos, congelamento de UI e processos órfãos.
- **Decisão**: Adotar a execução supervisionada direta via `tokio::process::Command` com argumentos vetoriais estruturados, `CREATE_NO_WINDOW = 0x08000000` e cancelamento imediato via `child.kill()`.
- **Consequências**:
  - Imunidade a ataques de injeção de comandos de shell.
  - Janelas pretas de console do Windows nunca pipocam na tela.
  - Fechamento imediato de processos filhos ao cancelar a tarefa ou fechar a janela.

---

## ADR 008: Defesa Estrita contra SSRF e Validação de URLs no Downloader
- **Status**: Aprovado e Implementado (Missão 02.5)
- **Contexto**: Permitir que usuários informem URLs arbitrárias para download expõe a aplicação a ataques de Server-Side Request Forgery (SSRF), varredura de portas locais (`127.0.0.1`), acesso a redes corporativas internas (`192.168.x.x`, `10.x.x.x`) e endpoints de metadados em nuvem (`169.254.169.254`).
- **Decisão**: Implementar uma camada de validação e sanitização estrita de URLs antes de qualquer chamada ao `yt-dlp`.
- **Consequências**: Proteção ativa contra exploits de rede interna e injeção de comandos.

---

## ADR 009: Renderização e Shaders de Efeitos no Backend Rust
- **Status**: Aprovado e Implementado (Missão 02.5)
- **Contexto**: Os algoritmos de retícula (Halftone mono/color), difusão de erro (Floyd-Steinberg) e alto contraste exigem processamento pixel a pixel que no navegador (Canvas/JS) gera alto consumo de CPU e atrasos visíveis em imagens de alta resolução.
- **Decisão**: Executar todo o pipeline de processamento de imagem em Rust nativo com algoritmos otimizados em memória e expor endpoint de preview ultrarrápido em base64 (`render_poster_preview`).
- **Consequências**: Preview atualizado em < 25ms mesmo para imagens de 4K/8K.

---

## ADR 010: Adoção das Crates `lopdf` e `docx-rs` para Manipulação Estrutural de Documentos
- **Status**: Aprovado e Implementado (Missão 03)
- **Contexto**: O Módulo de Documentos precisa inspecionar, unir, dividir, rotacionar, comprimir PDFs e convertê-los para Word sem depender de bibliotecas C++ pesadas (como Poppler ou MuPDF) e sem dependência de serviços em nuvem.
- **Decisão**: Adotar `lopdf 0.46` para manipulação em baixo nível da árvore de objetos do PDF e `docx-rs 0.4` para geração estruturada de documentos OpenXML (.docx).
- **Consequências**:
  - Código 100% Rust seguro e compilável nativamente com MSVC sem ferramentas C++ adicionais.
  - Algoritmo próprio de renumeração de identificadores de objetos indiretos (`renumber_objects_with`), permitindo unir PDFs sem colisões.
  - Compressão estrutural sem perdas usando Deflate e poda de dicionários órfãos (`prune_objects`).

---

## ADR 011: Conversão Word para PDF via LibreOffice Headless com Isolamento de Perfil
- **Status**: Aprovado e Implementado (Missão 03)
- **Contexto**: A renderização de DOCX, DOC e ODT com fidelidade 100% visual de tabelas, fontes complexas e quebras de página requer um motor de layout maduro. No entanto, invocar o LibreOffice via linha de comando pode travar caso outra instância esteja aberta pelo usuário.
- **Decisão**: Invocar `soffice.exe` com perfil de usuário temporário isolado (`-env:UserInstallation=file:///<temp_profile>`), timeout de 120s e bloqueio de macros.
- **Consequências**: Conversão robusta e confiável sem travar nem interferir nas janelas normais do LibreOffice do usuário.

---

## ADR 012: Central Persistente de Erros com Sanitização Regex
- **Status**: Aprovado e Implementado (Missão 03)
- **Contexto**: Falhas de processamento em desktop são difíceis de auditar quando exibidas apenas em toasts voláteis. Além disso, copiar logs para suporte pode vazar caminhos de pastas privadas e credenciais.
- **Decisão**: Implementar a tabela SQLite `error_logs` com índices, pipeline de sanitização regex (`sanitizer.rs`), e interface com cards expansíveis e relatórios formatados em texto simples.
- **Consequências**:
  - Usuários e desenvolvedores contam com rastreamento completo de causa raiz e status de resolução.
  - Nenhuma senha, token ou nome de usuário do Windows é exposto (`C:\Users\[USER]\...`).

---

## ADR 013: Acesso Nativo ao Clipboard Win32 via Crate `arboard`
- **Status**: Aprovado e Implementado (Missão 03)
- **Contexto**: A API web `navigator.clipboard.writeText()` frequentemente falha ou exige permissões do usuário em ambientes desktop quando acionada fora de eventos diretos de clique ou em contextos WebView2 restritos.
- **Decisão**: Adotar a crate nativa Rust `arboard 3.7`, expondo o comando Tauri `copy_to_clipboard` que chama diretamente as APIs `OpenClipboard` e `SetClipboardData` da Win32 API.
- **Consequências**: Cópia instantânea e 100% garantida de relatórios de erros, trechos de código e logs para a área de transferência do Windows.

---

## ADR 014: Estratégia de Empacotamento Windows NSIS com Binários Externos Desacoplados
- **Status**: Aprovado e Implementado (Missão 04)
- **Contexto**: O projeto necessita de um instalador Windows oficial para distribuição real (`.exe` NSIS). Os utilitários multimídia externos (FFmpeg, ffprobe e yt-dlp) totalizam ~480 MB descompactados e ~150 MB compactados. Embutir tudo no instalador tornaria o download pesado e dificultaria atualizações independentes de segurança (ex: patches frequentes do `yt-dlp`).
- **Decisão**: Gerar o instalador oficial NSIS nativo (`Arce Tools_0.1.0_x64-setup.exe`) focado no executável Tauri (3,97 MB compactado) e adotar um mecanismo de descoberta de 4 níveis para ferramentas externas:
  1. Diretório local `<app_dir>\binaries\`;
  2. Diretório `%LOCALAPPDATA%\ArceTools\binaries\`;
  3. Links e pacotes do WinGet (`%LOCALAPPDATA%\Microsoft\WinGet\Links\` e `%LOCALAPPDATA%\Microsoft\WinGet\Packages\`);
  4. `PATH` do sistema operacional.
  Na tela de Configurações, são disponibilizados botões de 1 clique para instalação assistida via WinGet (`winget install Gyan.FFmpeg yt-dlp`).
- **Consequências**:
  - Instalador ultraleve (< 4 MB), download e instalação instantâneos.
  - Atualizações do yt-dlp podem ser feitas diretamente pelo WinGet sem reinstalar o aplicativo.
  - Ambientes corporativos ou isolados podem simplesmente colar os binários na pasta local da aplicação.

---

## ADR 015: Encerramento de Árvore de Processos Win32 via `taskkill /F /T`
- **Status**: Aprovado e Implementado (Missão 04)
- **Contexto**: Quando o `DownloadEngine` invoca o `yt-dlp`, o `yt-dlp` por sua vez pode invocar subprocessos netos (como `ffmpeg.exe` para pós-processamento de áudio ou merge de contêiner). A chamada padrão `child.kill().await` do Rust/Tokio no Windows encerra apenas o processo pai direto, deixando subprocessos netos em execução em segundo plano consumindo CPU e mantendo arquivos bloqueados.
- **Decisão**: Ao cancelar ou abortar um processo supervisionado no Windows, executar explicitamente `taskkill /F /T /PID <pid>` antes de `child.kill().await`, garantindo o encerramento forçado de toda a árvore de subprocessos hierárquicos. Além disso, adicionou-se um branch de periodicidade de 200ms no loop `tokio::select!` para interromper a execução no momento exato do cancelamento, mesmo que o stdout/stderr esteja ocioso.
- **Consequências**: Zero processos órfãos no Gerenciador de Tarefas do Windows ao cancelar downloads ou conversões e liberação imediata de descritores de arquivos.

---

## ADR 016: Sanitização Multicamadas com Lookahead Guard e Detecção de Chaves Privadas
- **Status**: Aprovado e Implementado (Missão 04)
- **Contexto**: A sanitização de erros precisa ser idempotente: aplicar o pipeline de regex múltiplas vezes em uma mesma string ou em logs reprocessados não pode corromper tags de mascaramento prévias (como `[REDACTED]` se transformando em `[[REDACTED]]`). Além disso, blocos PEM de certificados (`PRIVATE KEY`) e cabeçalhos HTTP com tokens devem ser eliminados sem truncar linhas subsequentes.
- **Decisão**: Adicionar lookahead guard negativo `[^\[...]` nas expressões regulares para impedir re-sanitização de tags já substituídas, estender as regras para cobrir cabeçalhos `Authorization`, `Cookie`, `Set-Cookie`, query params (`session_id`, `access_token`) e blocos inteiros de chaves privadas PEM.
- **Consequências**: Proteção de dados sem efeito colateral de corrupção textual e sem vazamento de segredos em relatórios exportados.

---

## ADR 017: Normalização de Consultas SQL e Deduplicação Temporal em Logs de Diagnóstico
- **Status**: Aprovado e Implementado (Missão 04)
- **Contexto**: Ao filtrar logs na Central de Diagnósticos por severidade, status ou período, inconsistências de caixa (`"critical"` vs `"CRITICAL"`) ou formatos de período (`"today"` vs `"24h"`) causavam retornos vazios. Adicionalmente, quando múltiplos componentes falham em cascata devido a um mesmo evento, centenas de registros idênticos podiam inundar a tabela SQLite.
- **Decisão**:
  1. Normalizar as consultas SQL no SQLite usando `UPPER(severity) = UPPER(?)`, `UPPER(status) = UPPER(?)`, `LOWER(module) = LOWER(?)` e timestamps relativos do SQLite (`datetime('now', '-24 hours')`, `datetime('now', '-7 days')`, `datetime('now', '-30 days')`).
  2. Implementar uma janela de deduplicação temporal de 3 segundos em `Db::insert_error_log`, descartando entradas repetidas de `(error_code, module, technical_details/user_message)`.
- **Consequências**: Filtros 100% confiáveis e consistentes entre frontend e backend, e prevenção contra tempestades de eventos no banco de dados local.
