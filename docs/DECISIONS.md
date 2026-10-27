# ARCE TOOLS — Registro de Decisões de Arquitetura (ADRs)

Este documento registra as principais decisões de arquitetura de software adotadas no desenvolvimento do **Arce Tools**, suas motivações, alternativas avaliadas e consequências técnicas (Missões 01, 02 e 02.5).

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
  - Cancelamento imediato sem deixar processos `ffmpeg` ou `yt-dlp` executando em segundo plano.
  - Limpeza automática de arquivos parciais em caso de cancelamento ou falha.

---

## ADR 008: Estratégia de Distribuição e Licenciamento das Ferramentas Externas
- **Status**: Aprovado (Missão 02)
- **Contexto**: Analisar o impacto da inclusão do FFmpeg, ffprobe e yt-dlp em relação ao tamanho do instalador, suporte offline, manutenção e conformidade de licenças.
- **Decisão**: Modo Híbrido Inteligente: detecção em caminhos locais, WinGet e PATH. Instalador base leve mantido em ~7 MB com sidecars opcionais validados por SHA-256.

---

## ADR 009: Paridade e Evolução do Poster Studio
- **Status**: Aprovado e Implementado (Missão 02.5)
- **Contexto**: Oferecer fluxo idêntico ou superior ao Rasterbator.net, com velocidade para usuários casuais e profundidade técnica para impressão profissional.
- **Decisão**:
  1. Implementar fluxo duplo: Modo Rápido (3 cliques para exportar) e Modo Avançado (Wizard em 6 etapas).
  2. Implementar motor de retícula nativo em Rust (`apply_artistic_effect`) com antialiasing analítico para círculos e quadrados, dithering Floyd-Steinberg em 2D e amostragem de cor.
  3. Adicionar renderizador de preview streaming em base64 (`render_poster_preview`), permitindo ao usuário visualizar o efeito artístico real gerado pelo algoritmo do backend com zero latência.
  4. Adicionar silhueta humana proporcional de 1,80 m calculada com precisão física em relação à altura total do pôster montado.
  5. Adicionar monitor de DPI efetivo com faixas de recomendação técnica.

---

## ADR 010: Defesa Estrita contra SSRF e Downloader Multiplataforma
- **Status**: Aprovado e Implementado (Missão 02.5)
- **Contexto**: Permitir downloads de mais de uma dúzia de redes sociais e plataformas com yt-dlp sem expor o aplicativo a explorações de Server-Side Request Forgery contra serviços locais ou metadados de nuvem.
- **Decisão**:
  1. Implementar filtro estrito duplo (frontend TypeScript e backend Rust) bloqueando esquemas não-HTTP/HTTPS, `localhost`, `127.0.0.1`, loopbacks IPv6, faixas privadas RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e RFC 3927 (`169.254.*`).
  2. Suporte a playlists via parâmetro `--flat-playlist` do yt-dlp para obter lista rápida de vídeos com seleção individual ou em massa.
  3. Extração expandida de áudio para 5 formatos: MP3, M4A, WAV, FLAC e OPUS.

---

## ADR 011: Frameless Window com TitleBar Customizada Unificada
- **Status**: Aprovado e Implementado (Missão 02.5)
- **Contexto**: No Windows 11, a janela estava exibindo duas barras de título sobrepostas: a barra nativa do sistema operacional e a barra customizada do Arce Tools.
- **Decisão**:
  1. Configurar `"decorations": false` no `tauri.conf.json`.
  2. Adicionar atributo `data-tauri-drag-region` na barra superior customizada.
  3. Vincular botões de minimizar, maximizar/restaurar e fechar diretamente à API `@tauri-apps/api/window` com permissões concedidas em `capabilities/default.json`.
- **Consequências**: Visual 100% limpo, sem redundância estética, com suporte completo a arrastar janela e duplo clique para maximizar.
