# ARCE TOOLS — Registro de Decisões de Arquitetura (ADRs)

Este documento registra as principais decisões de arquitetura de software adotadas no desenvolvimento do **Arce Tools**, suas motivações, alternativas avaliadas e consequências técnicas.

---

## ADR 001: Adoção do Tauri 2 em vez de Electron

- **Status**: Aprovado e Implementado
- **Contexto**: A missão exige um aplicativo multiferramentas desktop offline-first, extremamente leve, com inicialização instantânea, baixo consumo de memória em repouso e sem o peso de navegadores embutidos completos.
- **Alternativas Consideradas**:
  - *Electron*: Possui ecossistema maduro, mas empacota uma instância inteira do Chromium e Node.js por aplicativo, resultando em binários de 150MB+ e consumo de memória em repouso de 200MB a 400MB.
  - *Tauri 2*: Utiliza a WebView nativa do sistema operacional (WebView2 no Windows 11, WebKit no macOS/Linux) e backend nativo em Rust. Binário final enxuto (< 25MB), consumo em repouso de ~35MB e segurança por isolamento de processo.
- **Decisão**: Adotar **Tauri 2** com backend Rust e frontend React 19 + Vite.
- **Consequências**:
  - Alto desempenho nativo e overhead mínimo de memória.
  - Tipagem forte ponta a ponta entre Rust e TypeScript.
  - Necessidade do WebView2 Runtime no Windows (já pré-instalado por padrão em 100% dos computadores Windows 11).

---

## ADR 002: Build Nativo Windows com Toolchain MSVC

- **Status**: Aprovado e Implementado
- **Contexto**: O projeto roda em ambiente Windows 11 com interoperação WSL2. O Tauri 2 no Windows depende do WebView2 e das APIs Win32/COM, que exigem a ABI MSVC oficial (`x86_64-pc-windows-msvc`).
- **Alternativas Consideradas**:
  - *Cross-compilation a partir do Linux/WSL2*: Exige toolchain MinGW ou Wine, que frequentemente falha ao vincular com `webview2-com-sys` e SDKs C++ modernos da Microsoft.
  - *Build Nativo Windows com MSVC e Visual Studio 2022 C++ Build Tools*: Compilação direta utilizando o compilador da Microsoft e Rust stable MSVC.
- **Decisão**: Utilizar a toolchain nativa Windows `x86_64-pc-windows-msvc`, invocada diretamente via PowerShell host com redirecionamento de diretório temporário local (`CARGO_TARGET_DIR` em SSD NTFS local).
- **Consequências**:
  - Compatibilidade absoluta com WebView2 e APIs do Windows 11.
  - Prevenção do problema de lock de arquivo do SMB/9P do WSL2 ao usar diretório de compilação em disco local Windows.

---

## ADR 003: SQLite Embutido com `rusqlite` (bundled)

- **Status**: Aprovado e Implementado
- **Contexto**: O gerenciamento de tarefas e o histórico demandam persistência ACID confiável, recuperação de falhas de energia ou encerramento inesperado, e buscas rápidas sem introduzir um serviço externo de banco de dados.
- **Alternativas Consideradas**:
  - *Arquivos JSON no disco*: Suscetíveis a corrupção durante gravações interrompidas, sem suporte a transações ou concorrência segura.
  - *SQLite via rusqlite com recurso `bundled`*: Compila o SQLite diretamente em código de máquina estático dentro do binário Rust, sem exigir nenhuma DLL instalada no sistema.
- **Decisão**: Adotar **SQLite com rusqlite (bundled)**, configurado em modo WAL (`journal_mode=WAL`).
- **Consequências**:
  - Operações de leitura e escrita simultâneas sem bloqueio mútuo.
  - Zero dependências de instalação para o usuário final.
  - Recuperação consistente de estado no startup do aplicativo.

---

## ADR 004: Gerador Próprio de PDF 1.4 em Rust para o Poster Studio

- **Status**: Aprovado e Implementado
- **Contexto**: O Poster Studio requer a divisão precisa de imagens em folhas A4/A3, com margens milimétricas exatas, sobreposição (overlap), marcas de corte vetoriais e paginação.
- **Alternativas Consideradas**:
  - *Bibliotecas C/C++ pesadas (ex.: Poppler, Cairo)*: Difíceis de compilar estaticamente no Windows, aumentam o binário em dezenas de megabytes e trazem complexidade de licenças.
  - *Canvas HTML para PDF no frontend*: Impreciso quanto a métricas físicas de impressão, com alto consumo de memória na WebView e limitações de resolução de saída.
  - *Escritor Nativo PDF 1.4 em Rust Puro*: Implementação leve usando a especificação padrão ISO 32000-1 / PDF 1.4, emitindo streams de imagem JPEG comprimidos, dicionários de página e objetos gráficos vetoriais.
- **Decisão**: Implementar um escritor nativo de PDF 1.4 em Rust (`src-tauri/src/engines/poster_engine.rs`) utilizando `CountingWriter` com `BufWriter`.
- **Consequências**:
  - Precisão milimétrica garantida ($1\text{ mm} = 2.834645669\text{ pt}$).
  - Geração de PDFs multipágina de centenas de megabytes em fração de segundos.
  - Código enxuto, auditável e sem dependências binárias externas.

---

## ADR 005: Recursos e Tipografia 100% Offline

- **Status**: Aprovado e Implementado
- **Contexto**: O design aprovado especifica estritamente as famílias tipográficas **Geist** e **Geist Mono**, paleta com verde-menta e tema escuro. O aplicativo é offline-first e não pode depender de CDNs ou chamadas de rede externas para renderização visual.
- **Alternativas Consideradas**:
  - *Google Fonts CDN*: Falha em ambientes sem conexão à internet e adiciona latência na abertura da janela.
  - *Fontes do Sistema Operacional (fallback genérico)*: Desfigura o design aprovado, alterando métricas de espaçamento e hierarquia.
  - *Fontes WOFF2 embarcadas no pacote*: Arquivos WOFF2 originais extraídos do protótipo e servidos localmente via `@font-face` em `/public/fonts/`.
- **Decisão**: Empacotar localmente os arquivos `Geist.woff2` e `GeistMono.woff2` diretamente no bundle da aplicação.
- **Consequências**:
  - Renderização idêntica ao Claude Design em qualquer máquina, com ou sem internet.
  - Respeito integral às regras visuais obrigatórias do projeto.

---

## ADR 006: Gerenciador de Fila Assíncrona com Tokens de Cancelamento

- **Status**: Aprovado e Implementado
- **Contexto**: Operações de conversão de imagem e fatiamento de pôsteres consomem ciclos de CPU e I/O de disco. A interface do usuário não pode travar ou congelar durante o processamento, e o usuário deve ter o poder de cancelar tarefas em andamento.
- **Alternativas Consideradas**:
  - *Processamento síncrono na thread de comandos do Tauri*: Travaria a UI em operações com imagens grandes.
  - *Spawn descontrolado de threads*: Poderia saturar todos os núcleos da CPU e esgotar a memória RAM em operações em lote.
  - *Fila de Tarefas com Tokio Semaphore e CancellationToken*: Enfileiramento de jobs com limite estrito de concorrência simultânea e suporte a interrupção graciosa.
- **Decisão**: Implementar o `TaskManager` com canal `mpsc`, `Arc<Semaphore>` configurável e mapa de `CancellationToken`.
- **Consequências**:
  - Responsividade permanente da janela (60fps constantes).
  - Cancelamento real de operações que interrompe a escrita no disco.
  - Controle de recursos de hardware configurável pelo usuário nas preferências.
