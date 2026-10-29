# Infraestrutura de CI/CD Multiplataforma — ToolsOnDesk (Missão 08.1)

Este documento descreve as esteiras automatizadas do **GitHub Actions** configuradas no repositório para garantir qualidade contínua e geração de artefatos nativos em Windows, Linux e macOS.

---

## 1. Fluxo de Integração Contínua (`desktop-ci.yml`)

O workflow `.github/workflows/desktop-ci.yml` é disparado em todo `push` ou `pull_request` direcionado ao branch principal `main`.

### Matriz de Testes da CI

| Job / Runner | Plataforma | Arquitetura | Dependências Instaladas | Tarefas Executadas |
| :--- | :--- | :--- | :--- | :--- |
| `windows-latest` | Windows 11 | x86_64 | Rust MSVC, Node 20, pnpm 9 | `pnpm test` (34 testes Vitest), `pnpm build`, `cargo test` (testes MSVC) |
| `ubuntu-22.04` | Linux | x86_64 | `libwebkit2gtk-4.1-dev`, `libsecret-tools`, `libayatana-appindicator3-dev`, `librsvg2-dev` | `pnpm test`, `pnpm build`, `cargo test` (testes POSIX) |
| `macos-latest` | macOS | aarch64 (Apple Silicon) | Rust stable aarch64, Node 20, pnpm 9 | `pnpm test`, `pnpm build`, `cargo test` |
| `macos-15-intel` | macOS | x86_64 (Intel Mac) | Rust stable x86_64, Node 20, pnpm 9 | `pnpm test`, `pnpm build`, `cargo test` |

> [!NOTE]
> **Substituição do Runner macOS Intel:** O runner `macos-13` foi formalmente aposentado pelo GitHub em dezembro de 2025. O workflow foi atualizado para utilizar o runner oficial `macos-15-intel`, garantindo compilação nativa para arquiteturas x86_64 da Apple. O runner `macos-latest` resolve nativamente para hardware Apple Silicon (M-series, ARM64).

---

## 2. Fluxo de Empacotamento de Release (`desktop-build.yml`)

O workflow `.github/workflows/desktop-build.yml` é disparado sob demanda (`workflow_dispatch`) ou em tags de versão (`v*`).

### Matriz de Empacotamento

1. **Windows x86_64**:
   - Runner: `windows-latest`
   - Alvo Rust: `x86_64-pc-windows-msvc`
   - Empacotador: NSIS (`tauri-bundler`)
   - Artefato: `ToolsOnDesk_0.1.0_x64-setup.exe`
2. **Linux x86_64**:
   - Runner: `ubuntu-22.04`
   - Alvo Rust: `x86_64-unknown-linux-gnu`
   - Empacotador: Debian Bundle & AppImage Bundle
   - Artefatos: `ToolsOnDesk_0.1.0_amd64.deb` e `ToolsOnDesk_0.1.0_amd64.AppImage`
3. **macOS Apple Silicon**:
   - Runner: `macos-latest`
   - Alvo Rust: `aarch64-apple-darwin`
   - Empacotador: macOS DMG & App Bundle
   - Artefato: `ToolsOnDesk_0.1.0_aarch64.dmg`
4. **macOS Intel**:
   - Runner: `macos-15-intel`
   - Alvo Rust: `x86_64-apple-darwin`
   - Empacotador: macOS DMG & App Bundle
   - Artefato: `ToolsOnDesk_0.1.0_x64.dmg`

---

## 3. Política de Segurança de Artefatos e Não-Publicação Não Autorizada

1. **Retenção de Artefatos Internos**: Todos os instaladores gerados são enviados exclusivamente para armazenamento interno do GitHub Actions via `actions/upload-artifact@v4` com retenção temporária de 30 dias.
2. **Zero Publicação Prematura**: O workflow **NÃO** executa `gh release create`, `softprops/action-gh-release` ou publicação em registros públicos. Nenhuma tag gerará binários distribuíveis para o público sem assinatura de código e homologação prévia.
3. **Validação de CI Remoto**: A equipe mantém a integridade de relatórios afirmando a execução de CI apenas após o primeiro envio real e obtenção dos logs oficiais de execução dos runners no GitHub.

---

## 4. Manifesto de Auditoria e Hashing SHA-256

Cada build calcula o hash criptográfico SHA-256 de seus respectivos binários e gera um manifesto intermediário `manifest-<platform>-<arch>.json`.

Ao término de todos os jobs da matriz, o job `release-manifest` agrega as informações gerando o `build-manifest.json` com retenção de 30 dias nos artefatos do workflow.
