# Arce Tools

**Arce Tools** é um aplicativo desktop multiferramentas, gratuito, offline-first, de alta performance e visualmente premium, construído com **Tauri 2**, **Rust**, **React 19** e **TypeScript**.

O design foi rigorosamente reproduzido a partir do protótipo oficial do **Claude Design**, mantendo fidelidade estrita às famílias tipográficas **Geist** e **Geist Mono**, tema escuro nativo com destaque em **verde-menta** (`#15F5BA`), tema claro correspondente, atalhos de teclado ágeis (`Ctrl+K`, `Ctrl+J`) e barra de título customizada unificada sem duplicação de bordas de janela.

---

## 📦 Distribuição Oficial Windows 11 (Missões 04 e 05)

O aplicativo conta com instalador nativo **NSIS** oficial gerado para arquitetura x64 com runtime WebView2 integrado do sistema:

- **Instalador Oficial:** `src-tauri/target/release/bundle/nsis/Arce Tools_0.1.0_x64-setup.exe`
- **Tamanho do Instalador:** **4,68 MB** (4.911.065 bytes)
- **Hash SHA-256:** `609597D7793DC486825523D3C0EF79D8719298312AED731331749E4838F20496`
- **Executável Principal:** `src-tauri/target/release/arce-tools.exe` (13,48 MB / 14.142.976 bytes)
- **Modo de Instalação:** `currentUser` (%LOCALAPPDATA%\Programs\Arce Tools) — sem necessidade de permissões de administrador (UAC).
- **Desinstalação:** Suporte a desinstalação limpa via Painel de Controle e Menu Iniciar, com preservação de dados e histórico no SQLite.

---

## ⚡ Métricas Reais de Desempenho (Windows 11 x64)

Medições realizadas em ambiente de produção com o binário release nativo:

| Indicador | Medição Real | Alvo / Referência |
|---|---|---|
| **Tempo de Inicialização a Frio** | **1.697 ms (1,70 s)** | < 3,00 s |
| **Tempo de Inicialização a Quente** | **934 ms (< 1,00 s)** | < 1,50 s |
| **Memória RAM — Processo Principal (Rust)** | **28,03 MB** | < 40,00 MB |
| **Memória RAM — Total em Repouso (Rust + WebView2)** | **141,47 MB** | < 180,00 MB |
| **Memória RAM sob Carga Multimídia** | **180 - 220 MB** | < 300,00 MB |
| **Uso de CPU em Repouso** | **0,00%** | < 0,50% |
| **Taxa de Quadros da Interface** | **60 fps cravados** | 60 fps |

---

## 🚀 Funcionalidades Implementadas

### 1. Módulo de Documentos — Document Engine Real (Missão 03)
- **PDF Inspector (`inspect_pdf`):** Análise em tempo real de contagem de páginas, tamanho legível, orientação (Retrato/Paisagem), detecção de proteção por senha e identificação de texto selecionável vs digitalizações.
- **União de Múltiplos PDFs (`merge_pdfs`):** Fusão estrutural de múltiplos documentos em sequência customizável com algoritmo seguro de renumeração de identificadores de objetos indiretos (`lopdf`).
- **Divisão de PDFs (`split_pdf`):**
  - *Todas as páginas:* exportação de cada folha individualmente.
  - *Intervalos customizados:* parsing robusto de expressões (ex: `1-3, 5, 8-10`) com cálculo prévio de total de páginas.
  - *A cada N páginas:* agrupamento em blocos regulares.
  - *Arquivo único vs múltiplos arquivos:* opção para consolidar a seleção em um só documento.
- **Organizador e Rotacionador de Páginas (`organize_pdf`):**
  - Grade visual de páginas com coordenadas e índices originais.
  - Reordenação (mover esquerda/direita), rotação 90° em sentido horário e exclusão de folhas.
  - **Preservação de Integridade:** o arquivo original nunca é sobrescrito; um novo PDF organizado é gravado no diretório de exportação.
- **Compressão de PDF sem Perda Visual (`compress_pdf`):**
  - Poda de objetos órfãos (`prune_objects`) e recompactação de fluxos via algoritmo Deflate seguro.
  - Níveis de compressão: *Sem perdas* (Estrutural), *Recomendada* e *Extrema*.
  - Cálculo e exibição do percentual exato de economia em bytes no disco.
