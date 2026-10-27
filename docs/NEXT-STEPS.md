# ARCE TOOLS — Próximos Passos (Pós-Missão 05)

Com a **Missão 05 totalmente concluída** (Instalação Inteligente, Gerenciamento de Dependências e Experiência de Primeiro Uso com Setup Center), este documento consolida o estado do produto e traça o roteiro para os ciclos subsequentes.

---

## 1. Conquistas Consolidadas (Missões 01 a 05)

1. **Shell Desktop Premium**: 9 telas completas, design system Geist, modo escuro/claro nativo, atalhos de teclado globais (`Ctrl+K`, `Ctrl+J`) e controle de janela sem decorações duplicadas no Windows 11.
2. **Poster Studio Avançado**: Paridade matemática com Rasterbator, 6 etapas, silhueta humana de 1,80 m, DPI tracking, retícula Halftone mono/color, Floyd-Steinberg e PDF milimétrico.
3. **Mídia e Áudio/Vídeo**: Conversores reais FFmpeg/ffprobe, compressão com CRF, corte preciso de áudio/vídeo e extração de quadros.
4. **Downloader Multiplataforma**: yt-dlp integrado para 13+ plataformas, suporte a playlists, defesa estrita contra SSRF e limpeza automática de arquivos residuais (`.part`, `.ytdl`, `.temp`) em caso de cancelamento.
5. **Document Engine**: PDF Inspector, união de PDFs com renumeração de identificadores de nós, divisão de PDFs (todos, intervalos, cada N), organizador e rotacionador de páginas sem sobrescrever original, compressão estrutural Deflate com medição real de bytes, conversor Word para PDF via LibreOffice headless com isolamento de perfil e conversor PDF para Word via docx-rs.
6. **Central de Erros e Diagnósticos**: Tabela SQLite `error_logs` indexada, sanitização multicamadas com lookahead guard negativo, deduplicação temporal de 3 segundos, cópia nativa via Win32 clipboard (`arboard`), busca global não-paginada ("Copiar todos" e "Copiar filtrados"), exportação de relatórios estruturados nos formatos TXT e JSON e feedback visual no botão de cópia.
7. **Robustez de Processos no Windows**: Encerramento forçado de árvore de processos (`taskkill /F /T /PID`) prevenindo subprocessos netos órfãos ao cancelar tarefas.
8. **Distribuição Oficial Windows**: Geração bem-sucedida do instalador nativo NSIS (`Arce Tools_0.1.0_x64-setup.exe`, 4,68 MB) com instalação por usuário (`currentUser`), desinstalação limpa e atalhos de sistema.
9. **Setup Center & DependencyManager**: Assistente interativo de 4 etapas para primeira abertura, diagnóstico instantâneo de SO/disco/permissões, instalação assistida de FFmpeg/yt-dlp com validação de integridade SHA-256 e proteção Zip Slip, e interface completa em Configurações.
10. **Desempenho Comprovado**: Inicialização a frio < 2,9 s, consumo de RAM em repouso de 26 MB (processo principal Rust) e 0,00% de uso de CPU em repouso.

---

## 2. Roteiro Pós-Missão 05

### 2.1 Rebranding Definitivo e Identidade Visual Final
- Aplicação do nome comercial definitivo escolhido pelo proprietário do produto.
- Atualização do identificador do pacote Tauri (atualmente `com.mateusarcedev.arce-tools`).
- Geração do conjunto completo de ícones multi-resolução (`app-icon.ico`, `128x128@2x.png`, `icon.icns` para macOS).
- Atualização de títulos de janelas, strings de metadados e tela Sobre.

### 2.2 Sistema de Atualizações Automáticas (Auto-Updater)
- Configuração do plugin `@tauri-apps/plugin-updater`.
- Geração do par de chaves criptográficas Ed25519 (`tauri signer generate`).
- Assinatura digital do instalador `.exe` e publicação do manifesto `latest.json` em repositório ou CDN segura.
- Verificação silenciosa em segundo plano com notificação visual sutil na barra de status.

### 2.3 Pacote Portátil Opcional (Portable Zip)
- Disponibilização de um arquivo compactado `.zip` contendo:
  - `arce-tools.exe`
  - Subpasta `binaries/` contendo `ffmpeg.exe`, `ffprobe.exe` e `yt-dlp.exe` pré-baixados.
- Direcionado para ambientes corporativos estritos, máquinas isoladas sem internet (*air-gapped*) e pendrives de suporte técnico.

### 2.4 OCR Nativo com Tesseract para Digitalizações
- Integração de motor OCR óptico local (ex: Tesseract OCR embutido ou sidecar) para permitir converter PDFs 100% digitalizados/rasterizados em texto editável diretamente no módulo PDF → Word.

### 2.5 Suporte Multiplataforma (Linux e macOS)
- Pipeline de compilação para Linux (`.deb`, `.AppImage`) utilizando WebKitGTK.
- Pipeline de compilação para macOS (Universal Binary Apple Silicon / Intel) com instalador `.dmg`.
