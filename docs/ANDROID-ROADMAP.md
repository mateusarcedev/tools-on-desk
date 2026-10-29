# Roteiro e Preparação Arquitetural para Android — ToolsOnDesk (Missão 08)

Este documento estabelece as diretrizes arquiteturais e os contratos preparados na **Missão 08** para viabilizar a futura versão móvel do **ToolsOnDesk** no ecossistema Android, sem necessidade de reescrever o núcleo da aplicação.

> [!IMPORTANT]
> **Escopo da Missão 08:** Nenhum APK ou projeto Android separado foi criado nesta missão. O objetivo exclusivo desta etapa foi **blindar a arquitetura**, isolando contratos de plataforma para que o Rust core e o frontend React sejam 100% reutilizáveis quando o Tauri Mobile for ativado.

---

## 1. Desacoplamento do Núcleo Compartilhado

Com a introdução da camada `crate::platform`, o núcleo da aplicação (`domain/`, `storage/`, `engines/`) não possui mais nenhuma chamada direta a `std::os::windows` ou binários exclusivos de desktop.

```
┌─────────────────────────────────────────────────────────────┐
│             Frontend React 19 (Design System)               │
│  - Breakpoints responsivos para telas móveis                │
│  - Adaptação de atalhos de teclado para toques/gestos       │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC Tauri Mobile
┌──────────────────────────────▼──────────────────────────────┐
│           Núcleo Rust Unificado (Invariante)                │
│  - Storage SQLite (WAL, transações, integridade)            │
│  - PosterStudio (Fatiamento matemático e halftone)          │
│  - Creative Studio (Templates JSON, assets, skills)         │
│  - Orquestração de tarefas e histórico                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Contratos Abstratos
┌──────────────────────────────▼──────────────────────────────┐
│                Camada de Plataforma (Futura)                │
│  ├── Android Keystore (via JNI para credenciais)            │
│  ├── Scoped Storage / Storage Access Framework (SAF)        │
│  └── Mobile FFmpeg (biblioteca C compartilhada .so)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Desafios Específicos do Android e Estratégias Definidas

### 2.1 Subprocessos vs Bibliotecas Compartilhadas (SELinux e W^X)
- **Cenário Desktop**: O ToolsOnDesk invoca executáveis externos (`ffmpeg.exe`, `yt-dlp`).
- **Restrição Android**: A partir do Android 10 (API 29), a política de segurança SELinux e as proteções W^X (*Write XOR Execute*) impedem que aplicativos executem binários soltos a partir de seus diretórios de dados.
- **Solução Preparada**:
  - Para o porte mobile, o motor multimídia utilizará bindings JNI/C diretos de FFmpeg compilados como bibliotecas nativas `.so` (`libffmpeg.so`, `libavcodec.so`) embutidas no pacote APK, em vez de comandos de console.
  - O `ProcessManager` já abstrai a execução, permitindo chaveamento transparente para um engine embutido sob `#[cfg(target_os = "android")]`.

### 2.2 Sistema de Arquivos e Scoped Storage
- **Desktop**: Caminhos diretos em `%LOCALAPPDATA%`, `~/.local/share` ou `Application Support`.
- **Android**:
  - Raiz do App: `context.getFilesDir()` (armazenamento privado interno do aplicativo).
  - Exportação e Acesso a Mídia: Uso do *Storage Access Framework* (SAF) ou *MediaStore API* com permissões granulares (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`).
  - O `PathManager` já encapsula a obtenção de diretórios via `AppHandle::path()`, compatível com a API móvel do Tauri 2.

### 2.3 Cofre de Credenciais no Android
- **Mecanismo Planejado**: **Android Keystore** combinado com `EncryptedSharedPreferences` (da biblioteca Jetpack Security).
- A interface `CredentialStore::store_secret`, `get_secret` e `delete_secret` já foi desenhada sem acoplamento ao DPAPI ou Keychain, bastando plugar a implementação JNI do Keystore.

### 2.4 Responsividade da Interface
- O Design System do ToolsOnDesk (`mateusarcedev Design System`) foi projetado com componentes flexíveis (Flexbox/Grid).
- A barra lateral recolhível (`Sidebar`) foi estruturada para colapsar automaticamente em modo gaveta (*Drawer*) com sobreposição em resoluções inferiores a 768px.

---

## 3. Checklist para o Futuro Porte Mobile

1. Instalar o Android NDK r25+ e o Android SDK Command-line Tools.
2. Executar `tauri android init` para gerar o wrapper Gradle oficial do Tauri 2.
3. Implementar o módulo `src-tauri/src/platform/android.rs`.
4. Compilar FFmpeg como biblioteca `.so` estática para `aarch64-linux-android` e `armv7-linux-androideabi`.
5. Ajustar o manifesto `AndroidManifest.xml` com as permissões de rede e mídia.
6. Testar no emulador Android e em dispositivo físico real.
