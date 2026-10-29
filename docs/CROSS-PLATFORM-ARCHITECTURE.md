# Arquitetura Multiplataforma — ToolsOnDesk (Missão 08)

Este documento descreve a arquitetura unificada de suporte nativo a **Windows**, **Linux** e **macOS** do **ToolsOnDesk** (`com.toolsondesk.desktop`), preservando 100% dos recursos legados, a integridade do banco de dados SQLite, o Creative Studio, o cofre de credenciais e a supervisão de subprocessos.

---

## 1. Visão Geral da Arquitetura

O ToolsOnDesk foi projetado segundo o princípio de **núcleo invariante e adaptadores de plataforma finos**. Todas as regras de negócio (orquestração de tarefas, conversão de mídia, estúdio criativo, persistência SQLite e validação de segurança) residem no núcleo compartilhado. A interação com o sistema operacional é intermediada exclusivamente pelo módulo `crate::platform`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend (React 19 + TypeScript)                     │
│  - platform.ts (detecção síncrona de OS e atalhos ⌘ vs Ctrl)           │
│  - TitleBar adaptável (Traffic Lights no macOS, botões Win/Linux)      │
│  - Modais, Canvas 60 FPS, Preview e Telas Unificadas                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC Tauri 2
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Camada de Comandos Tauri 2                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Núcleo Compartilhado ToolsOnDesk                     │
│  - TaskManager (Fila única assíncrona, SQLite WAL)                    │
│  - ExternalToolManager (Supervisão controlada de FFmpeg/yt-dlp)       │
│  - DocumentEngine & PosterStudio (Processamento matemático local)      │
│  - Creative Studio (16 skills, geradores NVIDIA NIM, canvas)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 Camada de Plataforma (src-tauri/platform/)             │
│                                                                        │
│   ├── paths.rs       (PathManager: %LOCALAPPDATA%, XDG, AppSupport)    │
│   ├── credentials.rs (CredentialStore: DPAPI, Keychain, SecretService)│
│   ├── processes.rs   (ProcessManager: CREATE_NO_WINDOW, PGID, SIGTERM) │
│   ├── system.rs      (PlatformSystem: WebView2, WebKitGTK, WKWebView)  │
│   ├── windows.rs     (WinGet, Program Files, Win32 disk space)        │
│   ├── linux.rs       (XDG, Wayland/X11, /usr/bin, Secret Service)      │
│   └── macos.rs       (Homebrew arm64/x64, security CLI, App bundles)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Abstração de Caminhos e Diretórios (`PathManager`)

O `PathManager` elimina qualquer uso de caminhos hardcodados (`C:\...`, `/home/...`).

### Diretórios por Plataforma

| Finalidade | Windows 11 (Referência) | Linux (Ubuntu 22.04+) | macOS (arm64 & x64) |
| :--- | :--- | :--- | :--- |
| **Raiz da Aplicação** | `%LOCALAPPDATA%\ToolsOnDesk\` | `$XDG_DATA_HOME/ToolsOnDesk` (ou `~/.local/share/ToolsOnDesk`) | `~/Library/Application Support/ToolsOnDesk/` |
| **Banco SQLite** | `...\ToolsOnDesk\toolsondesk.db` | `.../ToolsOnDesk/toolsondesk.db` | `.../ToolsOnDesk/toolsondesk.db` |
| **Cofre Seguro** | `...\.vault_dpapi.enc` | `.../.vault_secure.enc` | `.../.vault_secure.enc` |
| **Binários Gerenciados**| `...\ToolsOnDesk\binaries\` | `.../ToolsOnDesk/binaries/` | `.../ToolsOnDesk/binaries/` |
| **Cache Temporário** | `%TEMP%\` | `$XDG_CACHE_HOME/ToolsOnDesk` (ou `~/.cache/ToolsOnDesk`) | `~/Library/Caches/ToolsOnDesk/` |
| **Downloads Padrão** | Diretório `Downloads\ToolsOnDesk` do usuário | Diretório `Downloads/ToolsOnDesk` do usuário | Diretório `Downloads/ToolsOnDesk` do usuário |
| **Exportações Padrão** | Diretório `Documents\ToolsOnDesk\Exportados` | Diretório `Documents/ToolsOnDesk/Exportados` | Diretório `Documents/ToolsOnDesk/Exportados` |

### Regra de Proteção a Dados Legados
A verificação de pastas legadas (`%LOCALAPPDATA%\com.mateusarcedev.arce-tools` e `%LOCALAPPDATA%\ArceTools`) é estritamente condicionada a `#[cfg(target_os = "windows")]`. Em Linux e macOS, a aplicação inicia diretamente na estrutura moderna, evitando verificações desnecessárias ou criação de pastas espúrias.

