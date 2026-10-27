# Arce Tools

**Arce Tools** é um aplicativo desktop multiferramentas, gratuito, offline-first, de alta performance e visualmente premium, construído com **Tauri 2**, **Rust**, **React 19** e **TypeScript**.

O design foi rigorosamente reproduzido a partir do protótipo oficial do **Claude Design**, mantendo fidelidade estrita às famílias tipográficas **Geist** e **Geist Mono**, tema escuro nativo com destaque em **verde-menta** (`#15F5BA`), tema claro correspondente, atalhos de teclado ágeis (`Ctrl+K`, `Ctrl+J`) e barra de título customizada unificada sem duplicação de bordas de janela.

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

### 2. Central de Erros e Diagnósticos Persistente (Missão 03)
- **Persistência Relacional em SQLite:** Tabela `error_logs` com 6 índices de alto desempenho, registrando falhas de tarefas, erros de comandos IPC e exceções da interface React.
- **Sanitização de Dados Privados:** Pipeline de regex que mascara automaticamente senhas, tokens Bearer, chaves de API, credenciais em URLs e caminhos confidenciais de perfil (`C:\Users\[USER]\...`).
- **Interface Completa na Tela Histórico:**
  - Aba secundária dedicada "Erros e Diagnósticos" com indicadores KPI (Total, Críticos, Não Resolvidos, Uso em Disco).
  - Filtros multifatoriais: busca textual, módulo, severidade, período e status de resolução.
  - Cards expansíveis com detalhes técnicos e stack trace monospaçado.
- **Atalhos Rápidos na Gaveta de Tarefas (`TaskDrawer`):**
  - Botão "Copiar erro" direto no card da tarefa com falha.
  - Botão "Ver detalhes do erro", que direciona o usuário à Central de Diagnósticos com a falha correspondente expandida e destacada.
- **Acesso Nativo ao Clipboard Win32 via `arboard`:** Cópia instantânea e 100% garantida de registros individuais ou relatórios consolidados em formato texto legível.
- **Gestão de Retenção:** Seletor de política de retenção nas Configurações (7, 30, 90 dias ou limpeza total) e exportação em formato JSON.
- **Captura Global com React Error Boundary:** Interceptação graciosa de crashes de renderização com botão de recarga da visualização.

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

### 4. Downloader Multiplataforma & Seguro (Missão 02.5)
- **Reconhecimento Automático de 13+ Redes:** YouTube, YouTube Shorts, Instagram Posts & Reels, TikTok, Facebook / FB Watch, X (Twitter), Reddit, Pinterest, Vimeo, Twitch, SoundCloud, Dailymotion e compatíveis com yt-dlp.
- **Gestão Inteligente de Playlists:** Leitura via `--flat-playlist` sem download prévio, listagem de itens e seleção individual ou em lote.
- **Download em Lote (Multi-URL):** Textarea com suporte a dezenas de links, validação em tempo real e enfileiramento concorrente.
- **Extração de Áudio Expandida:** Extração de alta qualidade em **MP3**, **M4A**, **WAV**, **FLAC** e **OPUS**.
- **Defesa Rigorosa contra SSRF:** Bloqueio estrito de `localhost`, `127.0.0.1`, loopbacks IPv6, faixas privadas RFC 1918 (`10.*`, `172.16-31.*`, `192.168.*`) e metadados de nuvem RFC 3927 (`169.254.*`).
- **Card de Auditoria yt-dlp:** Indicador em tempo real de versão, status e conformidade com direitos autorais (sem quebra de DRM).

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

### 8. Motor Global de Tarefas & Shell Desktop
- Fila assíncrona baseada em Tokio com controle de concorrência por semáforo e persistência contínua em SQLite (modo WAL).
- Cancelamento verdadeiro de tarefas que encerra processos externos (`child.kill()`) e remove arquivos parciais corrompidos.
- Paleta universal de comandos (`Ctrl+K`) e gaveta de tarefas ativas (`Ctrl+J`).
- Barra de título unificada sem bordas duplicadas do Windows 11 (`data-tauri-drag-region`).

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
- **Suíte de Testes:** Vitest (Frontend) + Cargo Test (Backend Rust)

---

## 🧪 Executando os Testes

### Testes de Frontend:
```bash
pnpm test
```

### Testes de Backend (Rust MSVC):
```powershell
cargo test
```

### Build do Executável de Produção:
```bash
pnpm build
cargo build --release
```
O executável de produção é gerado em `src-tauri/target/release/arce-tools.exe`.
