# Artefatos de Compilação — ToolsOnDesk (Missão 08)

Este documento especifica os artefatos de entrega gerados pelo processo de compilação em cada plataforma suportada.

---

## 1. Tabela de Artefatos Gerados

| Arquivo de Saída | Plataforma | Tipo de Pacote | Diretório Padrão de Saída |
| :--- | :--- | :--- | :--- |
| `ToolsOnDesk_0.1.0_x64-setup.exe` | Windows 11 / 10 | Instalador NSIS autônomo | `src-tauri/target/release/bundle/nsis/` |
| `ToolsOnDesk_0.1.0_amd64.deb` | Linux (Debian/Ubuntu) | Pacote nativo `.deb` | `src-tauri/target/release/bundle/deb/` |
| `ToolsOnDesk_0.1.0_amd64.AppImage` | Linux (Universal) | Executável portável AppImage | `src-tauri/target/release/bundle/appimage/` |
| `ToolsOnDesk_0.1.0_aarch64.dmg` | macOS (Apple Silicon) | Imagem de disco instalável | `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/` |
| `ToolsOnDesk.app` (arm64) | macOS (Apple Silicon) | App Bundle macOS | `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/` |
| `ToolsOnDesk_0.1.0_x64.dmg` | macOS (Intel) | Imagem de disco instalável | `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/` |
| `ToolsOnDesk.app` (x64) | macOS (Intel) | App Bundle macOS | `src-tauri/target/x86_64-apple-darwin/release/bundle/macos/` |
| `build-manifest.json` | Todas | Manifesto unificado de release | `release-manifest/` |

---

## 2. Padrões de Verificação de Integridade

Cada binário possui um arquivo correspondente `.sha256` contendo o checksum criptográfico no formato canônico GNU:

```
<hash-sha256-hexadecimal>  <nome-do-arquivo>
```

### Como Verificar Localmente:
- **Linux**:
  ```bash
  sha256sum -c ToolsOnDesk_0.1.0_amd64.deb.sha256
  ```
- **macOS**:
  ```bash
  shasum -a 256 -c ToolsOnDesk_0.1.0_aarch64.dmg.sha256
  ```
- **Windows (PowerShell)**:
  ```powershell
  (Get-FileHash -Algorithm SHA256 .\ToolsOnDesk_0.1.0_x64-setup.exe).Hash
  ```

---

## 3. Investigação de Pacotes RPM para Linux

O Tauri 2 não gera pacotes `.rpm` nativamente no empacotador embutido. No entanto, foi investigada e validada a integração com `cargo-generate-rpm`:

```bash
cargo install cargo-generate-rpm
cargo generate-rpm --payload target/release/toolsondesk
```

Essa integração é opcional e documentada para distribuições da família Red Hat / Fedora / openSUSE.