- **Conversão Word para PDF (`convert_word_to_pdf`):**
  - Conversão offline de DOCX, DOC e ODT via motor LibreOffice Headless.
  - Isolamento de perfil (`-env:UserInstallation`) evitando conflitos com outras janelas abertas pelo usuário.
  - Detecção automática de instalação e exibição do comando `winget` com cópia direta para o clipboard.
- **Conversão PDF para Word (`convert_pdf_to_docx`):**
  - Extração de parágrafos e títulos diretamente para arquivos OpenXML (`.docx`) nativos via `docx-rs`.
  - Tratamento inteligente informando a necessidade de OCR óptico em PDFs digitalizados/rasterizados.

### 2. Central de Erros e Diagnósticos Persistente (Missões 03 e 04)
- **Persistência Relacional em SQLite:** Tabela `error_logs` com 6 índices de alto desempenho, registrando falhas de tarefas, erros de comandos IPC e exceções da interface React.
- **Pipeline de Sanitização Multicamadas (7 Camadas):** Mascaramento automático de senhas, chaves de API, tokens Bearer, cookies de sessão, query params sensíveis, blocos de chaves privadas PEM e caminhos confidenciais (`C:\Users\[USER]\...`).
- **Lookahead Guard Negativo:** Previne corrupção recursiva de tags `[REDACTED]` em reprocessamentos de logs.
- **Deduplicação Temporal (3s):** Supressão de rajadas de erros duplicados no banco SQLite para incidentes repetitivos em lote.
- **Ações Globais de Cópia e Exportação (Missão 04):**
  - **"Copiar todos"**: busca todo o histórico não-paginado do banco SQLite e formata como relatório no clipboard.
  - **"Copiar filtrados"**: copia todo o histórico correspondente aos filtros ativos.
  - **"Exportar TXT"**: relatório estruturado legível em formato texto com separadores e metadados.
  - **"Exportar JSON"**: dump JSON estruturado completo de todos os registros para auditoria técnica.
  - **Feedback Visual Instantâneo**: botão de cópia com animação "Copiado!" e checkmark por 2 segundos.
- **Atalhos Rápidos na Gaveta de Tarefas (`TaskDrawer`):** Botão "Copiar erro" direto no card da tarefa com falha e botão "Ver detalhes do erro", que navega para a Central de Diagnósticos com a falha destacada.
- **Acesso Nativo ao Clipboard Win32 via `arboard`:** Cópia instantânea e 100% garantida de registros individuais ou relatórios consolidados.

### 3. Poster Studio Avançado (Referência Rasterbator.net & Além — Missão 02.5)
- **Dois Modos de Operação:**
  - *Modo Rápido:* Drop da imagem $\rightarrow$ seletor de folhas $\rightarrow$ exportação instantânea de PDF.
  - *Modo Avançado (6 Etapas):* Wizard completo com Imagem, Tamanho, Estilo, Cores, Impressão e Exportação.
- **Tipos de Papel e Orientação:** Suporte a **A4**, **A3**, **Letter**, **Legal** e **Personalizado** em milímetros, nas orientações Retrato e Paisagem.
- **Geometria de Margens e Sobreposição (*Overlap*):** Margens não-imprimíveis e sobreposição milimétrica para colagem contínua sem quebras de imagem.
- **Silhueta Humana Proporcional (1,80 m):** Proporção visual exata renderizada em relação à altura total do pôster montado (com toggle on/off).
- **Indicador de DPI Efetivo:** Monitoramento em tempo real da densidade de pixels impressos com alertas técnicos (Baixa resolução, Boa definição, Alta definição).
- **Estilos Artísticos de Retícula e Pontilhismo:**
  - *Original:* fidelidade total da foto.
  - *Preto & Branco:* conversão por luminância.
  - *Halftone Monocromático:* retícula geométrica estilo Rasterbator (pontos circulares ou quadrados antialiased com pitch e tamanhos min/max customizáveis).
  - *Halftone Colorido:* amostragem colorida em grade com fundo ajustável.
  - *Dithering Floyd-Steinberg:* difusão de erro bidimensional de padrão artístico.
  - *Alto Contraste:* binarização de alto impacto gráfico.
