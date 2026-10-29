# ToolsOnDesk (ex-Arce Tools) — Registro de Decisões de Arquitetura (ADRs)

Este documento registra as principais decisões de arquitetura de software adotadas no desenvolvimento do **ToolsOnDesk** (Missões 01 a 07), suas motivações, alternativas avaliadas e consequências técnicas.

> [!NOTE]
> **Histórico:** As ADRs 001 a 023 foram formuladas durante as Missões 01 a 06 sob o nome **Arce Tools**. As ADRs 024 a 026 formalizam o rebranding, a camada de caminhos e a migração transacional introduzidas na **Missão 07** sob a nova identidade de trabalho **ToolsOnDesk**.

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

---

## ADR 018: Assistente de Inicialização (Setup Center) e Desacoplamento Modular
- **Status**: Aprovado e Implementado (Missão 05)
- **Contexto**: Usuários finais não-técnicos não devem precisar abrir PowerShell, executar comandos `winget` ou configurar variáveis de ambiente. Ao mesmo tempo, ferramentas que não necessitam de executáveis externos (como Poster Studio, Inspector de PDF, compressão e Lanczos3) não devem ser bloqueadas quando o usuário não tiver internet ou optar por configurar depois.
- **Decisão**: Implementar o `SetupCenterModal` com 4 etapas (Boas-vindas $\rightarrow$ Verificação do Sistema $\rightarrow$ Configuração de Ferramentas $\rightarrow$ Tudo Pronto), persistindo o estado na tabela `preferences` do SQLite local e permitindo dispensar ("Configurar depois") ou reabrir pelas Configurações e Command Palette (`Ctrl+K`).
- **Consequências**:
  - Experiência acolhedora e acessível a qualquer perfil de usuário.
  - Zero bloqueio arbitrário de módulos nativos.
  - Estado preservado de forma confiável no banco de dados local.

---

