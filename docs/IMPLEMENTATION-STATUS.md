# ARCE TOOLS — Status de Implementação

Documento de acompanhamento detalhado de fases, requisitos e conformidade da **Missão 01**.

---

## 1. Resumo Executivo da Missão 01

| Área | Status | Detalhes |
|---|:---:|---|
| **Ambiente Windows 11 Nativo** | Concluído | Rust 1.99.1 (MSVC), VS 2022 Tools, Windows SDK, WebView2 |
| **Fase A — Shell e Interface Desktop** | Concluído | 9 telas fiéis ao Claude Design, navegação, atalhos, temas |
| **Fase B — Motor Global de Tarefas** | Concluído | Tokio mpsc, SQLite WAL, cancelamento real, eventos IPC |
| **Fase C — Poster Studio (Real)** | Concluído | Slicing de folhas, cálculo físico mm/pt, marcas de corte, PDF 1.4 |
| **Fase D — Conversão de Imagens (Real)**| Concluído | PNG/JPEG, resize Lanczos3, qualidade, imagens para PDF |
| **Módulos Preparados (Docs/Audio/Video/DL)**| Concluído | Telas estruturadas, contratos documentados, sem mocks |
| **Testes Automatizados** | Concluído | 7 testes Vitest (frontend) + 3 testes nativos Rust (backend) |

---

## 2. Checklist Detalhado por Fase

### Fase A — Aplicativo Desktop e Interface
- [x] Janela Tauri configurada com identificação Arce Tools e tamanho mínimo (1024x720).
- [x] Ícone oficial Arce Tools configurado em `src-tauri/icons/`.
- [x] Tipografia offline completa: `Geist` e `Geist Mono` servidas de `/public/fonts/`.
- [x] Paleta oficial: Dark mode com fundo escuro (`#0B0F10`), acento verde-menta (`#15F5BA`) e Light mode correspondente.
- [x] Navegação entre todas as 9 seções do protótipo:
  - [x] Início (`/`)
  - [x] Downloads (`/downloads`)
  - [x] Documentos (`/documents`)
  - [x] Áudio (`/audio`)
  - [x] Vídeo (`/video`)
  - [x] Imagens (`/images`)
  - [x] Pôsteres (`/poster`)
  - [x] Histórico (`/history`)
  - [x] Configurações (`/settings`)
- [x] Menu lateral recolhível (Ctrl+B ou botão de toggle).
- [x] Atalhos globais:
  - `Ctrl+K`: Paleta de comandos interativa.
  - `Ctrl+J`: Gaveta de tarefas ativas.
  - `Ctrl+1` a `Ctrl+9`: Troca rápida de telas.
  - `Ctrl+B`: Recolher/expandir sidebar.
  - `Escape`: Fechar modais e gavetas.
- [x] Seletor de temas: Claro, Escuro e Sistema (com persistência em SQLite).
- [x] Drag-and-drop e seletores nativos de arquivo (`tauri-plugin-dialog`).
- [x] Abertura de arquivos gerados e pastas de destino no Windows Explorer (`tauri-plugin-opener`).
- [x] Eliminação de todos os mocks falsos (apenas tarefas e histórico reais).

---

### Fase B — Motor Global de Tarefas (Rust)
- [x] Struct `Task` com ID único (UUID v4), tipo de operação, arquivo de origem, destino, configurações, status, progresso, erro, datas de criação e conclusão.
- [x] Ciclo de vida completo: `Pending`, `Running`, `Completed`, `Failed`, `Canceled`.
- [x] Fila de processamento assíncrona baseada em Tokio com semáforo de concorrência configurável.
- [x] Cancelamento cooperativo com `CancellationToken` individual por tarefa.
- [x] Persistência contínua em SQLite (tabela `tasks` e `history`).
- [x] Recuperação de reinicializações inesperadas (tarefas incompletas marcadas como falhas de interrupção).
- [x] Prevenção de colisões de arquivos no disco (`nome (1).ext`).
- [x] Emissão de eventos em tempo real (`task://created`, `task://progress`, `task://completed`, `task://failed`, `task://canceled`).
- [x] Thread de interface desacoplada do processamento computacional intensivo.

---

