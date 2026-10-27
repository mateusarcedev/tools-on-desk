# ARCE TOOLS — Registro de Decisões de Arquitetura (ADRs)

Este documento registra as principais decisões de arquitetura de software adotadas no desenvolvimento do **Arce Tools**, suas motivações, alternativas avaliadas e consequências técnicas (Missões 01 e 02).

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
- **Contexto**: O Poster Studio requer a divisão precisa de imagens em folhas A4/A3, com margens milimétricas exatas, sobreposição (overlap), marcas de corte vetoriais e paginação.
- **Decisão**: Implementar um escritor nativo de PDF 1.4 em Rust (`poster_engine.rs`) utilizando `CountingWriter` com `BufWriter`.
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
- **Alternativas Consideradas**:
  - *Concatenação de comandos via shell (`cmd.exe /c` ou `powershell`)*: Extremamente vulnerável a injeção de argumentos, dependente de escaping complexo e imprevisível com caminhos contendo espaços e caracteres Unicode.
  - *Supervisão direta com `tokio::process::Command`*: Criação direta de processo sem intermediários de shell, passando argumentos em vetor estruturado, com `CREATE_NO_WINDOW = 0x08000000`, captura de stdout/stderr via pipes assíncronos e encerramento forçado da árvore de processos ao cancelar (`child.kill()`).
- **Decisão**: Adotar a execução supervisionada direta via `ExternalToolManager`.
- **Consequências**:
  - Imunidade a ataques de injeção de comandos de shell.
  - Cancelamento imediato sem deixar processos `ffmpeg` ou `yt-dlp` executando em segundo plano.
  - Limpeza automática de arquivos parciais em caso de cancelamento ou falha.

---

## ADR 008: Estratégia de Distribuição e Licenciamento das Ferramentas Externas
- **Status**: Aprovado (Missão 02)
- **Contexto**: Analisar o impacto da inclusão do FFmpeg, ffprobe e yt-dlp em relação ao tamanho do instalador, suporte offline, manutenção e conformidade de licenças.
- **Análise Comparativa**:

| Critério | Opção A: Embutir no Instalador (Sidecar) | Opção B: Instalação Sob Demanda (Verificada) |
|---|---|---|
| **Tamanho do Instalador** | Aumenta de ~7 MB para ~85 MB (+78 MB). | Mantém instalador ultraleve em ~7 MB. |
| **Funcionamento Offline** | 100% offline desde o primeiro segundo após instalação. | Requer conexão com a internet no primeiro uso de áudio/vídeo/downloads. |
| **Experiência do Usuário** | Imediata, "funciona direto da caixa" (zero atrito). | Exige download adicional e aceite de termos. |
| **Manutenção e Atualizações**| Atualizações de codecs exigem novo release do Arce Tools. | Motores podem ser atualizados dinamicamente sem rebuild do app. |
| **Licenciamento (FFmpeg)** | Se compilado com `--enable-gpl` (como x264/x265), a distribuição conjunta submete a entrega às obrigações da GPL v3 (disponibilização de fontes do conjunto). Se LGPL v2.1+, requer apenas permissão de substituição das bibliotecas dinâmicas. | Como o usuário baixa o binário diretamente do mantenedor oficial (ex.: Gyan/yt-dlp releases), o Arce Tools atua como orquestrador, mantendo sua distribuição autônoma. |

- **Decisão Adotada**:
  - **Modo Híbrido Inteligente**:
    1. O `ExternalToolManager` detecta prioritariamente se as ferramentas já estão presentes no sistema (via WinGet oficial da Microsoft, PATH do Windows ou pasta `binaries/`).
    2. O instalador base é mantido leve (~7 MB).
    3. Para distribuições "Full Offline", disponibiliza-se a opção de pacote com sidecars embutidos.
    4. O download sob demanda sempre valida o hash criptográfico SHA-256 e provém exclusivamente de fontes oficiais fixadas (releases oficiais do GitHub do yt-dlp e builds oficiais do Gyan.dev recomendados pelo projeto FFmpeg).
