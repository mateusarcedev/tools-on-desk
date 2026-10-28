# ToolsOnDesk (ex-Arce Tools) — Próximos Passos (Pós-Missão 07)

Com a **Missão 07 totalmente concluída** (ToolsOnDesk: Rebranding completo, migração transacional de identidade e dados, cofre Windows DPAPI e instalador Windows NSIS), este documento consolida o estado do produto e traça o roteiro para os ciclos subsequentes.

> [!NOTE]
> **Registro Histórico:** O aplicativo foi fundado e amadurecido até a Missão 06 sob o nome **Arce Tools**. A partir da **Missão 07**, a identidade foi unificada sob a marca de trabalho **ToolsOnDesk** (`com.toolsondesk.desktop`).

---

## 1. Conquistas Consolidadas (Missões 01 a 07)

1. **Shell Desktop Premium**: 10 telas completas, design system Geist, modo escuro/claro nativo, atalhos de teclado globais (`Ctrl+K`, `Ctrl+J`, `Ctrl+6`) e controle de janela sem decorações duplicadas no Windows 11.
2. **Poster Studio Avançado**: Paridade matemática com Rasterbator, 6 etapas, silhueta humana de 1,80 m, DPI tracking, retícula Halftone mono/color, Floyd-Steinberg e PDF milimétrico.
3. **Mídia e Áudio/Vídeo**: Conversores reais FFmpeg/ffprobe, compressão com CRF, corte preciso de áudio/vídeo e extração de quadros.
4. **Downloader Multiplataforma**: yt-dlp integrado para 13+ plataformas, suporte a playlists, defesa estrita contra SSRF e limpeza automática de arquivos residuais (`.part`, `.ytdl`, `.temp`) em caso de cancelamento.
5. **Document Engine**: PDF Inspector, união de PDFs com renumeração de identificadores de nós, divisão de PDFs (todos, intervalos, cada N), organizador e rotacionador de páginas sem sobrescrever original, compressão estrutural Deflate com medição real de bytes, conversor Word para PDF via LibreOffice headless com isolamento de perfil e conversor PDF para Word via docx-rs.
6. **Central de Erros e Diagnósticos**: Tabela SQLite `error_logs` indexada, sanitização multicamadas com lookahead guard negativo, deduplicação temporal de 3 segundos, cópia nativa via Win32 clipboard (`arboard`), busca global não-paginada ("Copiar todos" e "Copiar filtrados"), exportação de relatórios estruturados nos formatos TXT e JSON e feedback visual no botão de cópia.
7. **Robustez de Processos no Windows**: Encerramento forçado de árvore de processos (`taskkill /F /T /PID`) prevenindo subprocessos netos órfãos ao cancelar tarefas.
8. **Distribuição Oficial Windows**: Geração do instalador nativo NSIS (`ToolsOnDesk_0.1.0_x64-setup.exe`) com instalação por usuário (`currentUser`), desinstalação limpa e atalhos de sistema.
9. **Setup Center & DependencyManager**: Assistente interativo de 4 etapas para primeira abertura, diagnóstico instantâneo de SO/disco/permissões, instalação assistida de FFmpeg/yt-dlp com validação de integridade SHA-256 e proteção Zip Slip, e interface completa em Configurações.
10. **Creative Studio Completo**:
    - Assistente generativo em 3 etapas para briefing sem necessidade de programação.
    - AI Image Studio com 9 estilos artísticos e comparador de propostas lado a lado.
    - Motion Design Studio com Motion Engine: Canvas 60 FPS com timeline scrub e compilador FFmpeg MP4 nativo com interpolações de amortecimento.
    - Exportação de código TSX para Remotion.
    - AI Video Studio com suporte a Modo A (Generativo via nuvem) e Modo B (Composição local de imagens/áudio via FFmpeg).
    - Biblioteca de 16 skills padronizadas com SKILL.md, exportador para disco e orquestrador fallback em Rust para OpenCode.
    - NVIDIA NIM Provider com SecureVault criptográfico, mascaramento automático de credenciais em logs e isolamento de endpoints.
11. **Rebranding e Migração de Dados (Missão 07)**:
    - Identidade `ToolsOnDesk`, executável `toolsondesk.exe`, identificador `com.toolsondesk.desktop`.
    - Camada centralizada `PathManager` em Rust sob `%LOCALAPPDATA%\ToolsOnDesk\`.
    - Máquina de estados de migração transacional em 10 passos com SQLite Online Backup API.
    - Cofre de credenciais atualizado com Windows DPAPI (`crypt32.dll`), entropia e zeroize de buffers em memória.
    - Preservação perpétua de dados legados do usuário e manifesto auditável (`manifest.json`).
    - Modal visual de onboarding no React informando etapas e KPIs da migração.

---

## 2. Roteiro Pós-Missão 07

### 2.1 Registro Marcário no INPI e Domínio Web
- Formalizar busca prévia e protocolo de registro marcário no INPI na Classe NCL(12) 09 (Softwares utilitários e criativos) e Classe 42 (Serviços SaaS).
- Aquisição do domínio corporativo oficial (`toolsondesk.com` ou correspondente nacional).

### 2.2 Certificação Digital de Código (Code Signing)
- Aquisição de certificado de assinatura de código EV (Extended Validation) para Windows Authenticode (DigiCert, Sectigo ou Azure Trusted Signing).
- Integração da assinatura digital no pipeline de build do NSIS para eliminar o alerta SmartScreen do Windows Defender.

### 2.3 Sistema de Atualizações Automáticas (Auto-Updater)
- Configuração do plugin `@tauri-apps/plugin-updater`.
- Geração do par de chaves criptográficas Ed25519 (`tauri signer generate`).
- Assinatura digital do instalador `.exe` e publicação do manifesto `latest.json` em CDN segura.
- Verificação silenciosa em segundo plano com notificação visual sutil.

### 2.4 Pacote Portátil Opcional (Portable Zip)
- Disponibilização de um arquivo compactado `.zip` contendo `toolsondesk.exe` e subpasta `binaries/` contendo `ffmpeg.exe`, `ffprobe.exe` e `yt-dlp.exe` pré-baixados para ambientes corporativos ou máquinas air-gapped.

### 2.5 OCR Nativo com Tesseract para Digitalizações
- Integração de motor OCR óptico local para converter PDFs digitalizados em texto editável no módulo PDF $\rightarrow$ Word.

### 2.6 Expansão Multiplataforma (Linux e macOS)
- Pipeline de compilação para Linux (`.deb`, `.AppImage`) e macOS (`.dmg`).