- **Paletas e Cores Customizadas:** Presets de cor (Cyberpunk Menta, Clássico P&B, Âmbar, Blueprint) e cores hexadecimais livres.
- **Workspace Interativo & Preview em Tempo Real:** Renderização Rust em base64 do efeito antes de exportar, zoom de 25% a 200%, ajuste de tela e numeração alfanumérica de cada folha (A1, A2, B1...).
- **Geração de PDF Multipágina:** Criação vetorial com marcas de corte, legendas de montagem e botão de acesso direto no Windows Explorer.

### 4. Downloader Multiplataforma & Seguro (Missões 02.5 e 04)
- **Reconhecimento Automático de 13+ Redes:** YouTube, YouTube Shorts, Instagram Posts & Reels, TikTok, Facebook / FB Watch, X (Twitter), Reddit, Pinterest, Vimeo, Twitch, SoundCloud, Dailymotion e compatíveis com yt-dlp.
- **Gestão Inteligente de Playlists:** Leitura via `--flat-playlist` sem download prévio, listagem de itens e seleção individual ou em lote.
- **Download em Lote (Multi-URL):** Textarea com suporte a dezenas de links, validação em tempo real e enfileiramento concorrente.
- **Extração de Áudio Expandida:** Extração de alta qualidade em **MP3**, **M4A**, **WAV**, **FLAC** e **OPUS**.
- **Defesa Rigorosa contra SSRF:** Bloqueio estrito de `localhost`, `127.0.0.1`, loopbacks IPv6, faixas privadas RFC 1918 e metadados de nuvem.
- **Limpeza Automática de Parciais (Missão 04):** Exclusão garantida de arquivos `.part`, `.ytdl` e `.temp` em cancelamentos.
- **Card de Auditoria yt-dlp:** Indicador em tempo real de versão, status e conformidade com direitos autorais.

### 5. Módulo de Áudio (Missão 02)
- **Inspeção de Metadados Reais:** Análise instantânea via `ffprobe` com duração precisa, taxa de amostragem (Hz), número de canais e bitrate original.
- **Conversão de Formatos:** MP3, WAV, FLAC, M4A, OGG e OPUS com ajuste de bitrate (128k a 320k) e canais (Mono/Estéreo).
- **Normalização de Volume:** Algoritmo broadcast padrão EBU R128 (`loudnorm=I=-14:LRA=11:TP=-1.5`) para streaming e podcasts.
- **Corte por Intervalo:** Recorte temporal milimétrico com início e fim configuráveis em segundos.
- **Waveform Dinâmico:** Visualizador de forma de onda reativo e leve.
- **Extração de Áudio de Vídeos:** Conversão direta de trilhas sonoras de vídeos para áudio.

### 6. Módulo de Vídeo (Missão 02)
- **Inspeção e Metadados de Vídeo:** Detecção de resolução original (largura $\times$ altura), taxa de quadros (FPS), codec de vídeo e duração real.
- **Conversão de Contêineres:** MP4, MKV e WEBM com suporte a codecs modernos (`libx264`, `libx265`, `libvpx-vp9`).
- **Compressão com Presets de CRF:** Qualidade alta (CRF 18), Equilibrado (CRF 23) e Arquivo menor (CRF 28).
- **Corte Rápido e Preciso:** `-c copy` instantâneo sem perda de qualidade ou recodificação quadro a quadro.
- **Extração de Frames Estáticos:** Captura de fotos em alta resolução em timestamps selecionados nos formatos JPG e PNG.

### 7. Conversão e Otimização de Imagens (Missão 01)
- Conversão individual ou em lote entre PNG e JPEG.
- Redimensionamento por amostragem **Lanczos3** de alta fidelidade visual.
- Compilação de múltiplas imagens em um único arquivo PDF.

