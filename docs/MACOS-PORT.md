# Porte Nativo macOS — ToolsOnDesk (Missão 08)

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
   - Contém: banco de dados SQLite `toolsondesk.db`, diretório `binaries/`, e cofre `.vault_secure.enc`.
2. **Caches Temporários**:
   - `~/Library/Caches/ToolsOnDesk/`
3. **Downloads e Exportações**:
   - Downloads: `~/Downloads/ToolsOnDesk/`
   - Documentos exportados: `~/Documents/ToolsOnDesk/Exportados/`

---

## 3. Integração com Apple Keychain Services

Diferente do Linux e do Windows, o macOS possui um subsistema criptográfico centralizado de alta segurança:

- O `CredentialStore` invoca a API nativa do Keychain através do utilitário de segurança `/usr/bin/security`.
- Chaves armazenadas:
  - Serviço: `ToolsOnDesk`
  - Conta: `ToolsOnDesk`
  - Tipo: Senha genérica (Generic Password)
- Comando de Gravação:
  ```bash
  /usr/bin/security add-generic-password -a ToolsOnDesk -s nvidia_api_key -w "<SECRET>" -U
  ```
- Comando de Leitura:
  ```bash
  /usr/bin/security find-generic-password -a ToolsOnDesk -s nvidia_api_key -w
  ```
- A chave é protegida pelo Secure Enclave da Apple nos Macs com Apple Silicon e T2 Security Chip.
- Buffers de memória contendo a chave descriptografada em Rust são sobrescritos com zeros (`zeroize_bytes`) imediatamente após o envio da requisição HTTPS para o NVIDIA NIM.

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

## 5. Adaptações de Interface e Experiência do Usuário (macOS HIG)

1. **Traffic Lights Nativos**:
   - O aplicativo opera no modo frameless (`decorations: false`).
   - No macOS, a `TitleBar` renderiza à esquerda os botões de controle de janela nativos com as cores canônicas da Apple:
     - Fechar: `#FF5F56`
     - Minimizar: `#FFBD2E`
     - Maximizar/Restaurar: `#27C93F`
   - Os controles de janela do lado direito (típicos de Windows e Linux) são ocultados no macOS.
2. **Tipografia de Atalhos**:
   - O modificador principal exibe o caractere Command `⌘` (ex: `⌘K` na busca, `⌘J` na gaveta de tarefas, `⌘B` para recolher menu, `⌘1..9` para navegação direta).
3. **Canvas HTML5 e WebGL**:
   - O WKWebView provê aceleração nativa via Apple Metal, garantindo 60 FPS fluidos no Canvas do Creative Studio e Poster Studio.

---

## 6. Assinatura de Código e Notarização Apple (Gatekeeper)

Para distribuição pública de executáveis no macOS sem alertas de "desenvolvedor não identificado":

1. **Certificado**: Requer uma credencial de desenvolvedor `Developer ID Application` emitida pela Apple.
2. **Assinatura**: O binário e o `.app` devem ser assinados com `codesign --deep --force --options runtime`.
3. **Notarização**: O arquivo `.dmg` ou `.zip` deve ser submetido à Apple via `xcrun notarytool submit` e carimbado via `xcrun stapler staple`.
4. **Estado Atual (Missão 08)**:
   - Os binários e instaladores `.dmg` são gerados nativamente nos runners macOS (`macos-latest` e `macos-13`) no GitHub Actions.
   - Em máquinas locais de teste antes da notarização oficial, o usuário pode aprovar o binário clicando com o botão direito e escolhendo "Abrir" no Finder.
