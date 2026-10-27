# ARCE TOOLS — Próximos Passos (Pós-Missão 03)

Com a **Missão 03 totalmente concluída** (Document Engine completo + Central de Erros e Diagnósticos persistente), este documento estabelece o roteiro para a **Missão 04** e o ciclo de lançamento oficial da versão 1.0.

---

## 1. Conquistas Consolidadas (Missões 01 a 03)

1. **Shell Desktop Premium**: 9 telas completas, design system Geist, modo escuro/claro e controle de janela sem decorações duplicadas.
2. **Poster Studio Avançado**: Paridade matemática com Rasterbator, 6 etapas, silhueta humana de 1,80m, DPI tracking, retícula Halftone mono/color, Floyd-Steinberg e PDF milimétrico.
3. **Mídia e Áudio/Vídeo**: Conversores reais FFmpeg/ffprobe, compressão com CRF, corte preciso de áudio/vídeo e extração de quadros.
4. **Downloader Multiplataforma**: yt-dlp integrado para 13+ plataformas, suporte a playlists e proteção ativa contra SSRF.
5. **Document Engine**: PDF Inspector, união de PDFs com renumeração de identificadores de nós, divisão de PDFs (todos, intervalos, cada N), organizador e rotacionador de páginas sem sobrescrever original, compressão estrutural Deflate com medição real de bytes, conversor Word para PDF via LibreOffice headless com isolamento de perfil e conversor PDF para Word via docx-rs.
6. **Central de Erros e Diagnósticos**: Tabela SQLite `error_logs` indexada, sanitização regex de senhas e caminhos `C:\Users\[USER]\...`, KPIs, filtros, atalho de erro na gaveta de tarefas e cópia em lote nativa via Win32 clipboard (`arboard`).

---

## 2. Roteiro para a Missão 04

### 2.1 OCR Nativo com Tesseract para Digitalizações
- Integrar motor OCR óptico local (ex: Tesseract OCR embutido ou sidecar) para permitir converter PDFs 100% digitalizados/rasterizados em texto editável diretamente no módulo PDF → Word.

### 2.2 Rebranding Definitivo e Identidade Visual
- Aplicação do nome e marca comercial final que será escolhida pelo usuário.
- Geração de ícones de alta resolução (.ico multi-resolução, .png transparentes) para a barra de tarefas do Windows e explorador de arquivos.
- Atualização do identificador do pacote Tauri de `com.mateusarcedev.arcetools` para a identidade final.

### 2.3 Empacotamento do Instalador Windows (NSIS & MSI)
- Configuração do gerador de instaladores Tauri (`tauri build`):
  - Instalador executável NSIS moderno com assistente de instalação em português.
  - Criação de atalhos no Menu Iniciar e na Área de Trabalho.
  - Empacotador com opção de sidecars embutidos (FFmpeg, ffprobe, yt-dlp) para execução 100% standalone sem dependências prévias no sistema do cliente.
  - Suporte a desinstalação limpa no Painel de Controle do Windows.

### 2.4 Teste de Aceitação em Máquinas Limpas
- Validação do instalador em máquina Windows 11 recém-formatada para comprovar inicialização limpa com WebView2 runtime padrão e SQLite embutido.
