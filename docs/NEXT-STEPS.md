# ARCE TOOLS — Planejamento para as Próximas Missões

Este documento orienta os objetivos, contratos e requisitos técnicos para a **Missão 02** e subsequentes do **Arce Tools**.

---

## 1. Módulos Planejados para a Missão 02

### 1.1 Módulo Vídeo & Áudio (FFmpeg / ffprobe)
- **Objetivos**:
  - Conversão entre formatos de áudio (MP3, WAV, FLAC, AAC, OGG).
  - Normalização de volume e ajuste de taxa de bits (bitrate).
  - Conversão de vídeo (MP4, MKV, WebM, AVI).
  - Compressão de vídeo baseada em CRF (Constant Rate Factor) ou tamanho alvo em MB.
  - Recorte temporal sem perda de qualidade (stream copy `-c copy` quando compatível).
  - Extração de áudio a partir de arquivos de vídeo.
- **Estratégia de Empacotamento do FFmpeg**:
  - Binários estáticos do FFmpeg e ffprobe embutidos como **Tauri Sidecars** (`src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`).
  - Execução estruturada via `tauri::process::Command::new_sidecar("ffmpeg")` passando argumentos em vetor de strings, sem interpolação de shell.
  - Parser de progresso em tempo real a partir da saída `stderr` (`progress=continue`, `frame=`, `fps=`, `out_time_ms=`).
  - Cancelamento instantâneo via encerramento do processo-filho do sidecar.
- **Licenciamento**:
  - FFmpeg compilado sob **LGPL v2.1+** (sem flags restritivas GPL como `nonfree` ou `enable-gpl` a menos que explicitado) para distribuição comercial permissiva do binário principal.

---

### 1.2 Módulo Downloads (yt-dlp)
- **Objetivos**:
  - Download de mídias de vídeo e áudio a partir de URLs de plataformas autorizadas.
  - Extração de metadados prévios (título, autor, miniatura, duração, formatos disponíveis) antes de iniciar o download.
  - Seleção de qualidade (Melhor qualidade, 1080p, 720p, 480p, Somente Áudio).
- **Diretrizes Éticas e Legais de Download**:
  - Restrito a conteúdos sob licenças abertas (Creative Commons, Domínio Público) ou permissões do usuário.
  - **Proibido expressamente qualquer mecanismo de bypass de DRM**, quebra de criptografia Widevine/FairPlay ou download de conteúdos protegidos.
  - Atualização dinâmica controlada do binário yt-dlp via verificação de hash SHA-256 e release do GitHub.
- **Integração com TaskManager**:
  - Cada download gera uma `Task` com tipo `MediaDownload`.
  - Leitura das mensagens `--progress-template` do yt-dlp para atualização suave da barra de progresso no `TaskDrawer`.

---

### 1.3 Módulo Documentos (Word $\leftrightarrow$ PDF)
- **Word para PDF (.docx $\to$ .pdf)**:
  - Invocar **LibreOffice headless** (`soffice --headless --convert-to pdf`) se detectado no sistema Windows (verificando chaves de registro em `HKLM\Software\LibreOffice` ou `C:\Program Files\LibreOffice\program\soffice.exe`).
  - Caso não instalado, apresentar instrução amigável ou oferecer download do pacote portátil.
- **PDF para Word (.pdf $\to$ .docx)**:
  - Extração de texto vetorial, fontes, imagens e tabelas estruturadas via crates Rust dedicados (ex.: `pdf-extract` e gerador OOXML).
  - Opção de OCR (Reconhecimento Óptico de Caracteres) via **Tesseract OCR** para documentos digitalizados/escaneados.

---

### 1.4 Evolução do Poster Studio
- Implementação do modo **Pontilhismo / Retícula (Halftone / Dithering)**:
  - Algoritmo Floyd-Steinberg ou Atkinson dithering para impressões em preto e branco com efeito visual artístico.
  - Ajuste de diâmetro de pontos e densidade por folha.
- Pré-visualização 3D simulada de montagem do pôster na parede.

---

## 2. Métricas de Desempenho e Requisitos Não-Funcionais

| Métrica | Meta Missão 01 | Meta Missão 02 |
|---|---|---|
| **Tempo de Inicialização (Cold start)** | < 1.0s | < 1.2s |
| **Consumo de Memória em Repouso** | < 45 MB | < 60 MB |
| **Uso de CPU em Repouso** | 0.0% | 0.0% |
| **Tamanho do Instalador Windows (.msi / .exe)** | < 15 MB | < 65 MB (com FFmpeg embutido) |
| **Taxa de Quadros da UI durante processamento** | 60 fps constantes | 60 fps constantes |