## ADR 019: Instalação Isolada por Usuário em `%LOCALAPPDATA%`
- **Status**: Aprovado e Implementado (Missão 05)
- **Contexto**: Instalar executáveis em `C:\Program Files` requer elevação de privilégios de administrador (telas UAC do Windows), o que pode ser bloqueado em máquinas corporativas ou assustar usuários leigos. Além disso, modificar o `PATH` global pode conflitar com outras versões de ferramentas instaladas no sistema.
- **Decisão**: Direcionar toda a instalação e gerenciamento de binários externos para a pasta do usuário em `%LOCALAPPDATA%\ArceTools\binaries\`.
- **Consequências**:
  - Instalação e atualização 100% funcionais sem solicitar permissões de administrador.
  - Sem poluição do `PATH` do sistema operacional.
  - Desinstalação e remoção limpas e isoladas.

---

## ADR 020: Prevenção contra Ataques de Travessia em ZIP (*Zip Slip*) e Substituição Atômica
- **Status**: Aprovado e Implementado (Missão 05)
- **Contexto**: O download e extração automatizados de pacotes compactados externos (`ffmpeg.zip`) criam risco de ataques do tipo *Zip Slip* (entradas contendo `../../` visando sobrescrever arquivos do sistema operacional). Além disso, atualizar o executável `yt-dlp.exe` em execução direta pode corromper o arquivo se o processo for interrompido no meio.
- **Decisão**:
  1. Utilizar a API `entry.enclosed_name()` da crate `zip` para validar cada entrada do arquivo compactado, abortando a extração caso haja qualquer escape do diretório base.
  2. Implementar fluxo atômico de atualização para executáveis simples com arquivo temporário (`.tmp`), teste funcional de `--version` em staging e renomeação com backup (`.old`) para permitir rollback automático em caso de falha.
- **Consequências**:
  - Proteção criptográfica e estrutural completa contra ataques de travessia de caminho.
  - Atualizações seguras sem risco de corrupção ou perda do motor anterior funcional.

---

## ADR 021: Arce Motion Engine (AME) com Player Canvas 60 FPS e Exportador Remotion
- **Status**: Aprovado e Implementado (Missão 06)
- **Contexto**: O Remotion é uma excelente ferramenta para motion design em código React. No entanto, sua licença exige pagamentos de licença corporativa para certas faixas de faturamento/equipe, e sua cadeia de renderização baseada em Chromium headless (Puppeteer) aumentaria o instalador em mais de 350 MB e exigiria Node.js na máquina do cliente.
- **Decisão**: Criar o **Arce Motion Engine (AME)**:
  1. Player em tempo real no frontend utilizando HTML5 Canvas a 60 FPS com scrubbing de áudio e interpolações com física de amortecimento (*spring physics*).
  2. Compilador nativo no backend Rust que traduz as cenas e camadas em grafos de filtros do FFmpeg, renderizando MP4 diretamente sem dependências externas adicionais.
  3. Exportador opcional de código-fonte TSX estruturado para Remotion, permitindo que desenvolvedores exportem projetos para suas próprias pipelines.
- **Consequências**:
  - Distribuição 100% livre de restrições de licenciamento.
  - Aplicativo mantém seu tamanho superleve (< 15 MB) sem precisar embutir Chromium ou Node.js.
  - Renderização de vídeo ultrarrápida aproveitando a aceleração nativa do FFmpeg já instalado.

---

## ADR 022: Provedor NVIDIA NIM com Vault Criptográfico e Sanitização de Credenciais
- **Status**: Aprovado e Implementado (Missão 06)
- **Contexto**: A integração com a nuvem NVIDIA NIM para geração de imagens (FLUX.1, SD 3.5), vídeos (Cosmos) e planejamento de briefings exige gerenciar chaves de API com segurança estrita. Salvar a chave em texto puro no SQLite ou exibi-la em logs viola as diretrizes de segurança da aplicação.
- **Decisão**:
  1. Criar `SecureVault` com criptografia simétrica utilizando entropia gerada a partir do identificador de máquina do host.
  2. Isolar os endpoints da API NVIDIA NIM: `ai.api.nvidia.com` para inferência de visão (JSON com retorno Base64) e `integrate.api.nvidia.com` para chat/planejamento criativo.
  3. Adicionar regex de detecção de chave NVIDIA (`nvapi-...`) no pipeline do `Sanitizer`, substituindo por `[PROTECTED_NVIDIA_KEY]` em logs de erro e diagnósticos.
- **Consequências**:
  - Chaves de API nunca são expostas em texto puro no SQLite nem registradas em arquivos de log.
  - Conformidade estrita com o princípio de menor privilégio e segurança em repouso.

---

## ADR 023: Biblioteca de 16 Skills Nativas com Formato SKILL.md e Sandbox OpenCode
- **Status**: Aprovado e Implementado (Missão 06)
- **Contexto**: Para que usuários sem conhecimentos técnicos produzam artes e vídeos de qualidade profissional, a inteligência artificial precisa de diretrizes estilísticas estruturadas (direção de arte, tipografia cinética, iluminação de produto, copywriting). Além disso, deve ser possível executar agentes via OpenCode caso o usuário possua a ferramenta instalada.
- **Decisão**:
  1. Definir 16 skills nativas embutidas diretamente no binário Rust, no formato padronizado `SKILL.md` compatível com a comunidade OpenCode/Agentic.
  2. Implementar `OpenCodeManager` que supervisiona processos do OpenCode em workspace isolado, com `CREATE_NO_WINDOW` e cancelamento cooperativo.
  3. Fornecer um orquestrador fallback nativo em Rust que opera transparentemente caso o OpenCode não esteja instalado.
- **Consequências**:
  - O estúdio criativo funciona imediatamente "out-of-the-box" sem obrigar instalação de ferramentas de terceiros.
  - Total transparência das diretrizes de design aplicadas a cada geração.

---

## ADR 024: Rebranding para ToolsOnDesk e Nova Identidade `com.toolsondesk.desktop`
- **Status**: Aprovado e Implementado (Missão 07)
- **Contexto**: A identidade original continha nomes pessoais em identificadores técnicos e diretórios (`com.mateusarcedev.arce-tools`). Para preparar a base de código para distribuição profissional, adotou-se o nome de trabalho corporativo **ToolsOnDesk**.
- **Decisão**: Rebranding técnico de `productName` para `ToolsOnDesk`, executável para `toolsondesk.exe`, identificador Tauri para `com.toolsondesk.desktop`, instalador NSIS para `ToolsOnDesk_0.1.0_x64-setup.exe` e novo monograma `t/d`.
- **Consequências**: Eliminação de nomes pessoais em identificadores técnicos e metadados públicos, mantendo o histórico de crédito preservado.

---

## ADR 025: Camada Centralizada de Resolução de Caminhos (`PathManager`) e Preservação Perpétua
- **Status**: Aprovado e Implementado (Missão 07)
- **Contexto**: A mudança de identificador altera o diretório padrão retornado pelo Tauri de `%LOCALAPPDATA%\com.mateusarcedev.arce-tools` para `%LOCALAPPDATA%\com.toolsondesk.desktop`. Se não tratada com cuidado, essa mudança faria o usuário perder todas as tarefas, projetos, banco SQLite e dependências gerenciadas.
- **Decisão**:
  1. Criar o `PathManager` em Rust centralizando todos os diretórios persistentes sob `%LOCALAPPDATA%\ToolsOnDesk\`.
  2. Implementar descoberta automática de dados legados do Arce Tools (`has_legacy_data`).
  3. Adotar o princípio de **preservação perpétua**: nunca deletar a pasta ou banco legado no disco, realizando migração por cópia transacional.
- **Consequências**: Zero risco de perda de dados; se o usuário precisar auditar ou reverter, os dados originais permanecem 100% preservados.

---

## ADR 026: Migração para Windows DPAPI (`crypt32.dll`) e SQLite Online Backup API
- **Status**: Aprovado e Implementado (Missão 07)
- **Contexto**: O cofre da M06 utilizava derivação XOR com entropia simples. Para garantir segurança de nível empresarial, as chaves devem ser protegidas por hardware/LSA do Windows. Além disso, a cópia do SQLite durante o uso com arquivos WAL ativos poderia gerar corrupção se feita por cópia de arquivo pura (`fs::copy`).
- **Decisão**:
  1. Utilizar a **Windows DPAPI** nativa (`CryptProtectData`/`CryptUnprotectData` via `crypt32.dll`) combinada com entropia estendida e zeroize de memória.
  2. Utilizar a **SQLite Online Backup API** (`rusqlite::backup::Backup`) para criar snapshots atômicos e consistentes mesmo com o banco legado aberto em modo WAL.
- **Consequências**: Segurança criptográfica nativa sem introduzir dependências pesadas externas e garantia de integridade estrutural no banco de dados.

---

## ADR 027: Camada de Abstração Multiplataforma (`PlatformServices`)
- **Status**: Aprovado e Implementado (Missão 08)
- **Contexto**: O aplicativo dependia de APIs Win32 e caminhos restritos ao Windows. Para suportar Windows, Linux e macOS sem duplicar código ou espalhar condicionais `#[cfg(...)]` por dezenas de arquivos, era necessária uma camada unificada de abstração de plataforma.
- **Decisão**:
  1. Criar o módulo `crate::platform` em Rust com subcomponentes especializados: `paths`, `credentials`, `processes`, `system`, `windows`, `linux`, `macos`.
  2. Implementar `PathManager` compatível com Windows `%LOCALAPPDATA%`, Linux XDG Base Directory e macOS Application Support/Caches.
  3. Desacoplar diagnósticos de hardware e motores web (`WebView2`, `WebKitGTK 4.1`, `WKWebView`).