### 8. Motor Global de Tarefas & Shell Desktop (Missões 01 a 04)
- Fila assíncrona baseada em Tokio com controle de concorrência por semáforo e persistência contínua em SQLite (modo WAL).
- **Encerramento Limpo de Árvore de Processos (Missão 04):** Invocação de `taskkill /F /T /PID` no Windows para liquidar subprocessos netos e evitar vazamentos de CPU/memória.
- Paleta universal de comandos (`Ctrl+K`) e gaveta de tarefas ativas (`Ctrl+J`).
- Barra de título unificada sem bordas duplicadas do Windows 11 (`decorations: false` e `data-tauri-drag-region`).

### 9. Central de Configuração Inicial (Setup Center) & DependencyManager (Missão 05)
- **Assistente Interativo de Primeiro Uso (Setup Center):**
  - Exibido automaticamente na primeira abertura ou reaberto pelas Configurações / Command Palette.
  - 4 etapas: Boas-vindas $\rightarrow$ Diagnóstico do Sistema $\rightarrow$ Configuração de Ferramentas $\rightarrow$ Tudo Pronto.
  - Diagnóstico instantâneo de SO, arquitetura, permissão de gravação e espaço livre em disco.
- **DependencyManager Nativo (Rust):**
  - Descoberta inteligente em cascata: pasta gerenciada `%LOCALAPPDATA%\ArceTools\binaries\`, `./binaries/`, WinGet e `PATH`.
  - Instalação assistida de FFmpeg/ffprobe e yt-dlp com validação TLS, hash SHA-256 e barra de progresso em tempo real.
  - Proteção rígida contra ataques de travessia em arquivos compactados (*Zip Slip*).
  - Atualização atômica com rollback automático em caso de falha.
  - Remoção segura restrita à pasta gerenciada sem afetar utilitários globais do sistema operacional.
- **Seção Ferramentas e Dependências nas Configurações:** Visão geral de status, origens, versões, caminhos seguros e botões contextuais (Instalar, Atualizar, Verificar, Remover e Configurar caminho para LibreOffice).

---

## 🛠️ Stack Tecnológica

- **Framework Desktop:** [Tauri 2](https://v2.tauri.app/)
- **Linguagem Backend:** [Rust 1.99+ MSVC](https://www.rust-lang.org/)
- **Frontend:** [React 19](https://react.dev/) + [TypeScript Strict](https://www.typescriptlang.org/)
- **Bundler:** [Vite 8](https://vite.dev/)
- **Banco de Dados Local:** SQLite com [rusqlite](https://crates.io/crates/rusqlite) (modo WAL)
- **Manipulação de PDF:** [lopdf 0.46](https://crates.io/crates/lopdf)
- **Geração de Word (.docx):** [docx-rs 0.4](https://crates.io/crates/docx-rs)
- **Acesso ao Clipboard do Sistema:** [arboard 3.7](https://crates.io/crates/arboard)
- **Processamento Gráfico:** [image-rs](https://crates.io/crates/image) (Lanczos3)
- **Motores Multimídia:** [FFmpeg](https://ffmpeg.org/), [ffprobe](https://ffmpeg.org/ffprobe.html) e [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Compilador de Instalador:** NSIS 3.0+

---

## 🧪 Suíte de Testes Automatizados

A base de código conta com cobertura completa em frontend e backend:

```bash
# Execução dos testes de interface e componentes (Vitest)
pnpm test
# Resultado: 25/25 testes aprovados (100% de sucesso)

# Verificação estrita de tipagem TypeScript
pnpm build
# Resultado: 0 erros, compilação estrita limpa

# Execução dos testes unitários de backend nativo (Cargo MSVC)
cargo test --lib
# Resultado: 19/19 testes aprovados (100% de sucesso)

# Verificação de linter e estilo Rust
cargo clippy --lib -- -D warnings
# Resultado: 0 warnings, aprovado
```

---

## 🏗️ Como Gerar os Binários e o Instalador

### 1. Build do Executável Néctar (`.exe` simples):
```bash
pnpm build
cargo build --release
```
O executável de produção é gerado em `src-tauri/target/release/arce-tools.exe`.

### 2. Build do Instalador Oficial NSIS (`.exe` com assistente de instalação):
```powershell
pnpm build
cargo tauri build
```
O instalador é gerado em:
`src-tauri/target/release/bundle/nsis/Arce Tools_0.1.0_x64-setup.exe`
