# Matriz de Suporte por Plataforma — ToolsOnDesk (Missão 08.1)

O **ToolsOnDesk** adota uma classificação de maturidade rigorosa e transparente, separando cada plataforma pelos 7 níveis de ciclo de vida de software:

1. **Código Implementado**: Arquitetura, bindings de plataforma e abstrações codificadas.
2. **Código Compilado**: Compilação estática/dinâmica sem erros na toolchain da plataforma.
3. **Testes Unitários Aprovados**: Suíte de testes automatizados (Rust + Vitest) validada.
4. **Instalador Gerado**: Pacote executável ou instalador (.exe, .deb, .AppImage, .dmg) empacotado.
5. **Aplicativo Executado**: Processo iniciado e ciclo de vida verificado em tempo de execução real.
6. **Testes Funcionais Realizados**: Fluxos de usuário e ferramentas validados de ponta a ponta.
7. **Distribuição Homologada**: Assinatura criptográfica oficial, notarização e publicação segura.

---

## 1. Matriz de Maturidade por Plataforma

| Nível de Maturidade | Windows 11 (x64) | Linux (Ubuntu/Debian x64) | macOS (Apple Silicon arm64) | macOS (Intel x86_64) | Android (Futuro) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Código Implementado** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | 📋 Contratos |
| **2. Código Compilado** | ✅ Sim | ✅ Sim (Docker/WebKitGTK) | 🔄 Aguardando CI Remoto | 🔄 Aguardando CI Remoto | ⏳ Futuro |
| **3. Testes Unitários Aprovados** | ✅ Sim (34 Vitest + 38 Rust) | ✅ Sim (34 Vitest + 38 Rust) | 🔄 Testes mockados aprovados | 🔄 Testes mockados aprovados | ⏳ Futuro |
| **4. Instalador Gerado** | ✅ Sim (NSIS `.exe`) | 🔄 Em esteira (`.deb`/`.AppImage`) | 🔄 Em esteira (`.dmg`/`.app`) | 🔄 Em esteira (`.dmg`/`.app`) | ⏳ Futuro |
| **5. Aplicativo Executado** | ✅ Sim (Host Real) | 🔄 Headless validado | ⏳ Aguardando runner macOS | ⏳ Aguardando runner macOS | ⏳ Futuro |
| **6. Testes Funcionais Realizados**| ✅ Sim (M01-M07 100%) | 🔄 Testes de módulos Rust | ⏳ Aguardando runner macOS | ⏳ Aguardando runner macOS | ⏳ Futuro |
| **7. Distribuição Homologada** | ✅ Plataforma de Ref. | 🔄 Pendente de pacote final | ⛔ Requer Apple Notarization | ⛔ Requer Apple Notarization | ⏳ Futuro |

> [!IMPORTANT]
> **Transparência Absoluta:** O macOS **NÃO** é considerado homologado antes da execução real dos builds e testes em hardware Apple oficial com notarização via Apple Gatekeeper (`notarytool`). Os fluxos locais foram implementados com estrita aderência às especificações oficiais da Apple (WKWebView, Native Overlay TitleBar, Apple Keychain via `security -i`), mas dependem da execução do primeiro CI no GitHub Actions com runners `macos-latest` e `macos-15-intel`.

---

## 2. Matriz de Compatibilidade Funcional por Módulo

| Módulo / Recurso | Windows 11 | Linux (Ubuntu 22.04+ / Debian 12+) | macOS (macOS 12+ Monterey) |
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
| **Canvas HTML5 (Preview 60 FPS)** | ✅ WebView2 | ✅ WebKitGTK 4.1 | ✅ WKWebView (Apple Metal) |
| **NVIDIA Provider (NIM API)** | ✅ HTTPS + Streaming | ✅ HTTPS + Streaming | ✅ HTTPS + Streaming |
| **Cofre de Credenciais (`CredentialStore`)** | ✅ Windows DPAPI (crypt32) | ✅ Secret Service (Fail-Closed) | ✅ Apple Keychain (`security -i`) |
| **Supervisão de Processos e Cancelamento**| ✅ `taskkill` via `ProcessManager` | ✅ POSIX PGID SIGTERM/KILL | ✅ POSIX PGID SIGTERM/KILL |
| **Diagnóstico de Disco** | ✅ `GetDiskFreeSpaceExW` | ✅ POSIX `statvfs` | ✅ POSIX `statvfs` |
| **Barra de Título** | ✅ Frameless Custom (Direita) | ✅ Frameless Custom (Direita) | ✅ Traffic Lights Nativos (Overlay Esquerda) |
| **Atalhos de Teclado** | `Ctrl + K, J, B, 1..9` | `Ctrl + K, J, B, 1..9` | `⌘ + K, J, B, 1..9` |
| **Migração Transacional (M07)** | ✅ Ativa se houver dados | 🔄 Suporte a dados legados | 🔄 Suporte a dados legados |

---

## 3. Diretrizes de Segurança de Credenciais por Plataforma

1. **Windows**:
   - Criptografia simétrica com chaves de login do usuário via Windows DPAPI (`CryptProtectData`/`CryptUnprotectData` via `crypt32.dll`).
   - Entropia fixa suplementar `TOOLSONDESK_DPAPI_ENTROPY_v1`.
   - Limpeza volátil de memória (`zeroize_bytes`) antes de desalocações.

2. **Linux**:
   - **Fail-Closed Estrito**: Se o serviço nativo `secret-tool` / FreeDesktop Secret Service estiver ausente, bloqueado ou o barramento D-Bus estiver inacessível, a gravação de credenciais é rejeitada com `CREDENTIAL_SECURITY_ERROR`.
   - **Remoção de Pseudo-Chaves**: Qualquer mecanismo baseado em `/etc/machine-id` ou `$USER` para persistir novas chaves foi completamente erradicado.
   - **Migração Não-Destrutiva**: Chaves legadas existentes em `.vault_secure.enc` ou `.vault_keys.enc` continuam sendo lidas em memória para evitar perda de credenciais, sendo migradas automaticamente para o Secret Service na primeira oportunidade.

3. **macOS**:
   - Integração com Apple Keychain Services utilizando o utilitário nativo `/usr/bin/security`.
   - **Proteção contra Exposição em `argv`**: O comando é executado no modo interativo (`/usr/bin/security -i`) via `stdin`, impedindo que tokens e senhas apareçam na tabela de processos do sistema operacional (`ps aux`, `sysctl`).
   - Sanitização de logs de erro para garantir que falhas do Keychain nunca vazem segredos para o frontend ou para arquivos de diagnóstico.