- **Consequências**:
  - Código limpo, testável e desacoplado.
  - Comandos IPC e serviços front-end consomem uma interface única independente do sistema operacional.

---

## ADR 028: Cofre de Credenciais Multiplataforma (`CredentialStore`)
- **Status**: Aprovado e Implementado (Missão 08)
- **Contexto**: A proteção de credenciais (chave NVIDIA NIM API) necessita de segurança equivalente à Windows DPAPI nos sistemas Linux e macOS, sem armazenamento em texto puro.
- **Decisão**:
  1. Preservar o Windows DPAPI (`crypt32.dll`) no Windows com entropia do usuário.
  2. Implementar integração com Apple Keychain Services (`/usr/bin/security`) no macOS.
  3. Implementar integração com FreeDesktop Secret Service via DBus/`secret-tool` no Linux, com fallback criptografado derivado do hardware `/etc/machine-id`.
  4. Aplicar sobrescrita forçada em memória volátil (`zeroize_bytes`) em todos os backends.
- **Consequências**: Chaves de API mantidas sob proteção nativa do sistema operacional em todas as plataformas com proteção contra vazamento em memória e logs.

---

## ADR 029: Isolamento de Grupos de Processos POSIX e Cancelamento com Ceifa
- **Status**: Aprovado e Implementado (Missão 08)
- **Contexto**: Subprocessos multimídia (FFmpeg, yt-dlp) geram processos filhos e netos. O cancelamento inadequado deixa processos zumbis ou encoders órfãos consumindo CPU no Linux e macOS.
- **Decisão**:
  1. Preservar `CREATE_NO_WINDOW` e `taskkill /F /T /PID` no Windows.
  2. Configurar `process_group(0)` no Unix para isolar subprocessos em novos grupos de processos (PGID).
  3. No cancelamento, disparar `SIGTERM` para o grupo `-pgid`, aguardar até 300 ms em polling, recorrer a `SIGKILL` se necessário e obrigatoriamente chamar `child.wait().await` para ceifar o processo filho.
- **Consequências**: Cancelamento imediato e limpo sem processos órfãos ou zumbis em nenhuma plataforma.

---

## ADR 030: Esteira de CI/CD e Empacotamento Multiplataforma no GitHub Actions
- **Status**: Aprovado e Implementado (Missão 08)
- **Contexto**: Necessidade de validar compilação, executar suítes de testes e produzir pacotes nativos para Windows, Linux e macOS sem exigir hardware físico variado no ambiente local do desenvolvedor.
- **Decisão**:
  1. Criar `.github/workflows/desktop-ci.yml` com matriz para `windows-latest`, `ubuntu-22.04`, `macos-latest` (Apple Silicon) e `macos-13` (Intel), rodando `pnpm test` e `cargo test`.
  2. Criar `.github/workflows/desktop-build.yml` para empacotar NSIS `.exe`, `.deb`, `.AppImage` e `.dmg`, gerando checksums SHA-256 e o manifesto `build-manifest.json`.
  3. Manter o princípio de nunca publicar releases públicas não autorizadas automaticamente.
- **Consequências**: Garantia contínua de compatibilidade com artefatos auditáveis em cada commit.
