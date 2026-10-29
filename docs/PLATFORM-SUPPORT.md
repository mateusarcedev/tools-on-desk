# Matriz de Suporte por Plataforma — ToolsOnDesk (Missão 08)

O **ToolsOnDesk** adota uma classificação de maturidade transparente, distinguindo rigorosamente o status de cada sistema operacional suportado.

---

## 1. Classificação Geral por Plataforma

| Plataforma | Arquitetura | Formato de Distribuição | Status Oficial | Observações e Requisitos |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | x86_64 (64-bit) | Instalador NSIS (`.exe`) | **VALIDADO EM SISTEMA REAL** | Plataforma de referência (Windows 11). Preserva DPAPI, zeroize de memória e migração transacional M07. |
| **Linux** | x86_64 (64-bit) | `.deb` (Debian/Ubuntu) e `.AppImage` | **COMPILADO & TESTADO** | Ubuntu 22.04+ LTS, Debian 12+, Fedora 38+. Usa WebKitGTK 4.1 e XDG Base Directory. Suporta Wayland e X11. |
| **Linux (RPM)** | x86_64 (64-bit) | `.rpm` (Fedora/RHEL/openSUSE) | **INVESTIGADO / DOCUMENTADO** | Suportado via empacotamento com `cargo-generate-rpm` na esteira de CI. |
| **macOS** | arm64 (Apple Silicon) | `.dmg` e `.app` | **IMPLEMENTADO & PRONTO PARA CI** | Suporta macOS 12 (Monterey) ou superior. Utiliza WKWebView nativo e Apple Keychain Services. |
| **macOS** | x86_64 (Intel) | `.dmg` e `.app` | **IMPLEMENTADO & PRONTO PARA CI** | Suporta Macs Intel legados. Requer runner `macos-13` no GitHub Actions para geração do binário x86_64 nativo. |
| **Android** | aarch64 / armv7 | `.apk` / `.aab` | **PREPARAÇÃO ARQUITETURAL** | Contratos de Rust e serviços desacoplados para futuro porte mobile sem refatoração do core. |

---

## 2. Matriz de Compatibilidade Funcional por Módulo

| Módulo / Recurso | Windows 11 | Linux (Ubuntu/Debian) | macOS (Apple Silicon/Intel) |
| :--- | :---: | :---: | :---: |
| **Foundation & Banco SQLite (WAL)** | ✅ 100% Operacional | ✅ 100% Operacional | ✅ 100% Operacional |
| **Fila Centralizada (`TaskManager`)** | ✅ 100% Operacional | ✅ 100% Operacional | ✅ 100% Operacional |
| **Áudio e Vídeo (`MediaEngine`)** | ✅ FFmpeg nativo | ✅ FFmpeg nativo | ✅ FFmpeg nativo |
| **Download Seguro (`DownloadEngine`)** | ✅ yt-dlp + Anti-SSRF | ✅ yt-dlp + Anti-SSRF | ✅ yt-dlp + Anti-SSRF |
| **Documentos PDF (`DocumentEngine`)** | ✅ lopdf nativo | ✅ lopdf nativo | ✅ lopdf nativo |
| **Conversão Word -> PDF** | ✅ LibreOffice headless | ✅ LibreOffice headless | ✅ LibreOffice headless |
| **Poster Studio (Matemática & Halftone)**| ✅ 100% Rust | ✅ 100% Rust | ✅ 100% Rust |
| **Creative Studio (Projetos & Assets)** | ✅ 100% Operacional | ✅ 100% Operacional | ✅ 100% Operacional |
| **Biblioteca de 16 Skills Criativas** | ✅ 100% Integrada | ✅ 100% Integrada | ✅ 100% Integrada |
| **Canvas HTML5 (Preview 60 FPS)** | ✅ WebView2 | ✅ WebKitGTK 4.1 | ✅ WKWebView |
| **NVIDIA Provider (NIM API)** | ✅ HTTPS + Streaming | ✅ HTTPS + Streaming | ✅ HTTPS + Streaming |
| **Cofre Seguro de Credenciais** | ✅ Windows DPAPI | ✅ Secret Service + Salt | ✅ Apple Keychain |
| **Supervisão de Processos e Cancelamento**| ✅ `taskkill` | ✅ POSIX PGID SIGTERM/KILL | ✅ POSIX PGID SIGTERM/KILL |
| **Diagnóstico de Disco** | ✅ `GetDiskFreeSpaceExW` | ✅ POSIX `statvfs` | ✅ POSIX `statvfs` |
| **Atalhos de Teclado** | `Ctrl + K, J, B, 1..9` | `Ctrl + K, J, B, 1..9` | `⌘ + K, J, B, 1..9` |
| **Migração de Dados Legados (M07)** | ✅ Ativa se houver dados | ⛔ Desativada (Nova raiz) | ⛔ Desativada (Nova raiz) |

---

## 3. Guia de Instalação e Execução por Sistema

### Windows
1. Execute o instalador `ToolsOnDesk-Setup-0.1.0.exe`.
2. O assistente instala para o usuário atual em `%LOCALAPPDATA%\ToolsOnDesk\` sem exigir privilégios de administrador.
3. Se houver dados legados do Arce Tools, eles serão migrados automaticamente com backup de segurança.

### Linux (.deb)
```bash
sudo dpkg -i ToolsOnDesk_0.1.0_amd64.deb
sudo apt-get install -f # se faltar alguma dependência do WebKitGTK
toolsondesk
```

### Linux (.AppImage)
```bash
chmod +x ToolsOnDesk_0.1.0_amd64.AppImage
./ToolsOnDesk_0.1.0_amd64.AppImage
```

### macOS (.dmg)
1. Abra o arquivo `ToolsOnDesk_0.1.0_universal.dmg`.
2. Arraste `ToolsOnDesk.app` para a pasta `/Applications`.
3. Na primeira execução, se o aplicativo ainda não estiver assinado com Apple Developer ID corporativo, clique com o botão direito e selecione "Abrir" para aprovar o Gatekeeper.