---

## 3. Cofre de Credenciais Multiplataforma (`CredentialStore`)

O cofre armazena credenciais confidenciais (ex: chave NVIDIA NIM API) com proteção no nível do sistema operacional:

1. **Windows 11**:
   - Mecanismo: **Windows DPAPI** (`CryptProtectData` / `CryptUnprotectData` via `crypt32.dll`).
   - Entropia: `TOOLSONDESK_DPAPI_ENTROPY_v1` associada ao usuário autenticado.
   - Sanitização: buffers em memória são sobrescritos (`zeroize_bytes`) imediatamente após uso.
2. **macOS**:
   - Mecanismo: **Apple Keychain Services** nativo acionado de forma isolada via `/usr/bin/security`.
   - Chave de serviço: `service: ToolsOnDesk, account: ToolsOnDesk`.
   - Persistência criptografada local como fallback atômico em `.vault_secure.enc`.
3. **Linux**:
   - Mecanismo: **FreeDesktop Secret Service API** (`secret-tool` / GNOME Keyring / KWallet via DBus).
   - Fallback seguro: criptografia local baseada em entropia de hardware (Machine ID, usuário, salt criptográfico).
   - Mascaramento: chave mascarada exibida como `nvapi-••••••••1234` na interface, nunca em texto puro.

---

## 4. Gerenciamento de Subprocessos e Ciclo de Vida (`ProcessManager`)

A execução de binários externos (FFmpeg, ffprobe, yt-dlp, LibreOffice) é padronizada:

```rust
// Invocação Headless e Isolamento de Grupo de Processos
pub fn configure_command(cmd: &mut tokio::process::Command) {
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    #[cfg(unix)]
    {
        cmd.process_group(0); // Cria um novo PGID isolado
    }
}
```

### Cancelamento Seguro e Eliminação de Zumbis
- **Windows**: `taskkill /F /T /PID <pid>` seguido de `child.kill().await` elimina toda a árvore de processos filhos criados pelo FFmpeg.
- **Linux e macOS**:
  1. Envia sinal `SIGTERM` para o grupo de processos (`libc::kill(-pgid, libc::SIGTERM)`) permitindo fechamento ordenado de codecs e descritores de arquivo.
  2. Aguarda até 300 ms em polling de 50 ms.
  3. Caso não responda, força término imediato com `libc::kill(-pgid, libc::SIGKILL)`.
  4. Executa `child.wait().await` para recolher o código de saída do processo filho na tabela do kernel POSIX, impedindo acúmulo de processos órfãos (*zombies*).

---

## 5. Diagnóstico de Motores Web e Sistema (`PlatformSystem`)

O ToolsOnDesk reporta com transparência o motor de renderização nativo:

- **Windows**: WebView2 (Evergreen Chromium).
- **Linux**: WebKitGTK 4.1 (`libwebkit2gtk-4.1`).
- **macOS**: WKWebView (Apple WebKit).
- **Espaço em Disco**:
  - Windows: Win32 `GetDiskFreeSpaceExW`.
  - Unix (Linux/macOS): chamada POSIX `libc::statvfs` real, sem estimativas fictícias.
- **Permissão de Escrita**: validação atômica via arquivo temporário com limpeza imediata.

---

## 6. Frontend Adaptável (`platform.ts`)

O frontend detecta síncronamente o sistema operacional para exibir atalhos nativos sem cintilação:

- **macOS**: Exibe atalhos no formato `⌘K`, `⌘J`, `⌘B`, `⌘1..9` e posiciona os controles de janela nativos (*Traffic Lights*: fechar, minimizar, maximizar) à esquerda.
- **Windows e Linux**: Exibe atalhos no formato `Ctrl K`, `Ctrl J`, `Ctrl B`, `Ctrl 1..9` e posiciona botões de controle de janela à direita.
- O handler global de teclado aceita transparentemente tanto `e.ctrlKey` quanto `e.metaKey`.
