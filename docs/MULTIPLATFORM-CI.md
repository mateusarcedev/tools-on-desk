# Infraestrutura de CI/CD Multiplataforma — ToolsOnDesk (Missão 08)

Este documento descreve as esteiras automatizadas do **GitHub Actions** configuradas no repositório para garantir qualidade contínua e geração de artefatos nativos em Windows, Linux e macOS.

---

## 1. Fluxo de CI Contínua (`desktop-ci.yml`)

O workflow `.github/workflows/desktop-ci.yml` é disparado em todo `push` ou `pull_request` direcionado ao branch principal `main`.

### Matriz de Testes da CI

| Job / Runner | Plataforma | Arquitetura | Dependências Instaladas | Tarefas Executadas |
| :--- | :--- | :--- | :--- | :--- |
| `windows-latest` | Windows 11 | x86_64 | Rust MSVC, Node 20, pnpm 9 | `pnpm test` (34 testes Vitest), `pnpm build`, `cargo test` (31 testes MSVC) |
| `ubuntu-22.04` | Linux | x86_64 | `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` | `pnpm test`, `pnpm build`, `cargo test` (31 testes POSIX) |
| `macos-latest` | macOS | aarch64 (Apple Silicon) | Rust stable aarch64, Node 20, pnpm 9 | `pnpm test`, `pnpm build`, `cargo test` |
| `macos-13` | macOS | x86_64 (Intel Mac) | Rust stable x86_64, Node 20, pnpm 9 | `pnpm test`, `pnpm build`, `cargo test` |

---

## 2. Fluxo de Empacotamento de Release (`desktop-build.yml`)

O workflow `.github/workflows/desktop-build.yml` é disparado sob demanda (`workflow_dispatch`) ou na criação de tags de versão (`v*`).

### Matriz de Empacotamento

1. **Windows x86_64**:
   - Alvo Rust: `x86_64-pc-windows-msvc`
   - Empacotador: NSIS (`tauri-bundler`)
   - Artefato: `ToolsOnDesk_0.1.0_x64-setup.exe`
2. **Linux x86_64**:
   - Alvo Rust: `x86_64-unknown-linux-gnu`
   - Empacotador: Debian Bundle & AppImage Bundle
   - Artefatos: `ToolsOnDesk_0.1.0_amd64.deb` e `ToolsOnDesk_0.1.0_amd64.AppImage`
3. **macOS Apple Silicon**:
   - Alvo Rust: `aarch64-apple-darwin`
   - Empacotador: macOS DMG & App Bundle
   - Artefato: `ToolsOnDesk_0.1.0_aarch64.dmg`
4. **macOS Intel**:
   - Alvo Rust: `x86_64-apple-darwin`
   - Empacotador: macOS DMG & App Bundle
   - Artefato: `ToolsOnDesk_0.1.0_x64.dmg`

---

## 3. Manifesto de Auditoria e Hashing SHA-256

Cada build calcula o hash criptográfico SHA-256 de seus respectivos binários e gera um manifesto intermediário `manifest-<platform>-<arch>.json`.

Ao término de todos os jobs da matriz, o job `release-manifest` agrega as informações gerando o `build-manifest.json` com retenção de 30 dias nos artefatos do workflow:

```json
{
  "app": "ToolsOnDesk",
  "identifier": "com.toolsondesk.desktop",
  "version": "0.1.0",
  "generatedAt": "2026-10-29T13:40:00Z",
  "builds": [
    {
      "platform": "windows",
      "arch": "x86_64",
      "target": "x86_64-pc-windows-msvc",
      "files": [
        {
          "name": "ToolsOnDesk_0.1.0_x64-setup.exe",
          "size": 18450123,
          "sha256": "4f9a3c8e..."
        }
      ]
    },
    {
      "platform": "linux",
      "arch": "x86_64",
      "target": "x86_64-unknown-linux-gnu",
      "files": [
        {
          "name": "ToolsOnDesk_0.1.0_amd64.deb",
          "size": 16210400,
          "sha256": "7b1c4e9f..."
        },
        {
          "name": "ToolsOnDesk_0.1.0_amd64.AppImage",
          "size": 75312000,
          "sha256": "3a8d2e1b..."
        }
      ]
    }
  ]
}
```

O upload ocorre estritamente via `actions/upload-artifact@v4`, preservando a política inegociável de não publicação de releases públicas não autorizadas.