### Fase C — Primeira Ferramenta Real: Poster Studio
- [x] Entrada de imagem com drag-and-drop ou diálogo nativo (PNG, JPEG).
- [x] Validação de formatos e leitura de dimensões e resolução originais.
- [x] Configuração de papéis: A4 ($210 \times 297\text{ mm}$), A3 ($297 \times 420\text{ mm}$) e personalizável.
- [x] Orientação: Retrato e Paisagem.
- [x] Ajuste de colunas e cálculo automático de linhas e altura total em centímetros.
- [x] Margens configuráveis em milímetros (padrão 10mm).
- [x] Sobreposição entre folhas (overlap) configurável em milímetros (padrão 5mm).
- [x] Cálculo dinâmico e aviso visual de DPI insuficiente ($\text{DPI} < 150$).
- [x] Grade interativa de pré-visualização das folhas com dimensões finais.
- [x] Modos de cor: Original e Preto e Branco.
- [x] Aviso visual explícito de indisponibilidade para modos futuros (ex.: Pontilhismo / Halftone).
- [x] Motor de geração de PDF multipágina real em conformidade com PDF 1.4:
  - Escrita direta via `CountingWriter` com xref indexado.
  - Desenho vetorial de marcas de corte nos 4 cantos da área útil de cada folha.
  - Numeração clara da página e coordenadas (Folha X de Y - Linha R, Coluna C).
  - Fatiamento JPEG nativo por folha sem carregamento duplicado em memória.

---

### Fase D — Segunda Ferramenta Real: Conversão de Imagens
- [x] Seleção individual ou em lote de imagens (PNG, JPEG).
- [x] Conversão bidirecional PNG $\leftrightarrow$ JPEG.
- [x] Redimensionamento configurável por largura e altura com amostragem Lanczos3.
- [x] Opção para manter proporção de aspecto (aspect ratio).
- [x] Slider de qualidade JPEG (1 a 100).
- [x] Compilação de múltiplas imagens em um único arquivo PDF.
- [x] Destino de salvamento configurável com proteção contra sobrescrita.
- [x] Integração completa ao TaskManager e SQLite com registro no Histórico.

---

### Fase E — Preparação dos Demais Módulos
- [x] Telas de UI com design autêntico:
  - **Downloads**: Entrada de URL, seletor de formato, qualidade e destino.
  - **Documentos**: Conversão PDF $\leftrightarrow$ DOCX, seletor de OCR e formatação.
  - **Áudio**: Conversão MP3/WAV/FLAC/AAC, bitrate e normalização.
  - **Vídeo**: Conversão MP4/MKV/WebM, compressão e recorte temporal.
- [x] Nenhuma simulação fictícia de conclusão. Telas exibem banners transparentes indicando que o motor está preparado para a Missão 02.
- [x] Contratos de integração documentados para ferramentas externas (yt-dlp, FFmpeg, LibreOffice).

---

## 3. Cobertura de Testes

### Testes Frontend (Vitest)
Executados com `pnpm test`:
- `src/tests/navigation.test.ts`:
  - `should have valid 9 registered navigation routes`: Valida integridade e ordem das 9 rotas da aplicação.
  - `should calculate poster dimensions correctly`: Valida matemática do grid e DPI no frontend.
- `src/tests/poster.test.ts`:
  - `should calculate correct poster metrics`: Valida proporções A4, margens e overlap.
- `src/tests/App.test.tsx`:
  - `renders titlebar with brand and title`: Valida renderização da barra nativa e versão.
  - `navigates between screens when clicking sidebar buttons`: Valida navegação entre Início, Pôsteres, Imagens e Configurações.
  - `opens and closes command palette with Ctrl+K`: Valida abertura e fechamento da paleta.
  - `toggles active task drawer`: Valida gaveta de tarefas.

### Testes Backend (Rust Nativo MSVC)
Executados com `cargo test`:
- `test_sqlite_tasks_and_history`:
  - Testa inserção, atualização de status, recuperação de interrupções e integridade de consultas SQLite.
- `test_poster_engine_calculation_and_pdf`:
  - Cria imagem de teste $800 \times 600$, executa cálculo de métricas (folhas, linhas, DPI) e gera arquivo PDF multipágina real em disco, validando assinatura de cabeçalho `%PDF-1.4`, tabela `xref` e trailer `%%EOF`.
- `test_image_engine_conversion`:
  - Valida conversão de imagem PNG para JPEG com redimensionamento Lanczos3, validação de dimensões e verificação do arquivo de saída gerado.
