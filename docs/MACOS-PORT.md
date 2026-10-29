# Porte Nativo macOS — ToolsOnDesk (Missão 08.1)

O porte nativo do **ToolsOnDesk** para **macOS** oferece suporte para as duas arquiteturas do ecossistema Apple: **Apple Silicon** (`aarch64-apple-darwin`, Macs M1/M2/M3/M4) e **Intel** (`x86_64-apple-darwin`), utilizando o motor nativo **WKWebView** e o cofre de chaves **Apple Keychain Services**.

---

## 1. Arquiteturas e Requisitos de Sistema

- **macOS Mínimo Suportado**: macOS 12 (Monterey) ou superior.
- **Arquitetura Primária**: Apple Silicon (`aarch64` / arm64).
- **Arquitetura Secundária**: Macs Intel (`x86_64`).
- **Motor Webview**: WKWebView (nativo do macOS, sem necessidade de pacotes externos como WebView2 ou WebKitGTK).

---

## 2. Padrões de Diretórios Apple (macOS Guidelines)

O `PathManager` segue rigorosamente as convenções da Apple:

1. **Dados Persistentes**:
   - `~/Library/Application Support/ToolsOnDesk/`
   - Contém: banco de dados SQLite `toolsondesk.db` e diretório de ferramentas `binaries/`.
2. **Caches Temporários**:
   - `~/Library/Caches/ToolsOnDesk/`
3. **Downloads e Exportações**:
   - Downloads: `~/Downloads/ToolsOnDesk/`
   - Documentos exportados: `~/Documents/ToolsOnDesk/Exportados/`

---

## 3. Integração com Apple Keychain Services (`security -i`)

Diferente do Linux e do Windows, o macOS possui um subsistema criptográfico centralizado de alta segurança:

- O `CredentialStore` invoca o utilitário nativo `/usr/bin/security`.
- **Prevenção de Vazamento em Linha de Comando**:
  Em vez de passar `-w <secret>` como argumento direto em `argv` (o que exporia a credencial para `ps aux` ou `/proc`), a aplicação executa o modo interativo:
  ```bash
  /usr/bin/security -i
  ```
  O comando `add-generic-password -a "ToolsOnDesk" -s "<key>" -w "<secret>" -U\n` é injetado via **`stdin` (pipe)**.
- **Limpeza Volátil**: O buffer em memória contendo o comando e a chave é sobrescrito com zeros (`zeroize_bytes`) imediatamente após ser transmitido pelo pipe.
- **Leitura Segura**:
  ```bash
  /usr/bin/security find-generic-password -a ToolsOnDesk -s nvidia_api_key -w
  ```
  O segredo é retornado exclusivamente via `stdout`, sem nunca constar em `argv`.
- A chave é protegida pelo Secure Enclave da Apple nos Macs modernos.

---

## 4. Descoberta de Ferramentas e Homebrew

O `ExternalToolManager` e o `MacOSPlatform` inspecionam automaticamente os locais canônicos de binários no macOS:

- `/opt/homebrew/bin` (Caminho padrão do Homebrew no Apple Silicon).
- `/usr/local/bin` (Caminho padrão do Homebrew em Macs Intel).
- `/opt/local/bin` (MacPorts).
- `/usr/bin` e `/bin`.
- Pacote LibreOffice: `/Applications/LibreOffice.app/Contents/MacOS/soffice`.

O usuário não é obrigado a ter o Homebrew instalado para utilizar as ferramentas essenciais; binários autônomos podem ser alocados diretamente em `~/Library/Application Support/ToolsOnDesk/binaries/`.

---

## 5. Barra de Título Nativa do macOS (Overlay TitleBar)

1. **Traffic Lights Nativos Reais**:
   - No macOS, a janela Tauri é configurada com:
     - `decorations: true`
     - `titleBarStyle: "Overlay"`
     - `hiddenTitle: true`
   - O próprio sistema operacional macOS desenha os controles nativos de janela (*Traffic Lights*) no canto superior esquerdo da barra com física de clique, estados hover/active, animação nativa de minimizar para o Dock e zoom/fullscreen nativo com tecla Option.
   - **Eliminação de Mocks**: Todos os botões simulados em HTML/React (`#FF5F56`, `#FFBD2E`, `#27C93F`) foram **removidos**.
   - **Espaçamento e Drag Region**: A `TitleBar.tsx` reserva um espaçador de 78px com `data-tauri-drag-region` à esquerda no macOS. A logo e o título do ToolsOnDesk iniciam logo após os controles nativos da Apple, permitindo arrasto fluido da janela.
   - Os controles do lado direito (Windows/Linux) continuam sendo exibidos normalmente quando a plataforma não for macOS.

---

## 6. Assinatura de Código e Notarização Apple (Gatekeeper)

Para distribuição pública de executáveis no macOS sem alertas de "desenvolvedor não identificado":

1. **Certificado**: Requer uma credencial de desenvolvedor `Developer ID Application` emitida pela Apple.
2. **Assinatura**: O binário e o `.app` devem ser assinados com `codesign --deep --force --options runtime`.
3. **Notarização**: O arquivo `.dmg` ou `.zip` deve ser submetido à Apple via `xcrun notarytool submit` e carimbado via `xcrun stapler staple`.
4. **Runners GitHub Actions**:
   - Apple Silicon: runner `macos-latest` (`aarch64-apple-darwin`).
   - Intel: runner `macos-15-intel` (`x86_64-apple-darwin`), substituindo o aposentado `macos-13`.
5. **Classificação**: O macOS permanece classificado com status rigoroso de **"Implementado & Pronto para CI"**, sendo promovido a **"Homologado"** somente após a primeira execução bem-sucedida da esteira remota com logs oficiais e validação de notarização.
